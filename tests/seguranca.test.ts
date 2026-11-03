import { execSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  bloqueioDoLogin,
  conferirCodigoDeConta,
  consumirCodigoDeConta,
  criarCodigoDeConta,
  limparFalhasDeLogin,
  registrarFalhaDeLogin,
} from "@/lib/contas";
import { emailDeConfirmacao, emailDeRedefinicao } from "@/lib/contas-email";
import {
  emailValidado,
  gerarCodigoSecreto,
  JANELA_DE_FALHAS_EM_MINUTOS,
  MAX_FALHAS_DE_LOGIN,
  MINUTOS_DE_BLOQUEIO,
  minutosDeBloqueio,
  registrarFalha,
  resumoDoCodigo,
} from "@/lib/seguranca";

const min = (n: number) => n * 60_000;
const t0 = new Date("2026-11-03T12:00:00Z");
const depois = (m: number) => new Date(t0.getTime() + min(m));

describe("bloqueio por senhas erradas (regra pura)", () => {
  it("conta as falhas e bloqueia na quinta", () => {
    let estado = null as ReturnType<typeof registrarFalha> | null;
    for (let i = 1; i < MAX_FALHAS_DE_LOGIN; i++) {
      estado = registrarFalha(estado, depois(i));
      expect(estado.falhas).toBe(i);
      expect(minutosDeBloqueio(estado, depois(i))).toBe(0);
    }
    estado = registrarFalha(estado, depois(MAX_FALHAS_DE_LOGIN));
    expect(minutosDeBloqueio(estado, depois(MAX_FALHAS_DE_LOGIN))).toBe(MINUTOS_DE_BLOQUEIO);
  });

  it("o bloqueio acaba sozinho", () => {
    const bloqueado = { falhas: 0, ultimaFalhaEm: t0, bloqueadoAte: depois(MINUTOS_DE_BLOQUEIO) };
    expect(minutosDeBloqueio(bloqueado, depois(10))).toBe(5);
    expect(minutosDeBloqueio(bloqueado, depois(MINUTOS_DE_BLOQUEIO))).toBe(0);
    expect(minutosDeBloqueio(null)).toBe(0);
  });

  it("falhas muito espaçadas não se somam", () => {
    const antiga = { falhas: 4, ultimaFalhaEm: t0, bloqueadoAte: null };
    expect(registrarFalha(antiga, depois(JANELA_DE_FALHAS_EM_MINUTOS + 1)).falhas).toBe(1);
    expect(registrarFalha(antiga, depois(1)).bloqueadoAte).not.toBeNull();
  });
});

describe("códigos secretos", () => {
  it("são longos, diferentes a cada vez, e o banco só guarda o resumo", () => {
    const a = gerarCodigoSecreto();
    expect(a.length).toBeGreaterThanOrEqual(40);
    expect(gerarCodigoSecreto()).not.toBe(a);
    expect(resumoDoCodigo(a)).toMatch(/^[0-9a-f]{64}$/);
    expect(resumoDoCodigo(a)).not.toContain(a);
  });
});

describe("emailValidado", () => {
  it("sem servidor de e-mail ninguém fica travado; com servidor, só quem confirmou vale", () => {
    expect(emailValidado(null, false)).toBe(true);
    expect(emailValidado(null, true)).toBe(false);
    expect(emailValidado(new Date(), true)).toBe(true);
  });
});

describe("e-mails da conta", () => {
  it("trazem o link e escapam o nome", () => {
    const m = emailDeRedefinicao({ nome: "Ana <b>", para: "ana@exemplo.com", link: "https://site.exemplo/redefinir-senha/abc" });
    expect(m.texto).toContain("https://site.exemplo/redefinir-senha/abc");
    expect(m.html).toContain('href="https://site.exemplo/redefinir-senha/abc"');
    expect(m.html).not.toContain("<b>");
    expect(emailDeConfirmacao({ nome: "Ana", para: "a@b.c", link: "https://x/y" }).assunto).toMatch(/Confirme/);
  });
});

