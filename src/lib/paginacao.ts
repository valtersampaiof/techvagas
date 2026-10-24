export const POR_PAGINA = 24;

export type Pagina<T> = {
  itens: T[];
  atual: number;
  totalPaginas: number;
  total: number;
};

/** Converte o parâmetro `pagina` da URL em um número válido (mínimo 1). */
export function numeroDaPagina(valor: string | undefined): number {
  const n = Number.parseInt(valor ?? "", 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

export function paginar<T>(itens: T[], pagina: number, porPagina = POR_PAGINA): Pagina<T> {
  const total = itens.length;
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
  const atual = Math.min(Math.max(1, pagina), totalPaginas);
  return { itens: itens.slice((atual - 1) * porPagina, atual * porPagina), atual, totalPaginas, total };
}

/** Números a mostrar na barra de páginas, com reticências: [1, "…", 4, 5, 6, "…", 12]. */
export function janelaDePaginas(atual: number, totalPaginas: number, vizinhas = 1): (number | "…")[] {
  const queremos = new Set<number>([1, totalPaginas]);
  for (let p = atual - vizinhas; p <= atual + vizinhas; p++) if (p >= 1 && p <= totalPaginas) queremos.add(p);
  const ordenadas = [...queremos].sort((a, b) => a - b);
  const resultado: (number | "…")[] = [];
  ordenadas.forEach((p, i) => {
    if (i > 0 && p - ordenadas[i - 1] > 1) resultado.push("…");
    resultado.push(p);
  });
  return resultado;
}
