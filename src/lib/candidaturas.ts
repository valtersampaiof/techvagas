/** Etapas de uma vaga que a pessoa acompanha, na ordem em que costumam acontecer. */
export const ETAPAS = ["salva", "candidatei", "entrevista", "proposta", "contratado", "encerrada"] as const;
export type Etapa = (typeof ETAPAS)[number];

export const ROTULO_ETAPA: Record<Etapa, string> = {
  salva: "Salva",
  candidatei: "Me candidatei",
  entrevista: "Em entrevistas",
  proposta: "Recebi proposta",
  contratado: "Contratado(a)",
  encerrada: "Não seguiu",
};

export const COR_DA_ETAPA: Record<Etapa, string> = {
  salva: "bg-slate-100 text-slate-700 ring-slate-200",
  candidatei: "bg-sky-50 text-sky-700 ring-sky-200",
  entrevista: "bg-violet-50 text-violet-700 ring-violet-200",
  proposta: "bg-amber-50 text-amber-800 ring-amber-200",
  contratado: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  encerrada: "bg-rose-50 text-rose-700 ring-rose-200",
};

export const LIMITE_DA_ANOTACAO = 500;

export function ehEtapa(valor: unknown): valor is Etapa {
  return typeof valor === "string" && (ETAPAS as readonly string[]).includes(valor);
}

/** Quantas vagas há em cada etapa (todas as etapas aparecem, mesmo com zero). */
export function contarPorEtapa(linhas: { etapa: string }[]): Record<Etapa, number> {
  const contagem = Object.fromEntries(ETAPAS.map((e) => [e, 0])) as Record<Etapa, number>;
  for (const l of linhas) if (ehEtapa(l.etapa)) contagem[l.etapa]++;
  return contagem;
}
