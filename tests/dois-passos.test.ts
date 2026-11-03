import { execSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { confirmarAtivacao, desativar, iniciarAtivacao, novosCodigosDeRecuperacao, restantesDeRecuperacao, verificarSegundoPasso } from "@/lib/dois-passos";
import { codigoTotp, decifrarSegredo, passoDoMomento } from "@/lib/totp";

const pasta = path.resolve(__dirname, ".tmp-dois-passos");
const url = `file:${path.join(pasta, "dois-passos.db")}`;
let db: PrismaClient;
let usuarioId: number;

const t0 = new Date("2026-11-03T12:00:00Z");
const depois = (segundos: number) => new Date(t0.getTime() + segundos * 1000);

/** O código que o aplicativo do celular mostraria agora. */
async function codigoDoAplicativo(quando: Date): Promise<string> {
  const u = await db.usuario.findUniqueOrThrow({ where: { id: usuarioId } });
  return codigoTotp(decifrarSegredo(u.totpSegredo!)!, passoDoMomento(quando));
}

async function ativar(): Promise<string[]> {
  await iniciarAtivacao(db, usuarioId, "ana@exemplo.com");
  const r = await confirmarAtivacao(db, usuarioId, await codigoDoAplicativo(t0), t0);
  if ("erro" in r) throw new Error(r.erro);
  return r.codigosDeRecuperacao;
}

beforeAll(async () => {
  rmSync(pasta, { recursive: true, force: true });
  mkdirSync(pasta, { recursive: true });
  execSync("npx prisma db push --skip-generate", { env: { ...process.env, DATABASE_URL: url }, stdio: "pipe" });
  db = new PrismaClient({ datasources: { db: { url } } });
}, 120_000);

afterAll(async () => {
  await db?.$disconnect();
  rmSync(pasta, { recursive: true, force: true });
});

beforeEach(async () => {
  await db.usuario.deleteMany();
  usuarioId = (await db.usuario.create({ data: { nome: "Ana", email: "ana@exemplo.com", senhaHash: "x" } })).id;
});

describe("ativar a verificação em dois passos", () => {
  it("gera o segredo e o endereço do QR code, e o segredo fica cifrado no banco", async () => {
    const r = await iniciarAtivacao(db, usuarioId, "ana@exemplo.com");
    if ("erro" in r) throw new Error(r.erro);
    expect(r.url).toContain("otpauth://totp/");
    expect(r.url).toContain(`secret=${r.segredo}`);
    const u = await db.usuario.findUniqueOrThrow({ where: { id: usuarioId } });
    expect(u.totpSegredo).not.toContain(r.segredo);
    expect(decifrarSegredo(u.totpSegredo!)).toBe(r.segredo);
    expect(u.totpAtivoEm).toBeNull(); // ainda pendente
  });

  it("só liga depois de confirmar um código certo; código errado não liga", async () => {
    await iniciarAtivacao(db, usuarioId, "ana@exemplo.com");
    expect(await confirmarAtivacao(db, usuarioId, "000000", t0)).toHaveProperty("erro");
    expect((await db.usuario.findUniqueOrThrow({ where: { id: usuarioId } })).totpAtivoEm).toBeNull();

    const r = await confirmarAtivacao(db, usuarioId, await codigoDoAplicativo(t0), t0);
    expect(r).toHaveProperty("codigosDeRecuperacao");
    expect((await db.usuario.findUniqueOrThrow({ where: { id: usuarioId } })).totpAtivoEm).not.toBeNull();
  });

  it("entrega 8 códigos de recuperação e guarda só o resumo deles", async () => {
    const codigos = await ativar();
    expect(codigos).toHaveLength(8);
    expect(await restantesDeRecuperacao(db, usuarioId)).toBe(8);
    const guardados = await db.codigoDeRecuperacao.findMany();
    for (const g of guardados) for (const c of codigos) expect(g.hash).not.toContain(c.replace("-", ""));
  });

  it("não deixa gerar um novo segredo com a proteção já ativa (não dá para trocá-la sem desligar)", async () => {
    await ativar();
    expect(await iniciarAtivacao(db, usuarioId, "ana@exemplo.com")).toHaveProperty("erro");
  });

  it("sem ter pedido o QR code antes, não há o que confirmar", async () => {
    expect(await confirmarAtivacao(db, usuarioId, "123456", t0)).toHaveProperty("erro");
  });
});

describe("entrar com o segundo passo", () => {
  it("aceita o código do aplicativo, recusa o errado, e recusa a repetição do mesmo código", async () => {
    await ativar();
    const quando = depois(60); // dois passos depois da ativação
    const codigo = await codigoDoAplicativo(quando);

    expect(await verificarSegundoPasso(db, usuarioId, "000000", quando)).toEqual({ ok: false });
    expect(await verificarSegundoPasso(db, usuarioId, codigo, quando)).toMatchObject({ ok: true, via: "aplicativo" });
    expect(await verificarSegundoPasso(db, usuarioId, codigo, quando)).toEqual({ ok: false }); // repetido
    expect(await verificarSegundoPasso(db, usuarioId, await codigoDoAplicativo(depois(120)), depois(120))).toMatchObject({ ok: true });
  });

  it("o código usado para ligar a proteção também não pode ser reaproveitado no login", async () => {
    await ativar();
    expect(await verificarSegundoPasso(db, usuarioId, await codigoDoAplicativo(t0), t0)).toEqual({ ok: false });
  });

  it("dois pedidos ao mesmo tempo com o mesmo código: só um passa", async () => {
    await ativar();
    const quando = depois(60);
    const codigo = await codigoDoAplicativo(quando);
    const r = await Promise.all([verificarSegundoPasso(db, usuarioId, codigo, quando), verificarSegundoPasso(db, usuarioId, codigo, quando), verificarSegundoPasso(db, usuarioId, codigo, quando)]);
    expect(r.filter((x) => x.ok)).toHaveLength(1);
  });

  it("código de recuperação vale uma vez só e conta os que sobram", async () => {
    const codigos = await ativar();
    expect(await verificarSegundoPasso(db, usuarioId, codigos[0].toLowerCase(), depois(60))).toMatchObject({ ok: true, via: "recuperacao", recuperacaoRestantes: 7 });
    expect(await verificarSegundoPasso(db, usuarioId, codigos[0], depois(61))).toEqual({ ok: false });
    expect(await verificarSegundoPasso(db, usuarioId, codigos[1].replace("-", " "), depois(62))).toMatchObject({ ok: true, recuperacaoRestantes: 6 });
  });

  it("código de recuperação inventado não vale", async () => {
    await ativar();
    expect(await verificarSegundoPasso(db, usuarioId, "AAAAA-BBBBB", depois(60))).toEqual({ ok: false });
  });

  it("quem não ativou a proteção nunca passa por este passo", async () => {
    expect(await verificarSegundoPasso(db, usuarioId, "123456", t0)).toEqual({ ok: false });
    await iniciarAtivacao(db, usuarioId, "ana@exemplo.com"); // pendente, ainda não ativo
    const u = await db.usuario.findUniqueOrThrow({ where: { id: usuarioId } });
    const pendente = codigoTotp(decifrarSegredo(u.totpSegredo!)!, passoDoMomento(t0));
    expect(await verificarSegundoPasso(db, usuarioId, pendente, t0)).toEqual({ ok: false });
  });
});

describe("desligar e renovar", () => {
  it("desativar apaga o segredo e os códigos de recuperação", async () => {
    await ativar();
    await desativar(db, usuarioId);
    const u = await db.usuario.findUniqueOrThrow({ where: { id: usuarioId } });
    expect(u).toMatchObject({ totpSegredo: null, totpAtivoEm: null, totpUltimoPasso: null });
    expect(await restantesDeRecuperacao(db, usuarioId)).toBe(0);
  });

  it("novos códigos de recuperação invalidam os antigos", async () => {
    const antigos = await ativar();
    const novos = await novosCodigosDeRecuperacao(db, usuarioId);
    expect(novos).toHaveLength(8);
    expect(await verificarSegundoPasso(db, usuarioId, antigos[0], depois(60))).toEqual({ ok: false });
    expect(await verificarSegundoPasso(db, usuarioId, novos[0], depois(60))).toMatchObject({ ok: true });
  });

  it("excluir a conta apaga os códigos junto", async () => {
    await ativar();
    await db.usuario.delete({ where: { id: usuarioId } });
    expect(await db.codigoDeRecuperacao.count()).toBe(0);
  });
});
