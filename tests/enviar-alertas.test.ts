import { execSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import type { AddressInfo } from "node:net";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { simpleParser, type ParsedMail } from "mailparser";
import { SMTPServer } from "smtp-server";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { criarEnviadorSmtp } from "@/lib/email";
import { enviarAlertas } from "@/lib/enviar-alertas";
import { dadosDeLocalizacao } from "@/lib/localizacao";

const pasta = path.resolve(__dirname, ".tmp-alertas");
const url = `file:${path.join(pasta, "alertas.db")}`;
let db: PrismaClient;

// ---------- um servidor SMTP de verdade, local, que guarda o que recebe ----------
let smtp: SMTPServer | null = null;
let porta = 0;
const recebidos: ParsedMail[] = [];

function ligarSmtp(portaFixa = 0): Promise<void> {
  return new Promise((resolve, reject) => {
    smtp = new SMTPServer({
      authOptional: true,
      disabledCommands: ["STARTTLS", "AUTH"],
      onData(stream, _sessao, aceitar) {
        simpleParser(stream).then((mail) => { recebidos.push(mail); aceitar(); }, aceitar);
      },
    });
    smtp.on("error", reject);
    smtp.listen(portaFixa, "127.0.0.1", () => {
      porta = (smtp!.server.address() as AddressInfo).port;
      resolve();
    });
  });
}
const desligarSmtp = () => new Promise<void>((r) => (smtp ? smtp.close(() => r()) : r()));

// mailparser devolve "para" e "de" como objetos com uma lista de endereços.
const enderecos = (campo: ParsedMail["to"]) => (campo ? (Array.isArray(campo) ? campo.flatMap((c) => c.value) : campo.value) : []);
const destinatarios = (m: ParsedMail) => enderecos(m.to).map((e) => e.address);
const remetente = (m: ParsedMail) => {
  const e = enderecos(m.from as ParsedMail["to"])[0];
  return { nome: e?.name, endereco: e?.address };
};

const enviador = () => criarEnviadorSmtp({ host: "127.0.0.1", port: porta, secure: false, ignorarTls: true, de: "TechVagas <avisos@techvagas.exemplo>" });
const executar = (extra: Partial<Parameters<typeof enviarAlertas>[0]> = {}) =>
  enviarAlertas({ db, enviar: enviador(), enderecoDoSite: "https://techvagas.exemplo", pausaMs: 0, ...extra });

let contador = 0;
async function criarVaga(titulo: string, cidade: string, extra: Record<string, unknown> = {}) {
  return db.vaga.create({
    data: {
      titulo, empresa: "Acme", cidade, ...dadosDeLocalizacao(cidade), modalidade: "presencial", tipo: "estagio", area: "Programação",
      descricao: "Python", origem: "gupy", idExterno: `v${++contador}`, ...extra,
    },
  });
}

const minutos = (n: number) => new Date(Date.now() + n * 60_000);

let usuario: { id: number };

beforeAll(async () => {
  rmSync(pasta, { recursive: true, force: true });
  mkdirSync(pasta, { recursive: true });
  execSync("npx prisma db push --skip-generate", { env: { ...process.env, DATABASE_URL: url }, stdio: "pipe" });
  db = new PrismaClient({ datasources: { db: { url } } });
  await ligarSmtp();
}, 120_000);

afterAll(async () => {
  await desligarSmtp();
  await db?.$disconnect();
  rmSync(pasta, { recursive: true, force: true });
});

beforeEach(async () => {
  recebidos.length = 0;
  await db.alerta.deleteMany();
  await db.vaga.deleteMany();
  await db.usuario.deleteMany();
  usuario = await db.usuario.create({ data: { nome: "Ana Souza", email: "ana@exemplo.com", senhaHash: "x" } });
});

async function criarAlerta(extra: Record<string, unknown> = {}) {
  return db.alerta.create({
    data: { usuarioId: usuario.id, nome: "Vagas em Recife (PE)", uf: "PE", cidade: "Recife", cidadeChave: "recife", token: `tok-${++contador}`, criadoEm: minutos(-60), ...extra },
  });
}

describe("enviarAlertas (com um servidor SMTP de verdade)", () => {
  it("manda um e-mail com as vagas NOVAS que combinam, e só elas", async () => {
    await criarVaga("Antiga em Recife", "Recife, PE", { primeiraVezEm: minutos(-120) }); // achada antes do alerta
    await criarVaga("Nova em Recife", "Recife, PE");
    await criarVaga("Nova em Olinda", "Olinda, PE");
    await criarVaga("Nova em São Paulo", "São Paulo, SP");
    await criarVaga("Encerrada em Recife", "Recife, PE", { ativa: false });
    await criarAlerta();

    const r = await executar();
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ situacao: "enviado", novas: 1, para: "ana@exemplo.com" });

    expect(recebidos).toHaveLength(1);
    const m = recebidos[0];
    expect(m.subject).toBe("TechVagas: 1 vaga nova · Vagas em Recife (PE)");
    expect(destinatarios(m)).toEqual(["ana@exemplo.com"]);
    expect(remetente(m)).toEqual({ nome: "TechVagas", endereco: "avisos@techvagas.exemplo" });
    expect(m.text).toContain("Nova em Recife");
    expect(m.text).not.toMatch(/Antiga|Olinda|São Paulo|Encerrada/);
    expect(m.html).toContain("Nova em Recife");
    expect(m.text).toMatch(/https:\/\/techvagas\.exemplo\/vagas\/\d+/);
    expect(m.text).toMatch(/https:\/\/techvagas\.exemplo\/alertas\/cancelar\?token=tok-/);
    // mailparser esconde o cabeçalho dentro de "list"; a linha bruta mostra o que realmente foi enviado.
    const linhaDeCancelamento = m.headerLines.find((h) => h.key === "list-unsubscribe")?.line ?? "";
    expect(linhaDeCancelamento).toMatch(/^List-Unsubscribe: <https:\/\/techvagas\.exemplo\/alertas\/cancelar\?token=tok-[^>]+>$/);
  });

  it("vaga antiga de banco antigo (data gravada como texto) não conta como nova", async () => {
    const antiga = await criarVaga("Antiga de banco antigo", "Recife, PE");
    // Era assim que o banco ficava ao ganhar a coluna: a data em texto, que no SQLite é sempre "maior" que um número.
    await db.$executeRawUnsafe(`UPDATE "Vaga" SET "primeiraVezEm" = '2026-01-10 12:00:00' WHERE id = ${antiga.id}`);
    await criarVaga("Nova de verdade", "Recife, PE");
    await criarAlerta();

    const r = await executar();
    expect(r[0]).toMatchObject({ situacao: "enviado", novas: 1 });
    expect(recebidos[0].text).toContain("Nova de verdade");
    expect(recebidos[0].text).not.toContain("Antiga de banco antigo");

    // a hora foi preservada, só o formato mudou
    const [linha] = await db.$queryRawUnsafe<{ tipo: string; ms: bigint }[]>(`SELECT typeof("primeiraVezEm") AS tipo, "primeiraVezEm" AS ms FROM "Vaga" WHERE id = ${antiga.id}`);
    expect(linha.tipo).toBe("integer");
    expect(new Date(Number(linha.ms)).toISOString()).toBe("2026-01-10T12:00:00.000Z");
  });

  it("não repete: a segunda execução não manda nada; uma vaga nova depois entra sozinha", async () => {
    await criarVaga("Primeira", "Recife, PE");
    const alerta = await criarAlerta();
    await executar();
    expect(recebidos).toHaveLength(1);
    const apos1 = (await db.alerta.findUniqueOrThrow({ where: { id: alerta.id } })).ultimoEnvioEm;
    expect(apos1).not.toBeNull();

    expect((await executar())[0]).toMatchObject({ situacao: "sem-novas", novas: 0 });
    expect(recebidos).toHaveLength(1);

    await new Promise((r) => setTimeout(r, 15));
    await criarVaga("Segunda", "Recife, PE");
    const r3 = await executar();
    expect(r3[0]).toMatchObject({ situacao: "enviado", novas: 1 });
    expect(recebidos).toHaveLength(2);
    expect(recebidos[1].text).toContain("Segunda");
    expect(recebidos[1].text).not.toContain("Primeira");
  });

  it("se o envio FALHAR, nenhuma vaga se perde: a próxima execução manda tudo", async () => {
    await criarVaga("Vaga importante", "Recife, PE");
    const alerta = await criarAlerta();

    const portaAntiga = porta;
    await desligarSmtp(); // servidor de e-mail fora do ar
    const r1 = await executar();
    expect(r1[0].situacao).toBe("erro");
    expect(r1[0].detalhe).toBeTruthy();
    expect((await db.alerta.findUniqueOrThrow({ where: { id: alerta.id } })).ultimoEnvioEm).toBeNull(); // não marcou como enviado

    await ligarSmtp(portaAntiga); // volta ao ar na mesma porta
    const r2 = await executar();
    expect(r2[0]).toMatchObject({ situacao: "enviado", novas: 1 });
    expect(recebidos).toHaveLength(1);
    expect(recebidos[0].text).toContain("Vaga importante");
  });

  it("um alerta com erro não impede os outros", async () => {
    await criarVaga("Vaga A", "Recife, PE");
    await criarAlerta();
    const outra = await db.usuario.create({ data: { nome: "Bia", email: "bia@exemplo.com", senhaHash: "x" } });
    await db.alerta.create({ data: { usuarioId: outra.id, nome: "Vagas em PE", uf: "PE", token: "tok-bia", criadoEm: minutos(-60) } });

    let chamadas = 0;
    const r = await executar({
      enviar: async (m) => {
        if (++chamadas === 1) throw new Error("recusado pelo servidor");
        await enviador()(m);
      },
    });
    expect(r.map((x) => x.situacao)).toEqual(["erro", "enviado"]);
    expect(recebidos).toHaveLength(1);
    expect(destinatarios(recebidos[0])).toEqual(["bia@exemplo.com"]);
  });

  it("modo simulação: mostra o e-mail, não envia e não marca como enviado", async () => {
    await criarVaga("Vaga X", "Recife, PE");
    const alerta = await criarAlerta();
    const vistas: string[] = [];
    const r = await executar({ simular: true, aoSimular: (m) => vistas.push(m.assunto) });
    expect(r[0]).toMatchObject({ situacao: "simulado", novas: 1 });
    expect(vistas).toEqual(["TechVagas: 1 vaga nova · Vagas em Recife (PE)"]);
    expect(recebidos).toHaveLength(0);
    expect((await db.alerta.findUniqueOrThrow({ where: { id: alerta.id } })).ultimoEnvioEm).toBeNull();
  });

  it("sem enviador configurado, tudo é simulação", async () => {
    await criarVaga("Vaga Y", "Recife, PE");
    await criarAlerta();
    const r = await enviarAlertas({ db, enderecoDoSite: "https://techvagas.exemplo", pausaMs: 0 });
    expect(r[0].situacao).toBe("simulado");
    expect(recebidos).toHaveLength(0);
  });

  it("alerta pausado não envia; e-mail só sai se houver vaga nova", async () => {
    await criarVaga("Vaga Z", "Recife, PE");
    await criarAlerta({ ativo: false });
    expect(await executar()).toEqual([]);
    expect(recebidos).toHaveLength(0);
  });

  it("respeita 'sem vagas remotas' e os demais filtros do alerta", async () => {
    await criarVaga("Presencial em Recife", "Recife, PE");
    await criarVaga("Remota de outro lugar", "Brasil", { modalidade: "remoto" });
    await criarVaga("Júnior em Recife", "Recife, PE", { tipo: "junior" });
    await criarAlerta({ tipo: "estagio", incluirRemotas: false });
    const r = await executar();
    expect(r[0].novas).toBe(1);
    expect(recebidos[0].text).toContain("Presencial em Recife");
    expect(recebidos[0].text).not.toMatch(/Remota|Júnior/);

    recebidos.length = 0;
    await db.alerta.updateMany({ data: { incluirRemotas: true, ultimoEnvioEm: null, criadoEm: minutos(-60) } });
    await executar();
    expect(recebidos[0].text).toContain("Remota de outro lugar");
  });

  it("alerta com nível e contratação: só chegam as vagas desse nível e contrato ('CLT ou PJ' entra nos dois)", async () => {
    await criarVaga("Sênior CLT", "Recife, PE", { tipo: "senior", contrato: "clt" });
    await criarVaga("Sênior PJ", "Recife, PE", { tipo: "senior", contrato: "pj" });
    await criarVaga("Sênior aceita os dois", "Recife, PE", { tipo: "senior", contrato: "clt_pj" });
    await criarVaga("Sênior sem contrato informado", "Recife, PE", { tipo: "senior", contrato: "" });
    await criarVaga("Pleno PJ", "Recife, PE", { tipo: "pleno", contrato: "pj" });
    await criarAlerta({ tipo: "senior", contrato: "pj" });
    const r = await executar();
    expect(r[0].novas).toBe(2);
    expect(recebidos[0].text).toContain("Sênior PJ");
    expect(recebidos[0].text).toContain("Sênior aceita os dois");
    expect(recebidos[0].text).not.toMatch(/Sênior CLT|sem contrato|Pleno PJ/);
    expect(recebidos[0].text).toContain("tipo=senior&contrato=pj");
  });

  it("inclui a compatibilidade quando a pessoa tem habilidades no perfil", async () => {
    const h = await db.habilidade.create({ data: { slug: "python", nome: "Python", area: "Programação" } });
    await db.habilidadeDoUsuario.create({ data: { usuarioId: usuario.id, habilidadeId: h.id, nivel: "iniciante" } });
    const vaga = await criarVaga("Dev Python", "Recife, PE");
    await db.requisitoDaVaga.create({ data: { vagaId: vaga.id, habilidadeId: h.id, nivelMinimo: "iniciante", obrigatorio: true } });
    await criarAlerta();
    await executar();
    expect(recebidos[0].text).toContain("Compatibilidade com o seu perfil: 100%");
  });

  it("escapa HTML de verdade no e-mail recebido", async () => {
    await criarVaga(`<script>alert(1)</script> Dev`, "Recife, PE");
    await criarAlerta();
    await executar();
    const html = String(recebidos[0].html);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
