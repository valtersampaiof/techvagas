/** Nível da vaga. "indefinido" é a vaga em que nem o cargo nem o texto dizem o nível. */
export const TIPOS_DE_VAGA = ["estagio", "trainee", "junior", "pleno", "senior", "lideranca", "indefinido"] as const;
export type TipoDeVaga = (typeof TIPOS_DE_VAGA)[number];

export function ehTipoDeVaga(valor: unknown): valor is TipoDeVaga {
  return typeof valor === "string" && (TIPOS_DE_VAGA as readonly string[]).includes(valor);
}

/**
 * Como a pessoa é contratada. "clt_pj" é a vaga que aceita os dois. Vazio quando o anúncio não diz.
 * Estágio tem o próprio valor para o filtro de contratação não misturá-lo com CLT.
 */
export const CONTRATOS = ["clt", "pj", "clt_pj", "estagio"] as const;
export type Contrato = (typeof CONTRATOS)[number] | "";

/** Valores aceitos no filtro: "clt" e "pj" também pegam as vagas que aceitam os dois. */
export const FILTROS_DE_CONTRATO = ["clt", "pj"] as const;

export function ehFiltroDeContrato(valor: unknown): valor is (typeof FILTROS_DE_CONTRATO)[number] {
  return typeof valor === "string" && (FILTROS_DE_CONTRATO as readonly string[]).includes(valor);
}

/** Contratos que o filtro escolhido deixa passar. */
export function contratosDoFiltro(filtro: string): Contrato[] {
  return filtro === "clt" ? ["clt", "clt_pj"] : filtro === "pj" ? ["pj", "clt_pj"] : [];
}
