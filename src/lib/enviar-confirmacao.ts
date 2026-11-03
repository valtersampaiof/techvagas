import "server-only";
import { criarCodigoDeConta } from "./contas";
import { emailDeConfirmacao } from "./contas-email";
import { db } from "./db";
import { emailConfigurado, enderecoDoSite } from "./email";
import { enviarEmailDaConta } from "./email-da-conta";

export type ResultadoDaConfirmacao = "enviado" | "espere" | "indisponivel" | "falhou";

/** Manda o link para confirmar o e-mail da pessoa. */
export async function enviarConfirmacao(usuario: { id: number; nome: string; email: string }): Promise<ResultadoDaConfirmacao> {
  if (!emailConfigurado()) return "indisponivel";
  const codigo = await criarCodigoDeConta(db, usuario.id, "email");
  if (!codigo) return "espere";
  const link = `${enderecoDoSite()}/confirmar-email/${codigo}`;
  const enviado = await enviarEmailDaConta(emailDeConfirmacao({ nome: usuario.nome, para: usuario.email, link }));
  return enviado ? "enviado" : "falhou";
}
