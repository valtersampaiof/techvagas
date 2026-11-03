import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { SignJWT, jwtVerify } from "jose";
import { db } from "./db";

const NOME_DO_COOKIE = "sessao";
const DURACAO_EM_DIAS = 14;

function segredo() {
  const valor = process.env.SEGREDO_SESSAO;
  if (!valor && process.env.NODE_ENV === "production") {
    throw new Error("Defina SEGREDO_SESSAO no ambiente de produção.");
  }
  return new TextEncoder().encode(valor ?? "segredo-apenas-para-desenvolvimento");
}

export async function criarSessao(usuarioId: number, versao = 0) {
  const expira = new Date(Date.now() + DURACAO_EM_DIAS * 24 * 60 * 60 * 1000);
  const token = await new SignJWT({ usuarioId, v: versao })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expira)
    .sign(segredo());

  (await cookies()).set(NOME_DO_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expira,
  });
}

// Depois de acertar a senha, quem tem verificação em dois passos ganha só uma "licença" curta: ela serve apenas para chegar
// à tela do código e não dá acesso a nada. A sessão de verdade só nasce depois do código.
const COOKIE_PENDENTE = "sessao-2fa";
const MINUTOS_PENDENTE = 5;

export async function criarSessaoPendente(usuarioId: number, versao: number) {
  const expira = new Date(Date.now() + MINUTOS_PENDENTE * 60_000);
  const token = await new SignJWT({ usuarioId, v: versao, fase: "2fa" }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(expira).sign(segredo());
  (await cookies()).set(COOKIE_PENDENTE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires: expira });
}

export async function lerSessaoPendente(): Promise<{ usuarioId: number; versao: number } | null> {
  const token = (await cookies()).get(COOKIE_PENDENTE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, segredo());
    if (payload.fase !== "2fa" || typeof payload.usuarioId !== "number") return null;
    return { usuarioId: payload.usuarioId, versao: typeof payload.v === "number" ? payload.v : 0 };
  } catch {
    return null;
  }
}

export async function encerrarSessaoPendente() {
  (await cookies()).delete(COOKIE_PENDENTE);
}

export async function encerrarSessao() {
  (await cookies()).delete(NOME_DO_COOKIE);
}

async function lerSessao(): Promise<{ usuarioId: number; versao: number } | null> {
  const token = (await cookies()).get(NOME_DO_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, segredo());
    // Uma "licença" pendente de dois passos nunca vale como sessão.
    if (typeof payload.usuarioId !== "number" || payload.fase === "2fa") return null;
    return { usuarioId: payload.usuarioId, versao: typeof payload.v === "number" ? payload.v : 0 };
  } catch {
    return null;
  }
}

/** Usuário logado (ou null), com as habilidades. Consulta feita uma vez por requisição. */
export const usuarioAtual = cache(async () => {
  const sessao = await lerSessao();
  if (sessao === null) return null;
  const usuario = await db.usuario.findUnique({
    where: { id: sessao.usuarioId },
    select: {
      id: true,
      nome: true,
      email: true,
      curso: true,
      cidade: true,
      emailConfirmadoEm: true,
      totpAtivoEm: true,
      sessaoVersao: true,
      habilidades: { select: { nivel: true, habilidade: { select: { id: true, slug: true, nome: true } } } },
    },
  });
  // Depois de redefinir a senha, as sessões abertas antes (por exemplo, em outro aparelho) deixam de valer.
  if (!usuario || usuario.sessaoVersao !== sessao.versao) return null;
  return usuario;
});
