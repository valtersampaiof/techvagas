"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { EstadoDoFormulario } from "@/app/acoes";
import { consumirCodigoDeConta, criarCodigoDeConta, limparFalhasDeLogin } from "@/lib/contas";
import { emailDeRedefinicao } from "@/lib/contas-email";
import { db } from "@/lib/db";
import { emailConfigurado, enderecoDoSite } from "@/lib/email";
import { enviarEmailDaConta } from "@/lib/email-da-conta";
import { enviarConfirmacao } from "@/lib/enviar-confirmacao";
import { encerrarSessao, usuarioAtual } from "@/lib/sessao";

const MENSAGEM_PADRAO = "Se existir uma conta com este e-mail, enviamos um link para criar uma nova senha. Confira também a caixa de spam.";

/** "Esqueci minha senha": manda um link de uso único. A resposta é a mesma exista ou não a conta. */
export async function pedirRedefinicao(_: EstadoDoFormulario, formData: FormData): Promise<EstadoDoFormulario> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!z.string().email().safeParse(email).success) return { erro: "Informe um e-mail válido.", campos: { email } };
  if (!emailConfigurado()) {
    return { erro: "O envio de e-mails não está ativo neste site no momento, então não conseguimos mandar o link.", campos: { email } };
  }

  const usuario = await db.usuario.findUnique({ where: { email } });
  if (usuario) {
    const codigo = await criarCodigoDeConta(db, usuario.id, "senha");
    if (codigo) {
      await enviarEmailDaConta(emailDeRedefinicao({ nome: usuario.nome, para: usuario.email, link: `${enderecoDoSite()}/redefinir-senha/${codigo}` }));
    }
  }
  return { ok: MENSAGEM_PADRAO };
}

const esquemaNovaSenha = z
  .object({
    codigo: z.string().min(1),
    senha: z.string().min(8, "A senha precisa de pelo menos 8 caracteres."),
    confirmar: z.string(),
  })
  .refine((d) => d.senha === d.confirmar, { message: "As duas senhas precisam ser iguais.", path: ["confirmar"] });

/** Cria a nova senha com o link recebido por e-mail. Encerra as sessões abertas e desbloqueia o login. */
export async function redefinirSenha(_: EstadoDoFormulario, formData: FormData): Promise<EstadoDoFormulario> {
  const dados = esquemaNovaSenha.safeParse(Object.fromEntries(formData));
  if (!dados.success) return { erro: dados.error.issues[0].message };

  const usuarioId = await consumirCodigoDeConta(db, "senha", dados.data.codigo);
  if (usuarioId === null) return { erro: "Este link não vale mais. Peça um novo em “Esqueci minha senha”." };

  const usuario = await db.usuario.update({
    where: { id: usuarioId },
    data: {
      senhaHash: await bcrypt.hash(dados.data.senha, 10),
      sessaoVersao: { increment: 1 },
      // Quem recebeu o link na caixa de entrada provou que o e-mail é dela.
      emailConfirmadoEm: new Date(),
    },
  });
  await limparFalhasDeLogin(db, usuario.email);
  redirect("/entrar?redefinida=1");
}

export async function reenviarConfirmacao(): Promise<EstadoDoFormulario> {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/entrar");
  if (usuario.emailConfirmadoEm) return { ok: "Seu e-mail já está confirmado." };
  const r = await enviarConfirmacao(usuario);
  if (r === "enviado") return { ok: `Enviamos um novo link para ${usuario.email}. Confira também a caixa de spam.` };
  if (r === "espere") return { erro: "Você acabou de pedir um link. Espere um minuto antes de pedir outro." };
  if (r === "indisponivel") return { erro: "O envio de e-mails não está ativo neste site no momento." };
  return { erro: "Não conseguimos enviar o e-mail agora. Tente de novo em alguns minutos." };
}

/** Apaga a conta e tudo o que está ligado a ela (perfil, vagas salvas, alertas). Pede a senha para confirmar. */
export async function excluirConta(_: EstadoDoFormulario, formData: FormData): Promise<EstadoDoFormulario> {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/entrar");

  const registro = await db.usuario.findUnique({ where: { id: usuario.id }, select: { senhaHash: true, email: true } });
  const senha = String(formData.get("senha") ?? "");
  if (!registro || !(await bcrypt.compare(senha, registro.senhaHash))) return { erro: "Senha incorreta." };

  await db.usuario.delete({ where: { id: usuario.id } });
  await limparFalhasDeLogin(db, registro.email);
  await encerrarSessao();
  revalidatePath("/", "layout");
  redirect("/?conta=excluida");
}
