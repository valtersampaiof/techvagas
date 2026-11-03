const BASE = "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset";

const VARIANTES = {
  nivel: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  regime: "bg-violet-50 text-violet-700 ring-violet-200",
  remoto: "bg-sky-50 text-sky-700 ring-sky-200",
  neutra: "bg-slate-50 text-slate-600 ring-slate-200",
  salario: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  alerta: "bg-rose-50 text-rose-700 ring-rose-200",
  fonte: "bg-amber-50 text-amber-800 ring-amber-200",
} as const;

export type VarianteDaEtiqueta = keyof typeof VARIANTES;

/** Pequena etiqueta colorida (nível, regime, modalidade...). As cores são as mesmas em todo o site. */
export function Etiqueta({
  variante = "neutra",
  title,
  children,
}: {
  variante?: VarianteDaEtiqueta;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <span className={`${BASE} ${VARIANTES[variante]}`} title={title}>
      {children}
    </span>
  );
}
