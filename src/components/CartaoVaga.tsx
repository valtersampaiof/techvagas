import Link from "next/link";
import type { VagaComRequisitos } from "@/lib/fonte-de-vagas";
import { formatarPublicacao, formatarSalario } from "@/lib/formatar";
import { ROTULO_CONTRATO, ROTULO_MODALIDADE, ROTULO_TIPO, rotuloDaOrigem, rotuloDoLocal } from "@/lib/rotulos";
import { AvatarDaEmpresa } from "./AvatarDaEmpresa";
import { BotaoSalvar } from "./BotaoSalvar";
import { Etiqueta } from "./Etiqueta";
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
    <div className="group relative h-full">
      <Link
        href={`/vagas/${vaga.id}`}
        className="cartao flex h-full flex-col p-5 transition duration-200 hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-900/10"
      >
        <div className="flex items-start gap-3 pr-10">
          <AvatarDaEmpresa empresa={vaga.empresa} />
          <div className="min-w-0">
            <h3 className="font-semibold leading-snug text-slate-900 group-hover:text-indigo-700">{vaga.titulo}</h3>
            <p className="mt-0.5 text-sm text-slate-600">
              {vaga.empresa}
              <span className="text-slate-400"> · </span>
              {rotuloDoLocal(vaga)}
            </p>
            {publicacao && <p className="text-xs text-slate-400">{publicacao}</p>}
          </div>
        </div>

        {percentual !== null && (
          <div className="mt-3">
            <SeloCompatibilidade percentual={percentual} />
          </div>
        )}

        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-slate-600">{vaga.descricao}</p>

        <div className="mt-auto flex flex-wrap gap-1.5 pt-4">
          {!vaga.ativa && (
            <Etiqueta variante="alerta" title="Esta vaga não apareceu mais na fonte">
              Possivelmente encerrada
            </Etiqueta>
          )}
          {salario && (
            <Etiqueta variante="salario" title="Valor informado no anúncio; confira na vaga original">
              💰 {salario}
            </Etiqueta>
          )}
          <Etiqueta variante={vaga.tipo === "indefinido" ? "neutra" : "nivel"}>{ROTULO_TIPO[vaga.tipo] ?? vaga.tipo}</Etiqueta>
          {vaga.contrato && vaga.contrato !== "estagio" && (
            <Etiqueta variante="regime" title="Tipo de contratação informado no anúncio">
              {ROTULO_CONTRATO[vaga.contrato] ?? vaga.contrato}
            </Etiqueta>
          )}
          <Etiqueta variante={vaga.modalidade === "remoto" ? "remoto" : "neutra"}>
            {ROTULO_MODALIDADE[vaga.modalidade] ?? vaga.modalidade}
          </Etiqueta>
          <Etiqueta>{vaga.area}</Etiqueta>
          <Etiqueta variante="fonte">{rotuloDaOrigem(vaga.origem)}</Etiqueta>
        </div>
      </Link>
      <BotaoSalvar vagaId={vaga.id} salvaInicial={salva} logado={logado} className="absolute right-3 top-3" />
    </div>
  );
}
