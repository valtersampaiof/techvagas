import nodemailer from "nodemailer";

export type ConfiguracaoDeEmail = {
  host: string;
  port: number;
  secure: boolean;
  /** Para servidores de teste locais (MailHog etc.) que não falam TLS. */
  ignorarTls: boolean;
  usuario?: string;
  senha?: string;
  /** Remetente, ex.: "TechVagas <avisos@seudominio.com>". */
  de: string;
};

export type MensagemDeEmail = {
  para: string;
  assunto: string;
  texto: string;
  html: string;
  /** Cabeçalhos extras, ex.: List-Unsubscribe. */
  cabecalhos?: Record<string, string>;
};

export type Enviador = (mensagem: MensagemDeEmail) => Promise<void>;

type Ambiente = Record<string, string | undefined>;

/**
 * Lê a configuração de e-mail das variáveis de ambiente. Devolve null se o servidor SMTP não foi configurado
 * (nesse caso o site funciona normalmente; só os alertas por e-mail não são enviados).
 */
export function configuracaoDeEmail(env: Ambiente = process.env): ConfiguracaoDeEmail | null {
  const host = env.SMTP_HOST?.trim();
  if (!host) return null;

  const port = Number(env.SMTP_PORT) || 587;
  const secure = env.SMTP_SECURE ? env.SMTP_SECURE.toLowerCase() === "true" : port === 465;
  const usuario = env.SMTP_USER?.trim() || undefined;
  const de = env.EMAIL_DE?.trim() || (usuario?.includes("@") ? `TechVagas <${usuario}>` : "");
  if (!de) return null; // sem remetente, os provedores recusam a mensagem

  return {
    host,
    port,
    secure,
    ignorarTls: env.SMTP_IGNORAR_TLS?.toLowerCase() === "true",
    usuario,
    senha: env.SMTP_PASS || undefined,
    de,
  };
}

export const emailConfigurado = (env: Ambiente = process.env) => configuracaoDeEmail(env) !== null;

export function criarEnviadorSmtp(config: ConfiguracaoDeEmail): Enviador {
  const transporte = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    ignoreTLS: config.ignorarTls,
    auth: config.usuario ? { user: config.usuario, pass: config.senha } : undefined,
    connectionTimeout: 15_000,
    socketTimeout: 30_000,
  });
  return async (m) => {
    await transporte.sendMail({ from: config.de, to: m.para, subject: m.assunto, text: m.texto, html: m.html, headers: m.cabecalhos });
  };
}

/** Endereço público do site, usado nos links dos e-mails. */
export function enderecoDoSite(env: Ambiente = process.env): string {
  return (env.SITE_URL?.trim() || "http://localhost:3000").replace(/\/+$/, "");
}
