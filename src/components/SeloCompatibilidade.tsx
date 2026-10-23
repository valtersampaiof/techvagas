export function SeloCompatibilidade({ percentual }: { percentual: number }) {
  const cor =
    percentual >= 80
      ? "bg-emerald-100 text-emerald-800"
      : percentual >= 50
        ? "bg-amber-100 text-amber-800"
        : "bg-rose-100 text-rose-800";
  return (
    <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${cor}`} title="Quanto seu perfil cobre dos requisitos da vaga">
      {percentual}% compatível
    </span>
  );
}