describe("links e bloqueio no banco", () => {
  const pasta = path.resolve(__dirname, ".tmp-seguranca");
  const url = `file:${path.join(pasta, "seguranca.db")}`;
  let db: PrismaClient;
  let usuarioId: number;

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
    await db.tokenDeConta.deleteMany();
    await db.tentativaDeLogin.deleteMany();
    await db.usuario.deleteMany();
    usuarioId = (await db.usuario.create({ data: { nome: "Ana", email: "ana@exemplo.com", senhaHash: "x" } })).id;
  });

  it("o link vale uma vez só", async () => {
    const codigo = (await criarCodigoDeConta(db, usuarioId, "senha", t0))!;
    expect(await conferirCodigoDeConta(db, "senha", codigo, depois(1))).toBe(usuarioId);
    expect(await consumirCodigoDeConta(db, "senha", codigo, depois(2))).toBe(usuarioId);
    expect(await consumirCodigoDeConta(db, "senha", codigo, depois(3))).toBeNull();
  });

  it("o link de e-mail não serve para trocar a senha, e o contrário também", async () => {
    const codigo = (await criarCodigoDeConta(db, usuarioId, "email", t0))!;
    expect(await conferirCodigoDeConta(db, "senha", codigo, depois(1))).toBeNull();
    expect(await conferirCodigoDeConta(db, "email", codigo, depois(1))).toBe(usuarioId);
  });

  it("o link de senha vence em 1 hora e o de e-mail em 24 horas", async () => {
    const senha = (await criarCodigoDeConta(db, usuarioId, "senha", t0))!;
    const email = (await criarCodigoDeConta(db, usuarioId, "email", t0))!;
    expect(await conferirCodigoDeConta(db, "senha", senha, depois(59))).toBe(usuarioId);
    expect(await conferirCodigoDeConta(db, "senha", senha, depois(61))).toBeNull();
    expect(await conferirCodigoDeConta(db, "email", email, depois(23 * 60))).toBe(usuarioId);
    expect(await conferirCodigoDeConta(db, "email", email, depois(25 * 60))).toBeNull();
  });

  it("pedir outro link logo em seguida é recusado; depois de um minuto, o novo vale e o antigo não", async () => {
    const primeiro = (await criarCodigoDeConta(db, usuarioId, "senha", t0))!;
    expect(await criarCodigoDeConta(db, usuarioId, "senha", new Date(t0.getTime() + 10_000))).toBeNull();
    const segundo = (await criarCodigoDeConta(db, usuarioId, "senha", depois(2)))!;
    expect(await conferirCodigoDeConta(db, "senha", primeiro, depois(3))).toBeNull();
    expect(await conferirCodigoDeConta(db, "senha", segundo, depois(3))).toBe(usuarioId);
  });

  it("códigos inventados não valem", async () => {
    expect(await conferirCodigoDeConta(db, "senha", "inventado")).toBeNull();
    expect(await conferirCodigoDeConta(db, "senha", "")).toBeNull();
  });

  it("o banco não guarda o código, só o resumo", async () => {
    const codigo = (await criarCodigoDeConta(db, usuarioId, "senha", t0))!;
    const guardado = await db.tokenDeConta.findFirstOrThrow();
    expect(guardado.tokenHash).not.toBe(codigo);
    expect(guardado.tokenHash).toBe(resumoDoCodigo(codigo));
  });

  it("depois de 5 senhas erradas o e-mail fica bloqueado, mesmo sem conta, e limpar desbloqueia", async () => {
    for (let i = 0; i < MAX_FALHAS_DE_LOGIN; i++) await registrarFalhaDeLogin(db, "ninguem@exemplo.com", depois(i));
    expect(await bloqueioDoLogin(db, "ninguem@exemplo.com", depois(MAX_FALHAS_DE_LOGIN))).toBeGreaterThan(0);
    expect(await bloqueioDoLogin(db, "outro@exemplo.com", depois(MAX_FALHAS_DE_LOGIN))).toBe(0);
    await limparFalhasDeLogin(db, "ninguem@exemplo.com");
    expect(await bloqueioDoLogin(db, "ninguem@exemplo.com", depois(MAX_FALHAS_DE_LOGIN))).toBe(0);
  });

  it("excluir a conta apaga os links junto", async () => {
    await criarCodigoDeConta(db, usuarioId, "senha", t0);
    await db.usuario.delete({ where: { id: usuarioId } });
    expect(await db.tokenDeConta.count()).toBe(0);
  });
});
