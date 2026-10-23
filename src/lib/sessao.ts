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

export async function criarSessao(usuarioId: number) {
  const expira = new Date(Date.now() + DURACAO_EM_DIAS * 24 * 60 * 60 * 1000);
  const token = await new SignJWT({ usuarioId })
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

export async function encerrarSessao() {
  (await cookies()).delete(NOME_DO_COOKIE);
}

async function lerUsuarioId(): Promise<number | null> {
  const token = (await cookies()).get(NOME_DO_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, segredo());
    return typeof payload.usuarioId === "number" ? payload.usuarioId : null;
  } catch {
    return null;
  }
}

/** Usuário logado (ou null), com as habilidades. Consulta feita uma vez por requisição. */
export const usuarioAtual = cache(async () => {
  const id = await lerUsuarioId();
  if (id === null) return null;
  return db.usuario.findUnique({
    where: { id },
    select: {
      id: true,
      nome: true,
      email: true,
      curso: true,
      cidade: true,
      habilidades: { select: { nivel: true, habilidade: { select: { id: true, slug: true, nome: true } } } },
    },
  });
});
