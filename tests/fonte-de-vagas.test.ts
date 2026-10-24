import { execSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { criarFonteDeVagas } from "@/lib/fonte-de-vagas";
import { dadosDeLocalizacao } from "@/lib/localizacao";

const pasta = path.resolve(__dirname, ".tmp-fonte");
const url = `file:${path.join(pasta, "fonte.db")}`;
let db: PrismaClient;
let fonte: ReturnType<typeof criarFonteDeVagas>;

async function criar(titulo: string, cidade: string, modalidade = "presencial", extra: Record<string, unknown> = {}) {
  await db.vaga.create({
    data: {
      titulo, empresa: "Acme", cidade, ...dadosDeLocalizacao(cidade), modalidade, tipo: "estagio", area: "Programação",
      descricao: "Python", origem: "gupy", idExterno: `${titulo}|${cidade}`, ...extra,
    },
  });
}

beforeAll(async () => {
  rmSync(pasta, { recursive: true, force: true });
  mkdirSync(pasta, { recursive: true });
  execSync("npx prisma db push --skip-generate", { env: { ...process.env, DATABASE_URL: url }, stdio: "pipe" });
  db = new PrismaClient({ datasources: { db: { url } } });
  fonte = criarFonteDeVagas(db);

  await criar("Dev em Recife", "Recife, Pernambuco");
  await criar("Dev em Olinda", "Olinda, PE");
  await criar("Suporte em Recife", "Macaxeira, Recife");
  await criar("Dev em São Paulo", "São Paulo, Estado de São Paulo");
  await criar("Dev em Belém", "Belém, Pará");
  await criar("Dev remoto", "Brasil", "remoto");
  await criar("Dev sem local", "Brasil");
  await criar("Dev remoto em Curitiba", "Curitiba, Paraná", "remoto");
}, 120_000);

afterAll(async () => {
  await db?.$disconnect();
  rmSync(pasta, { recursive: true, force: true });
});

const titulos = async (f: Parameters<typeof fonte.listar>[0]) => (await fonte.listar(f)).map((v) => v.titulo).sort();

describe("listar com filtro de estado e cidade", () => {
  it("sem filtro de região devolve tudo", async () => {
    expect((await fonte.listar({})).length).toBe(8);
  });

  it("filtra por estado e mantém as vagas remotas de qualquer lugar", async () => {
    expect(await titulos({ uf: "PE" })).toEqual(["Dev em Olinda", "Dev em Recife", "Dev remoto", "Dev remoto em Curitiba", "Suporte em Recife"]);
  });

  it("com somenteRegiao, esconde as remotas", async () => {
    expect(await titulos({ uf: "PE", somenteRegiao: true })).toEqual(["Dev em Olinda", "Dev em Recife", "Suporte em Recife"]);
  });

  it("filtra por cidade ignorando acentos e maiúsculas", async () => {
    for (const c of ["recife", "RECIFE", "Récife"]) {
      expect(await titulos({ cidade: c, somenteRegiao: true }), c).toEqual(["Dev em Recife", "Suporte em Recife"]);
    }
    expect(await titulos({ cidade: "sao paulo", somenteRegiao: true })).toEqual(["Dev em São Paulo"]);
    expect(await titulos({ cidade: "belem", somenteRegiao: true })).toEqual(["Dev em Belém"]);
  });

  it("aceita parte do nome da cidade", async () => {
    expect(await titulos({ cidade: "reci", somenteRegiao: true })).toEqual(["Dev em Recife", "Suporte em Recife"]);
  });

  it("estado e cidade juntos", async () => {
    expect(await titulos({ uf: "PE", cidade: "olinda", somenteRegiao: true })).toEqual(["Dev em Olinda"]);
    expect(await titulos({ uf: "SP", cidade: "recife", somenteRegiao: true })).toEqual([]);
  });

  it("combina com os outros filtros (E, não OU)", async () => {
    expect(await titulos({ uf: "PE", busca: "Suporte", somenteRegiao: true })).toEqual(["Suporte em Recife"]);
    // a busca também vale para as remotas incluídas
    expect(await titulos({ uf: "PE", busca: "remoto" })).toEqual(["Dev remoto", "Dev remoto em Curitiba"]);
    expect(await titulos({ uf: "PE", modalidade: "remoto" })).toEqual(["Dev remoto", "Dev remoto em Curitiba"]);
  });

  it("estado sem vagas só devolve as remotas", async () => {
    expect(await titulos({ uf: "AM" })).toEqual(["Dev remoto", "Dev remoto em Curitiba"]);
    expect(await titulos({ uf: "AM", somenteRegiao: true })).toEqual([]);
  });
});

describe("locais", () => {
  it("lista cidades com a quantidade, da maior para a menor, sem as vagas sem localização", async () => {
    const l = await fonte.locais();
    expect(l[0]).toEqual({ uf: "PE", cidade: "Recife", vagas: 2 });
    expect(l.map((x) => `${x.cidade}/${x.uf}`).sort()).toEqual(["Belém/PA", "Curitiba/PR", "Olinda/PE", "Recife/PE", "São Paulo/SP"]);
    expect(l.every((x) => x.vagas >= 1 && (x.uf || x.cidade))).toBe(true);
  });
});

describe("vagas de exemplo", () => {
  it("só aparecem enquanto não houver nenhuma vaga real", async () => {
    await db.vaga.deleteMany();
    await criar("Exemplo", "São Paulo, SP", "presencial", { origem: "exemplo", idExterno: null });
    expect((await fonte.listar({})).map((v) => v.titulo)).toEqual(["Exemplo"]);
    await criar("Real", "São Paulo, SP");
    expect((await fonte.listar({})).map((v) => v.titulo)).toEqual(["Real"]);
    expect((await fonte.locais()).length).toBe(1);
  });
});
