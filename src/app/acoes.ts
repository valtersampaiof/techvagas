"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { criarSessao, encerrarSessao, usuarioAtual } from "@/lib/sessao";
import { ehNivel } from "@/lib/niveis";

export type EstadoDoFormulario =
  | {
      erro?: string;
      ok?: string;
      /** Valores digitados, devolvidos para o formulário não apagar o que a pessoa escreveu. */
      campos?: { nome?: string; email?: string };
    }
  | undefined;

const esquemaCadastro = z.object({
  nome: z.string().trim().min(2, "Informe seu nome."),
  email: z.string().trim().toLowerCase().email("E-mail inválido."),
  senha: z.string().min(8, "A senha precisa de pelo menos 8 caracteres."),
});

export async function cadastrar(_: EstadoDoFormulario, formData: FormData): Promise<EstadoDoFormulario> {
  const digitado = {
    nome: String(formData.get("nome") ?? ""),
    email: String(formData.get("email") ?? ""),
  };
  const dados = esquemaCadastro.safeParse(Object.fromEntries(formData));
  if (!dados.success) return { erro: dados.error.issues[0].message, campos: digitado };

  const { nome, email, senha } = dados.data;
  if (await db.usuario.findUnique({ where: { email } })) {
    return { erro: "Já existe uma conta com este e-mail.", campos: digitado };
  }
  const usuario = await db.usuario.create({
    data: { nome, email, senhaHash: await bcrypt.hash(senha, 10) },
  });
  await criarSessao(usuario.id);
  redirect("/perfil");
}

export async function entrar(_: EstadoDoFormulario, formData: FormData): Promise<EstadoDoFormulario> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const senha = String(formData.get("senha") ?? "");

  const usuario = await db.usuario.findUnique({ where: { email } });
  // Mesma mensagem para e-mail inexistente e senha errada.
  if (!usuario || !(await bcrypt.compare(senha, usuario.senhaHash))) {
    return { erro: "E-mail ou senha incorretos.", campos: { email } };
  }
  await criarSessao(usuario.id);
  redirect("/vagas");
}

export async function sair() {
  await encerrarSessao();
  redirect("/");
}

const esquemaHabilidades = z.array(z.object({ slug: z.string(), nivel: z.string() })).max(100);

export async function salvarPerfil(_: EstadoDoFormulario, formData: FormData): Promise<EstadoDoFormulario> {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/entrar");

  let lista;
  try {
    lista = esquemaHabilidades.parse(JSON.parse(String(formData.get("habilidades") ?? "[]")));
  } catch {
    return { erro: "Não foi possível ler as habilidades enviadas." };
  }

  const catalogo = await db.habilidade.findMany({ select: { id: true, slug: true } });
  const idPorSlug = new Map(catalogo.map((h) => [h.slug, h.id]));
  const validas = lista.filter((h) => idPorSlug.has(h.slug));

  await db.$transaction([
    db.habilidadeDoUsuario.deleteMany({ where: { usuarioId: usuario.id } }),
    db.habilidadeDoUsuario.createMany({
      data: validas.map((h) => ({
        usuarioId: usuario.id,
        habilidadeId: idPorSlug.get(h.slug)!,
        nivel: ehNivel(h.nivel) ? h.nivel : "iniciante",
      })),
    }),
    db.usuario.update({
      where: { id: usuario.id },
      data: {
        curso: String(formData.get("curso") ?? "").trim().slice(0, 120),
        cidade: String(formData.get("cidade") ?? "").trim().slice(0, 80),
      },
    }),
  ]);

  revalidatePath("/", "layout");
  return { ok: "Perfil salvo! Agora veja as vagas que combinam com você." };
}
