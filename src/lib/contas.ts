import type { PrismaClient } from "@prisma/client";
import { gerarCodigoSecreto, minutosDeBloqueio, registrarFalha, resumoDoCodigo } from "./seguranca";

export type TipoDeToken = "email" | "senha";

const VALIDADE_EM_MINUTOS: Record<TipoDeToken, number> = { email: 60 * 24, senha: 60 };
/** Depois de pedir um link, é preciso esperar um pouco para pedir outro (evita encher a caixa de e-mail de alguém). */
const ESPERA_ENTRE_PEDIDOS_EM_SEGUNDOS = 60;

/**
 * Cria um link de uso único para a pessoa. Devolve o código (que vai no e-mail) ou null se um link foi pedido há pouco.
 * O link anterior do mesmo tipo deixa de valer.
 */
export async function criarCodigoDeConta(db: PrismaClient, usuarioId: number, tipo: TipoDeToken, agora = new Date()): Promise<string | null> {
  const ultimo = await db.tokenDeConta.findFirst({ where: { usuarioId, tipo }, orderBy: { criadoEm: "desc" } });
  if (ultimo && agora.getTime() - ultimo.criadoEm.getTime() < ESPERA_ENTRE_PEDIDOS_EM_SEGUNDOS * 1000) return null;

  const codigo = gerarCodigoSecreto();
  await db.tokenDeConta.deleteMany({ where: { usuarioId, tipo } });
  await db.tokenDeConta.create({
    data: { usuarioId, tipo, tokenHash: resumoDoCodigo(codigo), criadoEm: agora, expiraEm: new Date(agora.getTime() + VALIDADE_EM_MINUTOS[tipo] * 60_000) },
  });
  return codigo;
}

/** O código ainda vale? (Não o consome.) Devolve o número da pessoa ou null. */
export async function conferirCodigoDeConta(db: PrismaClient, tipo: TipoDeToken, codigo: string, agora = new Date()): Promise<number | null> {
  if (!codigo || codigo.length > 200) return null;
  const t = await db.tokenDeConta.findUnique({ where: { tokenHash: resumoDoCodigo(codigo) } });
  if (!t || t.tipo !== tipo || t.expiraEm <= agora) return null;
  return t.usuarioId;
}

/** Usa o código: confere e apaga, para valer uma vez só. */
export async function consumirCodigoDeConta(db: PrismaClient, tipo: TipoDeToken, codigo: string, agora = new Date()): Promise<number | null> {
  const usuarioId = await conferirCodigoDeConta(db, tipo, codigo, agora);
  if (usuarioId === null) return null;
  await db.tokenDeConta.deleteMany({ where: { tokenHash: resumoDoCodigo(codigo) } });
  return usuarioId;
}

/** Minutos de bloqueio que restam para este e-mail (0 = pode tentar). */
export async function bloqueioDoLogin(db: PrismaClient, email: string, agora = new Date()): Promise<number> {
  return minutosDeBloqueio(await db.tentativaDeLogin.findUnique({ where: { email } }), agora);
}

export async function registrarFalhaDeLogin(db: PrismaClient, email: string, agora = new Date()): Promise<void> {
  const anterior = await db.tentativaDeLogin.findUnique({ where: { email } });
  const novo = registrarFalha(anterior, agora);
  await db.tentativaDeLogin.upsert({ where: { email }, update: novo, create: { email, ...novo } });
}

export async function limparFalhasDeLogin(db: PrismaClient, email: string): Promise<void> {
  await db.tentativaDeLogin.deleteMany({ where: { email } });
}
