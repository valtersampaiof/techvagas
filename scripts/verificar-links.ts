import { CURSOS } from "../src/lib/dados/cursos";
import { classificarResposta, emParalelo, type SituacaoDoLink } from "../src/lib/verificar-links";

/**
 * Confere se os links dos cursos ainda abrem. Não muda nada: só mostra o que está quebrado.
 * Termina com erro (código 1) se algum link estiver quebrado, para o agendamento do GitHub avisar.
 */
const TEMPO_LIMITE_MS = 20_000;
const AGENTE = "techvagas-verificador-de-links";

async function conferir(link: string): Promise<{ link: string; situacao: SituacaoDoLink; detalhe: string }> {
  const tentar = async (metodo: "HEAD" | "GET") => {
    const r = await fetch(link, { method: metodo, redirect: "follow", signal: AbortSignal.timeout(TEMPO_LIMITE_MS), headers: { "user-agent": AGENTE } });
    await r.body?.cancel();
    return r.status;
  };
  try {
    let status = await tentar("HEAD");
    // Alguns servidores recusam HEAD; o GET diz a verdade.
    if (status >= 400) status = await tentar("GET");
    return { link, situacao: classificarResposta({ status }), detalhe: `HTTP ${status}` };
  } catch (e) {
    const causa = e instanceof Error ? `${e.message} ${(e.cause as Error | undefined)?.message ?? ""}`.trim() : String(e);
    return { link, situacao: classificarResposta({ falha: causa }), detalhe: causa.slice(0, 100) };
  }
}

async function main() {
  const links = [...new Set(CURSOS.map((c) => c.link))];
  console.log(`Conferindo ${links.length} endereços de ${CURSOS.length} cursos...\n`);
  const resultados = await emParalelo(links, 8, conferir);

  const por = (s: SituacaoDoLink) => resultados.filter((r) => r.situacao === s);
  const tituloDe = (link: string) => CURSOS.filter((c) => c.link === link).map((c) => `${c.instituicao}: ${c.titulo}`).join("; ");
  for (const [rotulo, situacao] of [["QUEBRADOS", "quebrado"], ["FALHA PASSAGEIRA (tente de novo)", "erro"], ["BLOQUEIAM PROGRAMAS (confira na mão)", "bloqueado"]] as const) {
    const lista = por(situacao);
    if (lista.length === 0) continue;
    console.log(`${rotulo}: ${lista.length}`);
    for (const r of lista) console.log(`  - ${r.link} (${r.detalhe})\n    ${tituloDe(r.link)}`);
    console.log();
  }
  console.log(`Resumo: ${por("ok").length} abrem · ${por("quebrado").length} quebrados · ${por("erro").length} com falha passageira · ${por("bloqueado").length} bloqueiam programas`);

  // Se a maioria dos endereços "não existe", o problema é a rede de onde o programa roda (bloqueio, sem internet), não os cursos.
  const semDns = resultados.filter((r) => /ENOTFOUND|EAI_AGAIN/.test(r.detalhe)).length;
  if (semDns / resultados.length > 0.5) {
    console.log("\nATENÇÃO: a maioria dos endereços não pôde nem ser encontrada. A rede deste computador parece bloqueada; este resultado NÃO é confiável. Rode de novo em outra rede.");
    return;
  }
  if (por("quebrado").length > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
