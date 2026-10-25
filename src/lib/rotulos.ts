export const ROTULO_TIPO: Record<string, string> = {
  estagio: "Estágio",
  trainee: "Trainee",
  junior: "Júnior",
  pleno: "Pleno",
  senior: "Sênior",
  lideranca: "Liderança",
  indefinido: "Nível não informado",
};

export const ROTULO_CONTRATO: Record<string, string> = {
  clt: "CLT",
  pj: "PJ",
  clt_pj: "CLT ou PJ",
  estagio: "Estágio",
};

export const ROTULO_MODALIDADE: Record<string, string> = {
  presencial: "Presencial",
  hibrido: "Híbrido",
  remoto: "Remoto",
};

/** Vagas que vêm direto da página de carreiras da empresa têm origem `carreira:plataforma:empresa`. */
export const PREFIXO_CARREIRA = "carreira:";

export const ROTULO_ORIGEM: Record<string, string> = {
  exemplo: "Vaga de exemplo",
  adzuna: "Adzuna",
  jooble: "Jooble",
  gupy: "Gupy",
  remotive: "Remotive",
  github: "Comunidades no GitHub",
};

export function rotuloDaOrigem(origem: string): string {
  if (origem.startsWith(PREFIXO_CARREIRA)) return "Site da empresa";
  return ROTULO_ORIGEM[origem] ?? origem;
}

/** "Recife, PE" quando a localização foi interpretada; senão, o texto original da fonte. */
export function rotuloDoLocal(vaga: { cidade: string; cidadeNome: string; uf: string }): string {
  if (vaga.cidadeNome) return vaga.uf ? `${vaga.cidadeNome}, ${vaga.uf}` : vaga.cidadeNome;
  return vaga.cidade;
}
