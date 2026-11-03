import { createHash, randomBytes } from "node:crypto";

/** Quantas senhas erradas seguidas até bloquear, e por quanto tempo. */
export const MAX_FALHAS_DE_LOGIN = 5;
export const MINUTOS_DE_BLOQUEIO = 15;
/** Falhas separadas por mais que isso não se somam. */
export const JANELA_DE_FALHAS_EM_MINUTOS = 15;

export type Tentativa = { falhas: number; ultimaFalhaEm: Date; bloqueadoAte: Date | null };

const MIN = 60_000;

/** Minutos que faltam para o bloqueio acabar (0 se não está bloqueado). */
export function minutosDeBloqueio(t: Pick<Tentativa, "bloqueadoAte"> | null, agora = new Date()): number {
  if (!t?.bloqueadoAte || t.bloqueadoAte <= agora) return 0;
  return Math.ceil((t.bloqueadoAte.getTime() - agora.getTime()) / MIN);
}

/** O que guardar depois de mais uma senha errada. */
export function registrarFalha(anterior: Tentativa | null, agora = new Date()): Tentativa {
  const aindaConta = anterior && agora.getTime() - anterior.ultimaFalhaEm.getTime() <= JANELA_DE_FALHAS_EM_MINUTOS * MIN;
  const falhas = (aindaConta ? anterior.falhas : 0) + 1;
  if (falhas >= MAX_FALHAS_DE_LOGIN) {
    return { falhas: 0, ultimaFalhaEm: agora, bloqueadoAte: new Date(agora.getTime() + MINUTOS_DE_BLOQUEIO * MIN) };
  }
  return { falhas, ultimaFalhaEm: agora, bloqueadoAte: null };
}

/** Código secreto e impossível de adivinhar, para os links enviados por e-mail. */
export function gerarCodigoSecreto(): string {
  return randomBytes(32).toString("base64url");
}

/** O banco guarda só o resumo do código: quem lê o banco não consegue usar os links. */
export function resumoDoCodigo(codigo: string): string {
  return createHash("sha256").update(codigo).digest("hex");
}

/** O e-mail vale como confirmado? Sem servidor de e-mail configurado não há como confirmar, então ninguém fica travado. */
export function emailValidado(emailConfirmadoEm: Date | null | undefined, emailConfigurado: boolean): boolean {
  return !!emailConfirmadoEm || !emailConfigurado;
}
