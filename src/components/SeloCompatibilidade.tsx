export function SeloCompatibilidade({ percentual }: { percentual: number }) {
  const cor =
    percentual >= 80
      ? { barra: "bg-emerald-500", texto: "text-emerald-700", fundo: "bg-emerald-50 ring-emerald-200" }
      : percentual >= 50
        ? { barra: "bg-amber-500", texto: "text-amber-700", fundo: "bg-amber-50 ring-amber-200" }
        : { barra: "bg-rose-500", texto: "text-rose-700", fundo: "bg-rose-50 ring-rose-200" };
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${cor.fundo} ${cor.texto}`}
      title="Quanto seu perfil cobre dos requisitos da vaga"
    >
      <span className="h-1.5 w-14 overflow-hidden rounded-full bg-white/80" aria-hidden="true">
        <span className={`block h-full rounded-full ${cor.barra}`} style={{ width: `${Math.max(4, Math.min(100, percentual))}%` }} />
      </span>
      {percentual}% compatível
    </span>
  );
}
