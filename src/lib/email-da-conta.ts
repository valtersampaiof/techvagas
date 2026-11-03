import "server-only";
import { configuracaoDeEmail, criarEnviadorSmtp, type MensagemDeEmail } from "./email";

/**
 * Manda um e-mail da conta (confirmar e-mail, redefinir senha). Devolve false se o e-mail não está configurado ou se o
 * envio falhou: quem chama decide o que dizer à pessoa. Em desenvolvimento, sem SMTP, o link aparece no terminal.
 */
export async function enviarEmailDaConta(mensagem: MensagemDeEmail): Promise<boolean> {
  const config = configuracaoDeEmail();
  if (!config) {
    if (process.env.NODE_ENV !== "production") console.log(`[e-mail simulado] ${mensagem.assunto} → ${mensagem.para}\n${mensagem.texto}`);
    return false;
  }
  try {
    await criarEnviadorSmtp(config)(mensagem);
    return true;
  } catch (e) {
    console.error("Falha ao enviar e-mail da conta:", e instanceof Error ? e.message : e);
    return false;
  }
}
