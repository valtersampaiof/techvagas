import type { PrismaClient } from "@prisma/client";
import {
  cifrarSegredo,
  decifrarSegredo,
  gerarCodigosDeRecuperacao,
  gerarSegredoTotp,
  pareceCodigoDeRecuperacao,
  resumoDoCodigoDeRecuperacao,
  urlOtpauth,
  verificarTotp,
} from "./totp";

/**
 * Autenticação em dois passos, passo a passo:
 *  1. `iniciarAtivacao`: o site cria um segredo (guardado cifrado, ainda "pendente") e mostra o QR code.
 *  2. `confirmarAtivacao`: a pessoa digita o código que o aplicativo mostrou; só então a proteção liga, e saem os códigos de recuperação.
 *  3. No login, depois da senha, `verificarSegundoPasso` pede o código do aplicativo (ou um código de recuperação).
 */

export type ResultadoDoSegundoPasso = { ok: true; via: "aplicativo" | "recuperacao"; recuperacaoRestantes: number } | { ok: false };

export async function iniciarAtivacao(db: PrismaClient, usuarioId: number, email: string): Promise<{ segredo: string; url: string } | { erro: string }> {
  const u = await db.usuario.findUnique({ where: { id: usuarioId }, select: { totpAtivoEm: true } });
  if (!u) return { erro: "Conta não encontrada." };
  if (u.totpAtivoEm) return { erro: "A verificação em dois passos já está ativa." };
  const segredo = gerarSegredoTotp();
  // Um segredo pendente anterior (de uma tentativa abandonada) é simplesmente substituído.
  await db.usuario.update({ where: { id: usuarioId }, data: { totpSegredo: cifrarSegredo(segredo), totpAtivoEm: null, totpUltimoPasso: null } });
  return { segredo, url: urlOtpauth({ email, segredo }) };
}

async function guardarCodigosDeRecuperacao(db: PrismaClient, usuarioId: number): Promise<string[]> {
  const codigos = gerarCodigosDeRecuperacao();
  await db.codigoDeRecuperacao.deleteMany({ where: { usuarioId } });
  await db.codigoDeRecuperacao.createMany({ data: codigos.map((c) => ({ usuarioId, hash: resumoDoCodigoDeRecuperacao(c) })) });
  return codigos;
}

/** Liga a proteção se o código do aplicativo conferir. Devolve os códigos de recuperação (só aparecem agora, uma vez). */
export async function confirmarAtivacao(db: PrismaClient, usuarioId: number, digitado: string, agora = new Date()): Promise<{ codigosDeRecuperacao: string[] } | { erro: string }> {
  const u = await db.usuario.findUnique({ where: { id: usuarioId }, select: { totpSegredo: true, totpAtivoEm: true } });
  if (!u?.totpSegredo) return { erro: "Comece de novo: gere o QR code primeiro." };
  if (u.totpAtivoEm) return { erro: "A verificação em dois passos já está ativa." };
  const segredo = decifrarSegredo(u.totpSegredo);
  const passo = segredo ? verificarTotp(segredo, digitado, { agora }) : null;
  if (passo === null) return { erro: "Código incorreto. Confira se o relógio do celular está certo e tente o código novo que aparece." };
  await db.usuario.update({ where: { id: usuarioId }, data: { totpAtivoEm: agora, totpUltimoPasso: passo } });
  return { codigosDeRecuperacao: await guardarCodigosDeRecuperacao(db, usuarioId) };
}

export async function restantesDeRecuperacao(db: PrismaClient, usuarioId: number): Promise<number> {
  return db.codigoDeRecuperacao.count({ where: { usuarioId, usadoEm: null } });
}

/**
 * Confere o segundo passo do login (ou de uma ação sensível): o código do aplicativo ou um código de recuperação.
 * Cada código vale uma vez: o do aplicativo não pode ser repetido no mesmo passo, e o de recuperação é riscado ao usar.
 */
export async function verificarSegundoPasso(db: PrismaClient, usuarioId: number, digitado: string, agora = new Date()): Promise<ResultadoDoSegundoPasso> {
  const u = await db.usuario.findUnique({ where: { id: usuarioId }, select: { totpSegredo: true, totpAtivoEm: true, totpUltimoPasso: true } });
  if (!u?.totpSegredo || !u.totpAtivoEm) return { ok: false };

  if (pareceCodigoDeRecuperacao(digitado)) {
    // "updateMany" com a condição "ainda não usado" garante que dois pedidos ao mesmo tempo não gastem o mesmo código duas vezes.
    const r = await db.codigoDeRecuperacao.updateMany({ where: { usuarioId, hash: resumoDoCodigoDeRecuperacao(digitado), usadoEm: null }, data: { usadoEm: agora } });
    return r.count === 1 ? { ok: true, via: "recuperacao", recuperacaoRestantes: await restantesDeRecuperacao(db, usuarioId) } : { ok: false };
  }

  const segredo = decifrarSegredo(u.totpSegredo);
  if (!segredo) return { ok: false };
  const passo = verificarTotp(segredo, digitado, { agora, ultimoPasso: u.totpUltimoPasso });
  if (passo === null) return { ok: false };
  // Só "ganha" quem gravar o passo primeiro: o mesmo código usado duas vezes ao mesmo tempo passa uma vez só.
  const r = await db.usuario.updateMany({ where: { id: usuarioId, OR: [{ totpUltimoPasso: null }, { totpUltimoPasso: { lt: passo } }] }, data: { totpUltimoPasso: passo } });
  return r.count === 1 ? { ok: true, via: "aplicativo", recuperacaoRestantes: await restantesDeRecuperacao(db, usuarioId) } : { ok: false };
}

/** Desliga a proteção (a senha e o segundo passo já foram conferidos por quem chama). */
export async function desativar(db: PrismaClient, usuarioId: number): Promise<void> {
  await db.codigoDeRecuperacao.deleteMany({ where: { usuarioId } });
  await db.usuario.update({ where: { id: usuarioId }, data: { totpSegredo: null, totpAtivoEm: null, totpUltimoPasso: null } });
}

/** Troca os códigos de recuperação por 8 novos (os antigos deixam de valer). */
export async function novosCodigosDeRecuperacao(db: PrismaClient, usuarioId: number): Promise<string[]> {
  return guardarCodigosDeRecuperacao(db, usuarioId);
}
