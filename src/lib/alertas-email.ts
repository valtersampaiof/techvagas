import { parametrosDaLista, type FiltrosDoAlerta } from "./alertas";
import type { MensagemDeEmail } from "./email";
import type { VagaComRequisitos } from "./fonte-de-vagas";
import { formatarPublicacao, formatarSalario } from "./formatar";
import { rotuloDoLocal } from "./rotulos";

export const MAX_VAGAS_NO_EMAIL = 15;

/** Escapa o texto que vem de fontes externas (títulos, empresas...) antes de pôr num e-mail em HTML. */
export function escaparHtml(texto: string): string {
  return texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

type Entrada = {
  nomeDaPessoa: string;
  para: string;
  alerta: { nome: string; token: string } & FiltrosDoAlerta;
  /** Vagas novas, da mais recente para a mais antiga. */
  vagas: (VagaComRequisitos & { compatibilidade?: number | null })[];
  enderecoDoSite: string;
  agora?: Date;
};

const plural = (n: number, um: string, varios: string) => (n === 1 ? um : varios);

export function montarEmailDoAlerta(e: Entrada): MensagemDeEmail {
  const total = e.vagas.length;
  const mostradas = e.vagas.slice(0, MAX_VAGAS_NO_EMAIL);
  const restantes = total - mostradas.length;
  const site = e.enderecoDoSite;
  const primeiroNome = e.nomeDaPessoa.trim().split(/\s+/)[0] || "";

  const consulta = parametrosDaLista(e.alerta);
  const urlDaLista = `${site}/vagas${consulta ? `?${consulta}` : ""}`;
  const urlParaCancelar = `${site}/alertas/cancelar?token=${encodeURIComponent(e.alerta.token)}`;
  const urlDosAlertas = `${site}/alertas`;

  const assunto = `TechVagas: ${total} ${plural(total, "vaga nova", "vagas novas")} · ${e.alerta.nome}`;

  const linhas = mostradas.map((v) => {
    const detalhes = [
      formatarSalario(v) && `💰 ${formatarSalario(v)}`,
      v.compatibilidade != null && `Compatibilidade com o seu perfil: ${v.compatibilidade}%`,
      formatarPublicacao(v.publicadaEm, e.agora),
    ].filter((x): x is string => !!x);
    return { titulo: v.titulo, onde: `${v.empresa} · ${rotuloDoLocal(v)}`, detalhes, url: `${site}/vagas/${v.id}` };
  });

  const texto = [
    `Olá${primeiroNome ? `, ${primeiroNome}` : ""}!`,
    "",
    `Encontramos ${total} ${plural(total, "vaga nova", "vagas novas")} para o seu alerta "${e.alerta.nome}":`,
    "",
    ...linhas.flatMap((l, i) => [`${i + 1}. ${l.titulo}`, `   ${l.onde}`, ...(l.detalhes.length ? [`   ${l.detalhes.join(" · ")}`] : []), `   ${l.url}`, ""]),
    ...(restantes > 0 ? [`... e mais ${restantes} ${plural(restantes, "vaga", "vagas")}.`, ""] : []),
    `Ver todas as vagas deste alerta: ${urlDaLista}`,
    `Gerenciar seus alertas: ${urlDosAlertas}`,
    `Cancelar este alerta: ${urlParaCancelar}`,
    "",
    "Os dados vêm dos anúncios originais e podem ter mudado: confirme na vaga antes de se candidatar.",
  ].join("\n");

  const item = (l: (typeof linhas)[number]) =>
    `<li style="margin:0 0 14px 0">` +
    `<a href="${escaparHtml(l.url)}" style="font-weight:600;color:#4338ca;text-decoration:none">${escaparHtml(l.titulo)}</a><br>` +
    `<span style="color:#475569">${escaparHtml(l.onde)}</span>` +
    (l.detalhes.length ? `<br><span style="color:#475569;font-size:13px">${l.detalhes.map(escaparHtml).join(" · ")}</span>` : "") +
    `</li>`;

  const html =
    `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#0f172a;line-height:1.45">` +
    `<p>Olá${primeiroNome ? `, ${escaparHtml(primeiroNome)}` : ""}!</p>` +
    `<p>Encontramos <strong>${total} ${plural(total, "vaga nova", "vagas novas")}</strong> para o seu alerta <em>${escaparHtml(e.alerta.nome)}</em>:</p>` +
    `<ol style="padding-left:20px">${linhas.map(item).join("")}</ol>` +
    (restantes > 0 ? `<p>… e mais ${restantes} ${plural(restantes, "vaga", "vagas")}.</p>` : "") +
    `<p><a href="${escaparHtml(urlDaLista)}" style="display:inline-block;background:#4f46e5;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Ver todas as vagas deste alerta</a></p>` +
    `<p style="font-size:12px;color:#64748b">Os dados vêm dos anúncios originais e podem ter mudado: confirme na vaga antes de se candidatar.<br>` +
    `<a href="${escaparHtml(urlDosAlertas)}" style="color:#64748b">Gerenciar alertas</a> · ` +
    `<a href="${escaparHtml(urlParaCancelar)}" style="color:#64748b">Cancelar este alerta</a></p></div>`;

  return {
    para: e.para,
    assunto,
    texto,
    html,
    cabecalhos: { "List-Unsubscribe": `<${urlParaCancelar}>` },
  };
}
