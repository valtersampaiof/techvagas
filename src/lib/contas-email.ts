import type { MensagemDeEmail } from "./email";
import { escaparHtml } from "./alertas-email";

type Entrada = { nome: string; para: string; link: string };

const primeiroNome = (nome: string) => nome.trim().split(/\s+/)[0] || "";

function moldura(titulo: string, paragrafos: string[], botao: string, link: string, rodape: string): string {
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f5f6fb;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
<div style="max-width:520px;margin:0 auto;padding:24px">
<p style="font-size:18px;font-weight:bold;color:#4f46e5;margin:0 0 16px">TechVagas</p>
<div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:24px">
<h1 style="font-size:20px;margin:0 0 12px">${escaparHtml(titulo)}</h1>
${paragrafos.map((p) => `<p style="font-size:14px;line-height:1.5;margin:0 0 12px">${escaparHtml(p)}</p>`).join("\n")}
<p style="margin:20px 0"><a href="${escaparHtml(link)}" style="background:#4f46e5;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:bold;font-size:14px">${escaparHtml(botao)}</a></p>
<p style="font-size:12px;color:#64748b;margin:0 0 6px">Se o botão não funcionar, copie este endereço no navegador:<br>${escaparHtml(link)}</p>
<p style="font-size:12px;color:#64748b;margin:0">${escaparHtml(rodape)}</p>
</div></div></body></html>`;
}

export function emailDeConfirmacao({ nome, para, link }: Entrada): MensagemDeEmail {
  const ola = `Olá${primeiroNome(nome) ? `, ${primeiroNome(nome)}` : ""}!`;
  const explicacao = "Confirme que este e-mail é seu para receber os alertas de vagas. O link vale por 24 horas.";
  const rodape = "Se você não criou uma conta no TechVagas, ignore esta mensagem.";
  return {
    para,
    assunto: "Confirme seu e-mail no TechVagas",
    texto: [ola, "", explicacao, "", link, "", rodape].join("\n"),
    html: moldura("Confirme seu e-mail", [ola, explicacao], "Confirmar e-mail", link, rodape),
  };
}

export function emailDeRedefinicao({ nome, para, link }: Entrada): MensagemDeEmail {
  const ola = `Olá${primeiroNome(nome) ? `, ${primeiroNome(nome)}` : ""}!`;
  const explicacao = "Recebemos um pedido para criar uma nova senha na sua conta. O link vale por 1 hora e só pode ser usado uma vez.";
  const rodape = "Se não foi você, ignore esta mensagem: sua senha continua a mesma.";
  return {
    para,
    assunto: "Redefinir sua senha no TechVagas",
    texto: [ola, "", explicacao, "", link, "", rodape].join("\n"),
    html: moldura("Redefinir sua senha", [ola, explicacao], "Criar nova senha", link, rodape),
  };
}
