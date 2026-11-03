const CORES = [
  "bg-indigo-100 text-indigo-700",
  "bg-violet-100 text-violet-700",
  "bg-sky-100 text-sky-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-teal-100 text-teal-700",
  "bg-fuchsia-100 text-fuchsia-700",
];

/** A mesma empresa sempre ganha a mesma cor, para a lista ficar fácil de percorrer com o olhar. */
function corDe(nome: string): string {
  let soma = 0;
  for (const letra of nome) soma = (soma * 31 + letra.charCodeAt(0)) % 997;
  return CORES[soma % CORES.length];
}

/** Quadrado com a inicial da empresa (as vagas não trazem logotipo). */
export function AvatarDaEmpresa({ empresa, tamanho = "normal" }: { empresa: string; tamanho?: "normal" | "grande" }) {
  const inicial = empresa.match(/[\p{L}\p{N}]/u)?.[0]?.toUpperCase() ?? "?";
  const caixa = tamanho === "grande" ? "h-14 w-14 text-2xl rounded-2xl" : "h-11 w-11 text-lg rounded-xl";
  return (
    <span className={`${caixa} ${corDe(empresa)} inline-flex shrink-0 items-center justify-center font-bold`} aria-hidden="true">
      {inicial}
    </span>
  );
}
