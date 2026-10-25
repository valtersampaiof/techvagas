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

describe("filtros de salário e de data", () => {
  const agora = new Date("2026-10-25T12:00:00Z");
  const dias = (n: number) => new Date(agora.getTime() - n * 24 * 60 * 60 * 1000);

  beforeAll(async () => {
    await db.vaga.deleteMany();
    await criar("Bolsa 1200", "Recife, PE", "presencial", { salarioMin: 1200, salarioMax: 1200, publicadaEm: dias(1) });
    await criar("Faixa 1500-1900", "Recife, PE", "presencial", { salarioMin: 1500, salarioMax: 1900, publicadaEm: dias(5) });
    await criar("A partir de 3000", "Recife, PE", "presencial", { salarioMin: 3000, salarioMax: null, publicadaEm: dias(20) });
    await criar("Sem valor", "Recife, PE", "presencial", { publicadaEm: dias(40) });
    await criar("Sem data", "Recife, PE", "presencial", { salarioMin: 2000, salarioMax: 2000, publicadaEm: null });
  });

  it("salário mínimo usa o teto da faixa e o piso do 'a partir de'; sem valor fica de fora", async () => {
    expect(await titulos({ salarioMinimo: 1000, agora })).toEqual(["A partir de 3000", "Bolsa 1200", "Faixa 1500-1900", "Sem data"]);
    expect(await titulos({ salarioMinimo: 1800, agora })).toEqual(["A partir de 3000", "Faixa 1500-1900", "Sem data"]);
    expect(await titulos({ salarioMinimo: 2500, agora })).toEqual(["A partir de 3000"]);
    expect(await titulos({ salarioMinimo: 5000, agora })).toEqual([]);
  });

  it("sem filtro de salário, vagas sem valor continuam aparecendo", async () => {
    expect((await titulos({ agora })).includes("Sem valor")).toBe(true);
  });

  it("publicada nos últimos N dias; vaga sem data fica de fora", async () => {
    expect(await titulos({ publicadaHaDias: 1, agora })).toEqual(["Bolsa 1200"]);
    expect(await titulos({ publicadaHaDias: 7, agora })).toEqual(["Bolsa 1200", "Faixa 1500-1900"]);
    expect(await titulos({ publicadaHaDias: 30, agora })).toEqual(["A partir de 3000", "Bolsa 1200", "Faixa 1500-1900"]);
    expect(await titulos({ publicadaHaDias: 365, agora })).not.toContain("Sem data");
  });

  it("combina data, salário e região (E)", async () => {
    expect(await titulos({ publicadaHaDias: 7, salarioMinimo: 1800, uf: "PE", agora })).toEqual(["Faixa 1500-1900"]);
  });

  it("devolve o salário nas vagas", async () => {
    const v = (await fonte.listar({ busca: "Faixa", agora }))[0];
    expect(v).toMatchObject({ salarioMin: 1500, salarioMax: 1900 });
    const sem = (await fonte.listar({ busca: "Sem valor", agora }))[0];
    expect(sem).toMatchObject({ salarioMin: null, salarioMax: null, salarioOrigem: "" });
  });
});
