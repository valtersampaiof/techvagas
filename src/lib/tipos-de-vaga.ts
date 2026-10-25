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

/**
 * Regimes do filtro, que vem ANTES do nível: CLT, PJ e estágio têm leis e carreiras diferentes.
 * "clt" e "pj" também pegam as vagas que aceitam os dois.
 */
export const FILTROS_DE_CONTRATO = ["clt", "pj", "estagio"] as const;
export type FiltroDeContrato = (typeof FILTROS_DE_CONTRATO)[number];

export function ehFiltroDeContrato(valor: unknown): valor is (typeof FILTROS_DE_CONTRATO)[number] {
  return typeof valor === "string" && (FILTROS_DE_CONTRATO as readonly string[]).includes(valor);
}

/** Contratos que o filtro escolhido deixa passar. */
export function contratosDoFiltro(filtro: string): Contrato[] {
  return filtro === "clt" ? ["clt", "clt_pj"] : filtro === "pj" ? ["pj", "clt_pj"] : filtro === "estagio" ? ["estagio"] : [];
}

/**
 * Níveis que fazem sentido em cada regime. Estágio não tem nível (é o próprio regime); trainee é programa de contratação
 * CLT; PJ vai de júnior a liderança. Sem regime escolhido, valem todos.
 */
export const NIVEIS_DO_REGIME: Record<FiltroDeContrato | "", readonly TipoDeVaga[]> = {
  "": ["trainee", "junior", "pleno", "senior", "lideranca", "indefinido"],
  clt: ["trainee", "junior", "pleno", "senior", "lideranca", "indefinido"],
  pj: ["junior", "pleno", "senior", "lideranca", "indefinido"],
  estagio: [],
};

/**
 * Deixa regime e nível coerentes: "estágio" é um regime (o nível antigo "estagio" vira o regime estágio) e o nível que
 * não existe no regime escolhido é descartado. Usado ao ler a URL, o alerta e o formulário.
 */
export function ajustarRegime(contrato: string, tipo: string): { contrato: FiltroDeContrato | ""; tipo: TipoDeVaga | "" } {
  let regime: FiltroDeContrato | "" = ehFiltroDeContrato(contrato) ? contrato : "";
  let nivel: TipoDeVaga | "" = ehTipoDeVaga(tipo) ? tipo : "";
  if (nivel === "estagio") {
    regime = regime || "estagio";
    nivel = "";
  }
  if (nivel && !(NIVEIS_DO_REGIME[regime] as readonly string[]).includes(nivel)) nivel = "";
  return { contrato: regime, tipo: nivel };
}
