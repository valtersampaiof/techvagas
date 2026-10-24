export const ROTULO_TIPO: Record<string, string> = {
  estagio: "Estágio",
  trainee: "Trainee",
  junior: "Júnior",
};

export const ROTULO_MODALIDADE: Record<string, string> = {
  presencial: "Presencial",
  hibrido: "Híbrido",
  remoto: "Remoto",
};

export const ROTULO_ORIGEM: Record<string, string> = {
  exemplo: "Vaga de exemplo",
  adzuna: "Adzuna",
  jooble: "Jooble",
  gupy: "Gupy",
  remotive: "Remotive",
  github: "Comunidades no GitHub",
};

/** "Recife, PE" quando a localização foi interpretada; senão, o texto original da fonte. */
export function rotuloDoLocal(vaga: { cidade: string; cidadeNome: string; uf: string }): string {
  if (vaga.cidadeNome) return vaga.uf ? `${vaga.cidadeNome}, ${vaga.uf}` : vaga.cidadeNome;
  return vaga.cidade;
}
