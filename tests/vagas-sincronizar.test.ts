import { execSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { HABILIDADES } from "@/lib/dados/habilidades";
import { sincronizarVagas } from "@/lib/vagas/sincronizar";
import type { FonteExterna, VagaExterna } from "@/lib/vagas/tipos";

// Usa um banco temporário, separado do banco de desenvolvimento.
const pasta = path.resolve(__dirname, ".tmp");
const url = `file:${path.join(pasta, "sync.db")}`;
let db: PrismaClient;

const vaga = (id: string, titulo: string, descricao = "Python e SQL"): VagaExterna => ({
  origem: "falsa",
  idExterno: id,
  titulo,
  empresa: "Acme",
  cidade: "Recife",
  descricao,
  link: `https://exemplo.com/${id}`,
  publicadaEm: null,
});

const fonte = (vagas: () => VagaExterna[] | Promise<VagaExterna[]>, extra: Partial<FonteExterna> = {}): FonteExterna => ({
  origem: "falsa",
  rotulo: "Fonte falsa",
  indisponivel: () => null,
  buscar: async () => vagas(),
  ...extra,
});

beforeAll(async () => {
  rmSync(pasta, { recursive: true, force: true });
  mkdirSync(pasta, { recursive: true });
  execSync("npx prisma db push --skip-generate", {
    env: { ...process.env, DATABASE_URL: url },
    stdio: "pipe",
  });
  db = new PrismaClient({ datasources: { db: { url } } });
  for (const h of HABILIDADES) {
    await db.habilidade.create({ data: { slug: h.slug, nome: h.nome, area: h.area, sinonimos: h.sinonimos.join(",") } });
  }
}, 120_000);

afterAll(async () => {
  await db?.$disconnect();
  rmSync(pasta, { recursive: true, force: true });
});

describe("sincronizarVagas", () => {
  it("salva as vagas para iniciantes e descarta as outras", async () => {
    const [r] = await sincronizarVagas(db, [
      fonte(() => [vaga("1", "Estágio em Dados"), vaga("2", "Desenvolvedor Sênior"), vaga("3", "Dev Python Júnior")]),
    ]);
    expect(r).toMatchObject({ situacao: "ok", recebidas: 3, salvas: 2, descartadas: 1 });

    const salvas = await db.vaga.findMany({ where: { origem: "falsa" }, include: { requisitos: true }, orderBy: { idExterno: "asc" } });
    expect(salvas.map((v) => v.idExterno)).toEqual(["1", "3"]);
    expect(salvas[0].requisitos.length).toBeGreaterThan(0);
  });

  it("rodar de novo atualiza em vez de duplicar", async () => {
    await sincronizarVagas(db, [fonte(() => [vaga("1", "Estágio em Dados", "Somente Linux"), vaga("3", "Dev Python Júnior")])]);
    expect(await db.vaga.count({ where: { origem: "falsa" } })).toBe(2);

    const v = await db.vaga.findFirstOrThrow({
      where: { origem: "falsa", idExterno: "1" },
      include: { requisitos: { include: { habilidade: true } } },
    });
    expect(v.requisitos.map((r) => r.habilidade.slug)).toEqual(["linux"]); // requisitos antigos foram trocados
  });

  it("remove vagas que saíram do ar, mas só da própria fonte", async () => {
    await db.vaga.create({
      data: { titulo: "Exemplo", empresa: "X", cidade: "Y", modalidade: "remoto", tipo: "estagio", area: "Z", descricao: "d", origem: "exemplo" },
    });
    await sincronizarVagas(db, [fonte(() => [vaga("3", "Dev Python Júnior")])]);

    expect((await db.vaga.findMany({ where: { origem: "falsa" } })).map((v) => v.idExterno)).toEqual(["3"]);
    expect(await db.vaga.count({ where: { origem: "exemplo" } })).toBe(1);
  });

  it("não apaga nada quando a fonte volta vazia", async () => {
    const [r] = await sincronizarVagas(db, [fonte(() => [])]);
    expect(r).toMatchObject({ situacao: "ok", salvas: 0 });
    expect(await db.vaga.count({ where: { origem: "falsa" } })).toBe(1);
  });

  it("não salva de novo a vaga (mesmo cargo e empresa) que uma fonte anterior já trouxe", async () => {
    const daFonte = (origem: string, rotulo: string, vagas: VagaExterna[]): FonteExterna => ({
      origem,
      rotulo,
      indisponivel: () => null,
      buscar: async () => vagas,
    });
    const v = (origem: string, id: string, titulo: string, empresa: string): VagaExterna => ({
      ...vaga(id, titulo, "Python e SQL"),
      origem,
      empresa,
    });

    const [primeira, segunda] = await sincronizarVagas(db, [
      daFonte("primeira", "Primeira", [v("primeira", "a1", "Estágio em Dados", "Beta S.A."), v("primeira", "a2", "Dev Python Júnior", "Gama")]),
      daFonte("segunda", "Segunda", [
        v("segunda", "b1", "ESTÁGIO EM DADOS", "Beta S.A."), // repetida (acentos e maiúsculas não importam)
        v("segunda", "b2", "Dev Python Júnior", "Outra Empresa"), // mesmo cargo, empresa diferente: é outra vaga
      ]),
    ]);

    expect(primeira).toMatchObject({ salvas: 2, repetidas: 0 });
    expect(segunda).toMatchObject({ salvas: 1, repetidas: 1 });
    expect((await db.vaga.findMany({ where: { origem: "segunda" } })).map((x) => x.idExterno)).toEqual(["b2"]);

    // Rodar de novo não faz a primeira fonte perder a vaga para a segunda.
    await sincronizarVagas(db, [
      daFonte("primeira", "Primeira", [v("primeira", "a1", "Estágio em Dados", "Beta S.A."), v("primeira", "a2", "Dev Python Júnior", "Gama")]),
      daFonte("segunda", "Segunda", [v("segunda", "b1", "ESTÁGIO EM DADOS", "Beta S.A."), v("segunda", "b2", "Dev Python Júnior", "Outra Empresa")]),
    ]);
    expect(await db.vaga.count({ where: { origem: "primeira" } })).toBe(2);
    expect(await db.vaga.count({ where: { origem: "segunda" } })).toBe(1);
  });

  it("grava o salário (inclusive o lido do texto) e o remove se o anúncio deixar de informar", async () => {
    const comBolsa = (descricao: string, extra: Partial<VagaExterna> = {}) => ({ ...vaga("sal1", "Desenvolvedor Python Júnior", descricao), ...extra });
    await sincronizarVagas(db, [fonte(() => [comBolsa("Python. Bolsa auxílio: R$ 1.500,00 no primeiro ano.R$ 1.900,00 no segundo ano.Vale")])]);
    let v = await db.vaga.findFirstOrThrow({ where: { origem: "falsa", idExterno: "sal1" } });
    expect(v).toMatchObject({ salarioMin: 1500, salarioMax: 1900, salarioOrigem: "texto" });

    await sincronizarVagas(db, [fonte(() => [comBolsa("Python", { salario: { min: 2000.4, max: null, origem: "fonte" } })])]);
    v = await db.vaga.findFirstOrThrow({ where: { origem: "falsa", idExterno: "sal1" } });
    expect(v).toMatchObject({ salarioMin: 2000, salarioMax: null, salarioOrigem: "fonte" });

    await sincronizarVagas(db, [fonte(() => [comBolsa("Python, bolsa a combinar")])]);
    v = await db.vaga.findFirstOrThrow({ where: { origem: "falsa", idExterno: "sal1" } });
    expect(v).toMatchObject({ salarioMin: null, salarioMax: null, salarioOrigem: "" });
  });

  it("pula fonte indisponível e registra erro sem derrubar as outras", async () => {
    const resultados = await sincronizarVagas(db, [
      fonte(() => [], { rotulo: "Sem chave", indisponivel: () => "defina a chave" }),
      fonte(() => Promise.reject(new Error("HTTP 500")), { rotulo: "Quebrada" }),
      fonte(() => [vaga("9", "Estágio em TI")], { rotulo: "Boa" }),
    ]);
    expect(resultados.map((r) => [r.rotulo, r.situacao])).toEqual([
      ["Sem chave", "pulada"],
      ["Quebrada", "erro"],
      ["Boa", "ok"],
    ]);
    expect(resultados[1].detalhe).toBe("HTTP 500");
    expect(await db.vaga.count({ where: { origem: "falsa", idExterno: "9" } })).toBe(1);
  });
});
