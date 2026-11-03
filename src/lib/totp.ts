import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { resumoDoCodigo } from "./seguranca";

/**
 * Códigos de uso único de aplicativos como o Google Authenticator (TOTP, RFC 6238): a cada 30 segundos o aplicativo e o site
 * calculam o mesmo número de 6 dígitos a partir de um segredo que só os dois conhecem.
 */

const ALFABETO_BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
export const PERIODO_EM_SEGUNDOS = 30;
export const DIGITOS = 6;

export function base32Codificar(bytes: Uint8Array): string {
  let bits = 0;
  let valor = 0;
  let saida = "";
  for (const byte of bytes) {
    valor = (valor << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      saida += ALFABETO_BASE32[(valor >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) saida += ALFABETO_BASE32[(valor << (5 - bits)) & 31];
  return saida;
}

export function base32Decodificar(texto: string): Buffer {
  let bits = 0;
  let valor = 0;
  const bytes: number[] = [];
  for (const letra of texto.toUpperCase().replace(/[\s=-]/g, "")) {
    const i = ALFABETO_BASE32.indexOf(letra);
    if (i === -1) throw new Error("Segredo inválido.");
    valor = (valor << 5) | i;
    bits += 5;
    if (bits >= 8) {
      bytes.push((valor >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/** Segredo novo e imprevisível (20 bytes = 160 bits), em base32, que é o que os aplicativos esperam. */
export function gerarSegredoTotp(): string {
  return base32Codificar(randomBytes(20));
}

/** O número de 6 dígitos que o aplicativo mostra durante o "passo" (janela de 30 segundos) dado. */
export function codigoTotp(segredo: string, passo: number): string {
  const contador = Buffer.alloc(8);
  contador.writeBigUInt64BE(BigInt(passo));
  const hmac = createHmac("sha1", base32Decodificar(segredo)).update(contador).digest();
  const deslocamento = hmac[hmac.length - 1] & 15;
  const numero = ((hmac[deslocamento] & 127) << 24) | (hmac[deslocamento + 1] << 16) | (hmac[deslocamento + 2] << 8) | hmac[deslocamento + 3];
  return String(numero % 10 ** DIGITOS).padStart(DIGITOS, "0");
}

export const passoDoMomento = (agora: Date = new Date()) => Math.floor(agora.getTime() / 1000 / PERIODO_EM_SEGUNDOS);

const iguais = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/**
 * O código digitado confere? Aceita o passo atual e um para cada lado (relógios do celular e do servidor nunca estão
 * exatamente iguais). Devolve o passo que bateu, ou null. Passos já usados (`ultimoPasso`) são recusados: o mesmo código não
 * vale duas vezes, nem para quem o espiou por cima do ombro.
 */
export function verificarTotp(segredo: string, digitado: string, opcoes: { agora?: Date; janela?: number; ultimoPasso?: number | null } = {}): number | null {
  const codigo = digitado.replace(/\s/g, "");
  if (!/^\d{6}$/.test(codigo)) return null;
  const { agora = new Date(), janela = 1, ultimoPasso = null } = opcoes;
  const atual = passoDoMomento(agora);
  let achado: number | null = null;
  // Confere todos os passos (sem parar no primeiro) para o tempo de resposta não dar pistas.
  for (let passo = atual - janela; passo <= atual + janela; passo++) {
    if (iguais(codigoTotp(segredo, passo), codigo) && (ultimoPasso === null || passo > ultimoPasso)) achado = passo;
  }
  return achado;
}

/** O endereço que o QR code carrega: o aplicativo lê e já cadastra a conta. */
export function urlOtpauth(opcoes: { email: string; segredo: string; emissor?: string }): string {
  const emissor = opcoes.emissor ?? "TechVagas";
  const rotulo = encodeURIComponent(`${emissor}:${opcoes.email}`);
  return `otpauth://totp/${rotulo}?secret=${opcoes.segredo}&issuer=${encodeURIComponent(emissor)}&algorithm=SHA1&digits=${DIGITOS}&period=${PERIODO_EM_SEGUNDOS}`;
}

// ---- O segredo é guardado cifrado: quem lê o banco de dados não consegue gerar os códigos. ----

function chaveDeCifra(): Buffer {
  const base = process.env.SEGREDO_SESSAO;
  if (!base && process.env.NODE_ENV === "production") throw new Error("Defina SEGREDO_SESSAO no ambiente de produção.");
  return createHash("sha256").update(`${base ?? "segredo-apenas-para-desenvolvimento"}|totp`).digest();
}

export function cifrarSegredo(segredo: string): string {
  const iv = randomBytes(12);
  const cifra = createCipheriv("aes-256-gcm", chaveDeCifra(), iv);
  const dados = Buffer.concat([cifra.update(segredo, "utf8"), cifra.final()]);
  return Buffer.concat([iv, cifra.getAuthTag(), dados]).toString("base64");
}

/** Devolve o segredo, ou null se o texto foi adulterado ou a chave (SEGREDO_SESSAO) mudou. */
export function decifrarSegredo(guardado: string): string | null {
  try {
    const bruto = Buffer.from(guardado, "base64");
    const decifra = createDecipheriv("aes-256-gcm", chaveDeCifra(), bruto.subarray(0, 12));
    decifra.setAuthTag(bruto.subarray(12, 28));
    return Buffer.concat([decifra.update(bruto.subarray(28)), decifra.final()]).toString("utf8");
  } catch {
    return null;
  }
}

// ---- Códigos de recuperação: para quem perdeu o celular. Cada um vale uma vez. ----

/** Sem letras e números que se confundem (0/O, 1/I/L). */
const ALFABETO_DE_RECUPERACAO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const QUANTIDADE_DE_CODIGOS_DE_RECUPERACAO = 8;

export function gerarCodigosDeRecuperacao(quantidade = QUANTIDADE_DE_CODIGOS_DE_RECUPERACAO): string[] {
  const um = () => Array.from({ length: 10 }, () => ALFABETO_DE_RECUPERACAO[randomInt(ALFABETO_DE_RECUPERACAO.length)]).join("");
  return Array.from({ length: quantidade }, () => {
    const c = um();
    return `${c.slice(0, 5)}-${c.slice(5)}`;
  });
}

/** "abcde 12345" e "ABCDE-12345" são o mesmo código. */
export const normalizarCodigoDeRecuperacao = (texto: string) => texto.toUpperCase().replace(/[^A-Z0-9]/g, "");
export const resumoDoCodigoDeRecuperacao = (texto: string) => resumoDoCodigo(normalizarCodigoDeRecuperacao(texto));
export const pareceCodigoDeRecuperacao = (texto: string) => normalizarCodigoDeRecuperacao(texto).length === 10 && !/^\d{6}$/.test(texto.replace(/\s/g, ""));
