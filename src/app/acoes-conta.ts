"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { EstadoDoFormulario } from "@/app/acoes";
import { bloqueioDoLogin, consumirCodigoDeConta, criarCodigoDeConta, limparFalhasDeLogin, registrarFalhaDeLogin } from "@/lib/contas";
import { emailDeRedefinicao } from "@/lib/contas-email";
import { db } from "@/lib/db";
import { emailConfigurado, enderecoDoSite } from "@/lib/email";
import { enviarEmailDaConta } from "@/lib/email-da-conta";
import { enviarConfirmacao } from "@/lib/enviar-confirmacao";
import QRCode from "qrcode";
import { confirmarAtivacao, desativar, iniciarAtivacao, novosCodigosDeRecuperacao, verificarSegundoPasso } from "@/lib/dois-passos";
import { criarSessao, encerrarSessao, encerrarSessaoPendente, lerSessaoPendente, usuarioAtual } from "@/lib/sessao";

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

// ---------------------------------------------------------------------------------------------------------------
// Verificação em dois passos
// ---------------------------------------------------------------------------------------------------------------

const MENSAGEM_BLOQUEIO = (minutos: number) => `Muitas tentativas erradas. Tente de novo em ${minutos} ${minutos === 1 ? "minuto" : "minutos"}.`;

/** Confere o código do aplicativo (ou de recuperação) com o mesmo limite de tentativas do login. */
async function conferirCodigo(usuarioId: number, codigo: string): Promise<{ ok: true; via: "aplicativo" | "recuperacao"; recuperacaoRestantes: number } | { erro: string }> {
  const chave = `2fa:${usuarioId}`;
  const minutos = await bloqueioDoLogin(db, chave);
  if (minutos > 0) return { erro: MENSAGEM_BLOQUEIO(minutos) };
  const r = await verificarSegundoPasso(db, usuarioId, codigo);
  if (!r.ok) {
    await registrarFalhaDeLogin(db, chave);
    return { erro: "Código incorreto. Digite o código atual do aplicativo ou um código de recuperação." };
  }
  await limparFalhasDeLogin(db, chave);
  return r;
}

/** Segunda tela do login: o código do aplicativo (ou um de recuperação). */
export async function verificarEntrada(_: EstadoDoFormulario, formData: FormData): Promise<EstadoDoFormulario> {
  const pendente = await lerSessaoPendente();
  if (!pendente) redirect("/entrar");

  const r = await conferirCodigo(pendente.usuarioId, String(formData.get("codigo") ?? ""));
  if ("erro" in r) return { erro: r.erro };

  const u = await db.usuario.findUnique({ where: { id: pendente.usuarioId }, select: { sessaoVersao: true } });
  // Se a senha foi trocada nesse meio tempo, a licença antiga não vale.
  if (!u || u.sessaoVersao !== pendente.versao) {
    await encerrarSessaoPendente();
    redirect("/entrar");
  }
  await encerrarSessaoPendente();
  await criarSessao(pendente.usuarioId, u.sessaoVersao);
  redirect(r.via === "recuperacao" ? "/perfil/seguranca?usou=recuperacao" : "/vagas");
}

export type PreparoDosDoisPassos = { segredo: string; qrSvg: string } | { erro: string };

/** Primeiro passo de ligar a proteção: gera o segredo e o QR code. */
export async function prepararDoisPassos(): Promise<PreparoDosDoisPassos> {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/entrar");
  const r = await iniciarAtivacao(db, usuario.id, usuario.email);
  if ("erro" in r) return r;
  const qrSvg = await QRCode.toString(r.url, { type: "svg", margin: 1, width: 220, errorCorrectionLevel: "M" });
  return { segredo: r.segredo, qrSvg };
}

/** Segundo passo: o código que o aplicativo mostrou. Liga a proteção e devolve os códigos de recuperação (só aparecem agora). */
export async function confirmarDoisPassos(codigo: string): Promise<{ codigosDeRecuperacao: string[] } | { erro: string }> {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/entrar");
  const minutos = await bloqueioDoLogin(db, `2fa:${usuario.id}`);
  if (minutos > 0) return { erro: MENSAGEM_BLOQUEIO(minutos) };
  const r = await confirmarAtivacao(db, usuario.id, codigo);
  if ("erro" in r) {
    await registrarFalhaDeLogin(db, `2fa:${usuario.id}`);
    return r;
  }
  await limparFalhasDeLogin(db, `2fa:${usuario.id}`);
  revalidatePath("/perfil/seguranca");
  return r;
}

/** Desliga a proteção: pede a senha E um código (quem só tem a sessão aberta não consegue desligar). */
export async function desativarDoisPassos(senha: string, codigo: string): Promise<{ ok: true } | { erro: string }> {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/entrar");
  const registro = await db.usuario.findUnique({ where: { id: usuario.id }, select: { senhaHash: true } });
  if (!registro || !(await bcrypt.compare(senha, registro.senhaHash))) return { erro: "Senha incorreta." };
  const c = await conferirCodigo(usuario.id, codigo);
  if ("erro" in c) return c;
  await desativar(db, usuario.id);
  revalidatePath("/perfil/seguranca");
  return { ok: true };
}

/** Troca os códigos de recuperação por 8 novos. Pede um código atual do aplicativo. */
export async function gerarNovosCodigos(codigo: string): Promise<{ codigosDeRecuperacao: string[] } | { erro: string }> {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/entrar");
  const c = await conferirCodigo(usuario.id, codigo);
  if ("erro" in c) return c;
  revalidatePath("/perfil/seguranca");
  return { codigosDeRecuperacao: await novosCodigosDeRecuperacao(db, usuario.id) };
}
