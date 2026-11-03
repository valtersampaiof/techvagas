import { spawn } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { criarClienteDoBanco } from "@/lib/cliente-do-banco";
import { CURSOS } from "@/lib/dados/cursos";
import { HABILIDADES } from "@/lib/dados/habilidades";
import { criarFonteDeVagas } from "@/lib/fonte-de-vagas";
import { sincronizarVagas } from "@/lib/vagas/sincronizar";
import type { FonteExterna, VagaExterna } from "@/lib/vagas/tipos";
import { iniciarServidorHrana, type ServidorHrana } from "./ajudantes/servidor-hrana";

/**
 * O caminho que o site usa na internet, de ponta a ponta, contra um "Turso de mentirinha" (veja ajudantes/servidor-hrana.ts):
 * preparar as tabelas, carregar o catálogo, sincronizar vagas, consultar e conferir o token de acesso.
 * Os comandos `scripts/preparar-banco.ts` e `prisma/seed.ts` rodam como no GitHub Actions: em outro processo, só com as
 * variáveis TURSO_DATABASE_URL e TURSO_AUTH_TOKEN.
 */
const pasta = path.resolve(__dirname, ".tmp-online");
const TOKEN = "token-de-teste-123";
let servidor: ServidorHrana;
let db: PrismaClient;
let ambienteAnterior: Record<string, string | undefined>;

function rodar(comando: string, args: string[]): Promise<{ codigo: number; saida: string }> {
  return new Promise((resolver) => {
    const filho = spawn(comando, args, {
      cwd: path.resolve(__dirname, ".."),
      env: { ...process.env, TURSO_DATABASE_URL: servidor.url, TURSO_AUTH_TOKEN: TOKEN, DATABASE_URL: "file:./nao-usado.db" },
    });
    let saida = "";
    filho.stdout.on("data", (d) => (saida += d));
    filho.stderr.on("data", (d) => (saida += d));
    filho.on("close", (codigo) => resolver({ codigo: codigo ?? -1, saida }));
  });
}

const vaga = (id: string, titulo: string, descricao = "Python e SQL"): VagaExterna => ({
  origem: "falsa-online",
  idExterno: id,
  titulo,
  empresa: "Acme",
  cidade: "Recife, PE",
  descricao,
  link: `https://exemplo.com/${id}`,
  publicadaEm: new Date(),
});
const fonte = (vagas: () => VagaExterna[]): FonteExterna => ({ origem: "falsa-online", rotulo: "Falsa", indisponivel: () => null, buscar: async () => vagas() });

beforeAll(async () => {
  rmSync(pasta, { recursive: true, force: true });
  mkdirSync(pasta, { recursive: true });
  servidor = await iniciarServidorHrana({ arquivo: path.join(pasta, "online.db"), token: TOKEN });
  ambienteAnterior = { url: process.env.TURSO_DATABASE_URL, token: process.env.TURSO_AUTH_TOKEN };
  process.env.TURSO_DATABASE_URL = servidor.url;
  process.env.TURSO_AUTH_TOKEN = TOKEN;
  db = criarClienteDoBanco();
}, 60_000);

afterAll(async () => {
  await db?.$disconnect();
  if (ambienteAnterior.url === undefined) delete process.env.TURSO_DATABASE_URL;
  else process.env.TURSO_DATABASE_URL = ambienteAnterior.url;
  if (ambienteAnterior.token === undefined) delete process.env.TURSO_AUTH_TOKEN;
  else process.env.TURSO_AUTH_TOKEN = ambienteAnterior.token;
  await servidor?.fechar();
  rmSync(pasta, { recursive: true, force: true });
});

