import Link from "next/link";
import type { VagaComRequisitos } from "@/lib/fonte-de-vagas";
import { formatarPublicacao, formatarSalario } from "@/lib/formatar";
import { ROTULO_MODALIDADE, ROTULO_TIPO, rotuloDaOrigem, rotuloDoLocal } from "@/lib/rotulos";
import { BotaoSalvar } from "./BotaoSalvar";
import { SeloCompatibilidade } from "./SeloCompatibilidade";

type Props = {
  vaga: VagaComRequisitos;
  percentual: number | null;
  salva: boolean;
  logado: boolean;
};

export function CartaoVaga({ vaga, percentual, salva, logado }: Props) {
  const publicacao = formatarPublicacao(vaga.publicadaEm);
  const salario = formatarSalario(vaga);
  return (
    // A estrela fica FORA do link (um botão dentro de um link é inválido e confunde teclado e leitores de tela).
    <div className="relative">
      <Link
        href={`/vagas/${vaga.id}`}
        className="block rounded-xl border border-slate-200 bg-white p-5 hover:border-indigo-300 hover:shadow-sm transition"
      >
        <div className="flex items-start justify-between gap-3 pr-11">
          <div>
            <h3 className="font-semibold text-slate-900">{vaga.titulo}</h3>
            <p className="text-sm text-slate-600">
              {vaga.empresa} · {rotuloDoLocal(vaga)}
              {publicacao && ` · ${publicacao}`}
            </p>
          </div>
          {percentual !== null && <SeloCompatibilidade percentual={percentual} />}
        </div>
        <p className="mt-2 text-sm text-slate-600 line-clamp-2">{vaga.descricao}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {!vaga.ativa && (
            <span className="rounded bg-rose-50 px-2 py-1 font-medium text-rose-700" title="Esta vaga não apareceu mais na fonte">
              Possivelmente encerrada
            </span>
          )}
          {salario && (
            <span className="rounded bg-emerald-50 px-2 py-1 font-medium text-emerald-800" title="Valor informado no anúncio; confira na vaga original">
              💰 {salario}
            </span>
          )}
          <span className="rounded bg-indigo-50 px-2 py-1 text-indigo-700">{ROTULO_TIPO[vaga.tipo] ?? vaga.tipo}</span>
          <span className="rounded bg-slate-100 px-2 py-1 text-slate-700">{ROTULO_MODALIDADE[vaga.modalidade] ?? vaga.modalidade}</span>
          <span className="rounded bg-slate-100 px-2 py-1 text-slate-700">{vaga.area}</span>
          <span className="rounded bg-amber-50 px-2 py-1 text-amber-800">{rotuloDaOrigem(vaga.origem)}</span>
        </div>
      </Link>
      <BotaoSalvar vagaId={vaga.id} salvaInicial={salva} logado={logado} className="absolute right-3 top-3" />
    </div>
  );
}
