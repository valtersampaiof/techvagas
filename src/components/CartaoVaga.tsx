import Link from "next/link";
import type { VagaComRequisitos } from "@/lib/fonte-de-vagas";
import { ROTULO_MODALIDADE, ROTULO_ORIGEM, ROTULO_TIPO, rotuloDoLocal } from "@/lib/rotulos";
import { SeloCompatibilidade } from "./SeloCompatibilidade";

export function CartaoVaga({ vaga, percentual }: { vaga: VagaComRequisitos; percentual: number | null }) {
  return (
    <Link
      href={`/vagas/${vaga.id}`}
      className="block rounded-xl border border-slate-200 bg-white p-5 hover:border-indigo-300 hover:shadow-sm transition"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-900">{vaga.titulo}</h3>
          <p className="text-sm text-slate-600">
            {vaga.empresa} · {rotuloDoLocal(vaga)}
          </p>
        </div>
        {percentual !== null && <SeloCompatibilidade percentual={percentual} />}
      </div>
      <p className="mt-2 text-sm text-slate-600 line-clamp-2">{vaga.descricao}</p>
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <span className="rounded bg-indigo-50 px-2 py-1 text-indigo-700">{ROTULO_TIPO[vaga.tipo] ?? vaga.tipo}</span>
        <span className="rounded bg-slate-100 px-2 py-1 text-slate-700">{ROTULO_MODALIDADE[vaga.modalidade] ?? vaga.modalidade}</span>
        <span className="rounded bg-slate-100 px-2 py-1 text-slate-700">{vaga.area}</span>
        <span className="rounded bg-amber-50 px-2 py-1 text-amber-800">{ROTULO_ORIGEM[vaga.origem] ?? vaga.origem}</span>
      </div>
    </Link>
  );
}
