"use client";

import { useState } from "react";
import { ROTULO_CONTRATO, ROTULO_TIPO } from "@/lib/rotulos";
import { FILTROS_DE_CONTRATO, NIVEIS_DO_REGIME, type FiltroDeContrato } from "@/lib/tipos-de-vaga";

type Props = {
  contratoInicial: string;
  tipoInicial: string;
  /** Classe dos campos de seleção (cada tela tem a sua). */
  classeDoSeletor: string;
  /** No formulário de alerta o nível ganha um título em cima do campo. */
  comTitulos?: boolean;
  classeDoTitulo?: string;
};

const REGIMES: { valor: FiltroDeContrato | ""; rotulo: string }[] = [
  { valor: "", rotulo: "Qualquer regime" },
  ...FILTROS_DE_CONTRATO.map((v) => ({ valor: v, rotulo: ROTULO_CONTRATO[v] })),
];

/**
 * Regime de contratação (CLT, PJ ou estágio) e, logo depois, o nível. São regimes com leis e carreiras diferentes:
 * os níveis oferecidos mudam conforme o regime, e estágio não tem nível.
 */
export function RegimeENivel({ contratoInicial, tipoInicial, classeDoSeletor, comTitulos = false, classeDoTitulo = "" }: Props) {
  const [contrato, setContrato] = useState<FiltroDeContrato | "">(contratoInicial as FiltroDeContrato | "");
  const [tipo, setTipo] = useState(tipoInicial);
  const niveis = NIVEIS_DO_REGIME[contrato];

  function escolherRegime(novo: FiltroDeContrato | "") {
    setContrato(novo);
    // O nível que não existe no novo regime (ex.: trainee no PJ) volta para "todos".
    if (!(NIVEIS_DO_REGIME[novo] as readonly string[]).includes(tipo)) setTipo("");
  }

  return (
    <>
      <fieldset className="basis-full">
        <legend className={comTitulos ? classeDoTitulo : "text-sm font-medium text-slate-700"}>Regime de contratação</legend>
        <div className="mt-1 flex flex-wrap gap-2">
          {REGIMES.map((r) => (
            <label key={r.valor || "qualquer"} className="cursor-pointer">
              <input
                type="radio"
                name="contrato"
                value={r.valor}
                checked={contrato === r.valor}
                onChange={() => escolherRegime(r.valor)}
                className="peer sr-only"
              />
              <span className="inline-block rounded-full border border-slate-300 bg-white px-4 py-1.5 text-sm text-slate-700 peer-checked:border-indigo-600 peer-checked:bg-indigo-600 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-400">
                {r.rotulo}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {contrato === "estagio" ? (
        <p className="basis-full text-sm text-slate-600">Estágio não tem nível: aparecem todas as vagas de estágio.</p>
      ) : (
        <label className={comTitulos ? "" : undefined}>
          {comTitulos && <span className={classeDoTitulo}>Nível</span>}
          <select name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value)} className={classeDoSeletor} aria-label="Nível da vaga">
            <option value="">Todos os níveis</option>
            {niveis.map((n) => <option key={n} value={n}>{ROTULO_TIPO[n]}</option>)}
          </select>
        </label>
      )}
    </>
  );
}