describe("site no ar: banco online", () => {
  it("prepara o banco vazio (cria tabelas e índices) e pode ser repetido", async () => {
    const primeira = await rodar("npx", ["tsx", "scripts/preparar-banco.ts"]);
    expect(primeira.saida).toContain("mudança(s) aplicada(s)");
    expect(primeira.codigo).toBe(0);
    const segunda = await rodar("npx", ["tsx", "scripts/preparar-banco.ts"]);
    expect(segunda.codigo).toBe(0);
  }, 180_000);

  it("carrega o catálogo (habilidades e cursos) e, repetido, não muda nada", async () => {
    const primeira = await rodar("npx", ["tsx", "prisma/seed.ts"]);
    expect(primeira.saida).toMatch(new RegExp(`Cursos: ${CURSOS.length} \\(${CURSOS.length} novos, 0 atualizados, 0 removidos\\)`));
    expect(primeira.codigo).toBe(0);

    expect(await db.habilidade.count()).toBe(HABILIDADES.length);
    expect(await db.curso.count()).toBe(CURSOS.length);
    expect(await db.habilidadeDoCurso.count()).toBe(CURSOS.reduce((n, c) => n + c.habilidades.length, 0));
    expect(await db.vaga.count({ where: { origem: "exemplo" } })).toBeGreaterThan(0);

    const segunda = await rodar("npx", ["tsx", "prisma/seed.ts"]);
    expect(segunda.saida).toMatch(/\(0 novos, 0 atualizados, 0 removidos\)/);
    expect(await db.curso.count()).toBe(CURSOS.length);
  }, 300_000);

  it("sincroniza vagas (gravação com requisitos aninhados), atualiza sem duplicar e remove as que saíram", async () => {
    const [r] = await sincronizarVagas(db, [fonte(() => [vaga("1", "Estágio em Dados"), vaga("2", "Analista Contábil Pleno", "Conciliações."), vaga("3", "Dev Python Júnior")])]);
    expect(r).toMatchObject({ situacao: "ok", recebidas: 3, salvas: 2, descartadas: 1 });

    const salvas = await db.vaga.findMany({ where: { origem: "falsa-online" }, include: { requisitos: true }, orderBy: { idExterno: "asc" } });
    expect(salvas.map((v) => v.idExterno)).toEqual(["1", "3"]);
    expect(salvas[0].requisitos.length).toBeGreaterThan(0);
    expect(salvas[0].publicadaEm).toBeInstanceOf(Date);

    await sincronizarVagas(db, [fonte(() => [vaga("1", "Estágio em Dados", "Somente Linux"), vaga("3", "Dev Python Júnior")])]);
    expect(await db.vaga.count({ where: { origem: "falsa-online" } })).toBe(2);
    const v1 = await db.vaga.findFirstOrThrow({ where: { origem: "falsa-online", idExterno: "1" }, include: { requisitos: { include: { habilidade: true } } } });
    expect(v1.requisitos.map((x) => x.habilidade.slug)).toEqual(["linux"]);

    await sincronizarVagas(db, [fonte(() => [vaga("3", "Dev Python Júnior")])]);
    expect((await db.vaga.findMany({ where: { origem: "falsa-online" } })).map((v) => v.idExterno)).toEqual(["3"]);
  }, 120_000);

  it("consulta como o site faz: filtros, busca, locais, áreas e habilidades mais pedidas", async () => {
    const fonteDeVagas = criarFonteDeVagas(db);
    const junior = await fonteDeVagas.listar({ tipo: "junior" });
    expect(junior.some((v) => v.titulo === "Dev Python Júnior")).toBe(true);
    expect(junior.length).toBeGreaterThan(0);
    expect((await fonteDeVagas.listar({ busca: "python" })).map((v) => v.titulo)).toContain("Dev Python Júnior");
    expect((await fonteDeVagas.listar({ uf: "PE", somenteRegiao: true })).length).toBeGreaterThan(0);
    expect((await fonteDeVagas.locais()).some((l) => l.uf === "PE")).toBe(true);
    expect((await fonteDeVagas.areas()).length).toBeGreaterThan(0);
    const mercado = await fonteDeVagas.habilidadesMaisPedidas({});
    expect(mercado.totalDeVagas).toBeGreaterThan(0);
    expect(mercado.habilidades.some((h) => h.slug === "python")).toBe(true);
  }, 60_000);

  it("transações: confirma o que deu certo e desfaz tudo quando algo falha no meio", async () => {
    await db.$transaction(async (tx) => {
      await tx.usuario.create({ data: { nome: "Ana", email: "ana-online@exemplo.com", senhaHash: "x" } });
    });
    expect(await db.usuario.count({ where: { email: "ana-online@exemplo.com" } })).toBe(1);

    await expect(
      db.$transaction(async (tx) => {
        await tx.usuario.create({ data: { nome: "Bia", email: "bia-online@exemplo.com", senhaHash: "x" } });
        throw new Error("falhou no meio");
      }),
    ).rejects.toThrow("falhou no meio");
    expect(await db.usuario.count({ where: { email: "bia-online@exemplo.com" } })).toBe(0);

    // E o formato em lista, usado ao marcar cursos concluídos e ao salvar o perfil.
    const ana = await db.usuario.findFirstOrThrow({ where: { email: "ana-online@exemplo.com" } });
    const curso = await db.curso.findFirstOrThrow();
    await db.$transaction([db.cursoConcluido.create({ data: { usuarioId: ana.id, cursoId: curso.id } }), db.usuario.update({ where: { id: ana.id }, data: { cidade: "Recife" } })]);
    expect(await db.cursoConcluido.count({ where: { usuarioId: ana.id } })).toBe(1);

    // Excluir a conta apaga o que está ligado a ela (exclusão em cascata).
    await db.usuario.delete({ where: { id: ana.id } });
    expect(await db.cursoConcluido.count({ where: { usuarioId: ana.id } })).toBe(0);
  }, 60_000);

  it("o banco impede e-mail repetido e o erro traz o motivo", async () => {
    await db.usuario.create({ data: { nome: "Cai", email: "cai-online@exemplo.com", senhaHash: "x" } });
    // O site confere o e-mail ANTES de criar a conta (não depende do código de erro do Prisma); aqui vemos que o banco mesmo
    // impede a duplicata e que o erro traz o motivo.
    await expect(db.usuario.create({ data: { nome: "Cai 2", email: "cai-online@exemplo.com", senhaHash: "x" } })).rejects.toThrow(/UNIQUE constraint failed/);
    expect(await db.usuario.count({ where: { email: "cai-online@exemplo.com" } })).toBe(1);
  }, 30_000);

  it("o token de acesso é obrigatório: com token errado, o banco recusa", async () => {
    const antes = servidor.recusadas();
    process.env.TURSO_AUTH_TOKEN = "token-errado";
    const intruso = criarClienteDoBanco();
    try {
      await expect(intruso.curso.count()).rejects.toThrow();
    } finally {
      process.env.TURSO_AUTH_TOKEN = TOKEN;
      await intruso.$disconnect();
    }
    expect(servidor.recusadas()).toBeGreaterThan(antes);
  }, 30_000);

  it("de fato usou o caminho online (milhares de chamadas HTTP ao servidor)", () => {
    expect(servidor.chamadas()).toBeGreaterThan(500);
  });
});
