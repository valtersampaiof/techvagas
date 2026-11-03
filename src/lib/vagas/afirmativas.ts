import { normalizar } from "../extrair-habilidades";

/** Grupos que uma vaga afirmativa pode priorizar. "outra" é a vaga que se diz afirmativa sem dizer para quem. */
export const GRUPOS_AFIRMATIVOS = ["pcd", "mulheres", "negros", "lgbt", "outra"] as const;
export type GrupoAfirmativo = (typeof GRUPOS_AFIRMATIVOS)[number];

export const ROTULO_AFIRMATIVA: Record<GrupoAfirmativo, string> = {
  pcd: "Pessoas com deficiência (PCD)",
  mulheres: "Mulheres",
  negros: "Pessoas negras",
  lgbt: "Pessoas LGBTQIA+",
  outra: "Afirmativa (grupo não informado)",
};

export function ehGrupoAfirmativo(valor: unknown): valor is GrupoAfirmativo {
  return typeof valor === "string" && (GRUPOS_AFIRMATIVOS as readonly string[]).includes(valor);
}

const MARCA = String.raw`(?:afirmativ[ao]s?|exclusiv[ao]s?|reservad[ao]s?|destinad[ao]s? (?:exclusivamente )?(?:a|as|para))`;
const FOLGA = String.raw`[^.;:!?\n]{0,40}`;
const CONTEXTO_DE_VAGA = String.raw`(?:vagas?|processo seletivo|selecao|programa|oportunidades?)`;

const GRUPOS: Record<Exclude<GrupoAfirmativo, "outra">, string> = {
  pcd: String.raw`(?:pessoas? com defici[eê]ncia|pcds?\b|deficientes)`,
  mulheres: String.raw`\bmulheres\b`,
  negros: String.raw`(?:pessoas? )?(?:negr[ao]s?|pret[ao]s?|pard[ao]s?)\b`,
  lgbt: String.raw`lgbt`,
};

/** No TÍTULO, "PCD" sozinho ou uma marca perto do grupo bastam. */
function padroesDoTitulo(grupo: Exclude<GrupoAfirmativo, "outra">): RegExp[] {
  const g = GRUPOS[grupo];
  return [new RegExp(`${MARCA}${FOLGA}${g}`), new RegExp(`${g}${FOLGA}${MARCA}`), ...(grupo === "pcd" ? [/\bpcd\b/] : [])];
}

/**
 * No TEXTO é preciso mais: a marca tem que falar DA VAGA ("vaga afirmativa para mulheres"). "Espaço exclusivo para mulheres"
 * (um benefício) e "todas as nossas vagas são abertas a PCD" (declaração geral) não valem.
 */
function padroesDoTexto(grupo: Exclude<GrupoAfirmativo, "outra">): RegExp[] {
  const g = GRUPOS[grupo];
  return [new RegExp(`${CONTEXTO_DE_VAGA}\\s+(?:[\\p{L}]+\\s+){0,2}${MARCA}${FOLGA}${g}`, "u")];
}

/** Frases que NÃO tornam a vaga afirmativa: declaração geral da empresa ("além das vagas afirmativas, todas as vagas aceitam PCD"). */
const DECLARACAO_GERAL = /(?:alem das vagas afirmativas|todas as vagas (?:sao|tambem sao|da [\p{L}\d ]{2,30} sao)|inclusivas? para todos)/u;

/**
 * Grupos que a vaga prioriza, lidos do título e do começo do anúncio (é onde as empresas avisam; mais adiante, "mulheres" ou
 * "pessoas negras" costuma ser só declaração de diversidade, e isso não é vaga afirmativa). Devolve ",pcd,mulheres," (com
 * vírgulas nas pontas, para a busca no banco) ou "".
 */
export function detectarAfirmativas(titulo: string, descricao: string): string {
  const doTitulo = normalizar(titulo);
  const doTexto = normalizar(descricao.slice(0, 900))
    // Tira as declarações gerais antes de procurar.
    .split(/(?<=[.;!?])\s+|\n/)
    .filter((frase) => !DECLARACAO_GERAL.test(frase))
    .join(". ");
  const achados: GrupoAfirmativo[] = [];
  for (const grupo of Object.keys(GRUPOS) as Exclude<GrupoAfirmativo, "outra">[]) {
    if (padroesDoTitulo(grupo).some((p) => p.test(doTitulo)) || padroesDoTexto(grupo).some((p) => p.test(doTexto))) achados.push(grupo);
  }
  if (achados.length === 0 && /vagas? afirmativas?|afirmativa para/.test(`${doTitulo} ${doTexto}`)) achados.push("outra");
  return achados.length > 0 ? `,${achados.join(",")},` : "";
}
