"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { mudarEtapaDaVaga, salvarAnotacaoDaVaga } from "@/app/acoes";
import { COR_DA_ETAPA, ETAPAS, LIMITE_DA_ANOTACAO, ROTULO_ETAPA, type Etapa } from "@/lib/candidaturas";

type Props = {
  vagaId: number;
  /** null: a vaga ainda não está salva. */
  etapaInicial: Etapa | null;
  anotacaoInicial?: string;
  /** "compacto" nos cartões da lista; "completo" na página da vaga. */
  variante?: "compacto" | "completo";
};

/** Seletor de etapa da candidatura (salva, me candidatei, entrevista...) com uma anotação opcional. */
export function EtapaDaVaga({ vagaId, etapaInicial, anotacaoInicial = "", variante = "compacto" }: Props) {
  const router = useRouter();
  const [etapa, setEtapa] = useState<Etapa | "">(etapaInicial ?? "");
  const [anotacao, setAnotacao] = useState(anotacaoInicial);
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [pendente, iniciar] = useTransition();

  function trocar(nova: string) {
    const anterior = etapa;
    setEtapa(nova as Etapa | "");
    setMensagem(null);
    iniciar(async () => {
      const r = await mudarEtapaDaVaga(vagaId, nova);
      if ("erro" in r) {
        setEtapa(anterior);
        setMensagem({ tipo: "erro", texto: r.erro });
      } else {
        router.refresh();
      }
    });
  }

  function guardarAnotacao() {
    iniciar(async () => {
      const r = await salvarAnotacaoDaVaga(vagaId, anotacao);
      setMensagem("erro" in r ? { tipo: "erro", texto: r.erro } : { tipo: "ok", texto: "Anotação salva." });
    });
  }

  const compacto = variante === "compacto";
  return (
    <div className={compacto ? "border-t border-slate-100 px-4 py-3" : ""}>
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor={`etapa-${vagaId}`}>
          Minha candidatura
        </label>
        <select
          id={`etapa-${vagaId}`}
          value={etapa}
          disabled={pendente}
          onChange={(e) => trocar(e.target.value)}
          className={`campo !w-auto !py-1.5 ${etapa ? `ring-1 ring-inset ${COR_DA_ETAPA[etapa]} font-semibold` : ""}`}
        >
          {etapa === "" && <option value="">Não estou acompanhando</option>}
          {ETAPAS.map((e) => <option key={e} value={e}>{ROTULO_ETAPA[e]}</option>)}
          {etapa !== "" && <option value="">Tirar do acompanhamento</option>}
        </select>
      </div>

      {etapa !== "" && (
        <details className="mt-2">
          <summary className="cursor-pointer text-sm font-medium text-indigo-700">{anotacao ? "Ver ou editar a anotação" : "Adicionar anotação"}</summary>
          <textarea
            value={anotacao}
            onChange={(e) => setAnotacao(e.target.value)}
            maxLength={LIMITE_DA_ANOTACAO}
            rows={3}
            placeholder="Ex.: entrevista com a Marina na quinta, 14h"
            className="campo mt-2"
            aria-label="Anotação sobre a vaga"
          />
          <div className="mt-2 flex items-center gap-3">
            <button type="button" onClick={guardarAnotacao} disabled={pendente} className="btn-secundario !py-1.5">Salvar anotação</button>
            <span className="text-xs text-slate-500">{anotacao.length}/{LIMITE_DA_ANOTACAO}</span>
          </div>
        </details>
      )}
      {mensagem && (
        <p role={mensagem.tipo === "erro" ? "alert" : "status"} className={`mt-2 text-sm ${mensagem.tipo === "erro" ? "text-rose-700" : "text-emerald-700"}`}>
          {mensagem.texto}
        </p>
      )}
    </div>
  );
}
