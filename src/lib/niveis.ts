export const NIVEIS = ["iniciante", "intermediario", "avancado"] as const;
export type Nivel = (typeof NIVEIS)[number];

export const ROTULO_NIVEL: Record<Nivel, string> = {
  iniciante: "Iniciante",
  intermediario: "Intermediário",
  avancado: "Avançado",
};

/** 1, 2 ou 3 — para comparar níveis. Valor desconhecido vira iniciante. */
export function pesoNivel(nivel: string): number {
  const i = NIVEIS.indexOf(nivel as Nivel);
  return i === -1 ? 1 : i + 1;
}

export function ehNivel(valor: unknown): valor is Nivel {
  return typeof valor === "string" && (NIVEIS as readonly string[]).includes(valor);
}
