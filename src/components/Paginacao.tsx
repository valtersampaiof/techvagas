import Link from "next/link";
import { janelaDePaginas } from "@/lib/paginacao";

type Props = {
  atual: number;
  totalPaginas: number;
  caminho: string;
  /** Filtros ativos, repetidos em cada link para a pessoa não perdê-los ao mudar de página. */
  parametros: Record<string, string | undefined>;
};

export function Paginacao({ atual, totalPaginas, caminho, parametros }: Props) {
  if (totalPaginas <= 1) return null;

  const href = (pagina: number) => {
    const q = new URLSearchParams();
    for (const [chave, valor] of Object.entries(parametros)) if (valor) q.set(chave, valor);
    if (pagina > 1) q.set("pagina", String(pagina));
    const texto = q.toString();
    return texto ? `${caminho}?${texto}` : caminho;
  };

  const base = "rounded-md border px-3 py-1.5 text-sm";
  const ativo = `${base} border-indigo-600 bg-indigo-600 font-semibold text-white`;
  const normal = `${base} border-slate-300 bg-white hover:bg-slate-50`;
  const desligado = `${base} border-slate-200 text-slate-400`;

  return (
    <nav aria-label="Paginação" className="mt-8 flex flex-wrap items-center justify-center gap-2">
      {atual > 1 ? (
        <Link href={href(atual - 1)} className={normal} rel="prev">← Anterior</Link>
      ) : (
        <span className={desligado} aria-disabled="true">← Anterior</span>
      )}
      {janelaDePaginas(atual, totalPaginas).map((p, i) =>
        p === "…" ? (
          <span key={`reticencias-${i}`} className="px-1 text-slate-400" aria-hidden="true">…</span>
        ) : (
          <Link key={p} href={href(p)} className={p === atual ? ativo : normal} aria-current={p === atual ? "page" : undefined}>
            {p}
          </Link>
        ),
      )}
      {atual < totalPaginas ? (
        <Link href={href(atual + 1)} className={normal} rel="next">Próxima →</Link>
      ) : (
        <span className={desligado} aria-disabled="true">Próxima →</span>
      )}
    </nav>
  );
}
