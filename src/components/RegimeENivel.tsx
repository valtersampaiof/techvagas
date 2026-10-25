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
 * Regime de contratação (CLT, PJ ou estágio) e, logo depois, o nível. Cada um é um campo de seleção, para ficarem na
 * mesma linha dos outros filtros. São regimes com leis e carreiras diferentes:
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

  const titulo = (texto: string) => (comTitulos ? <span className={classeDoTitulo}>{texto}</span> : null);

  return (
    <>
      <label>
        {titulo("Regime de contratação")}
        <select
          name="contrato"
          value={contrato}
          onChange={(e) => escolherRegime(e.target.value as FiltroDeContrato | "")}
          className={classeDoSeletor}
          aria-label="Regime de contratação"
        >
          {REGIMES.map((r) => <option key={r.valor || "qualquer"} value={r.valor}>{r.rotulo}</option>)}
        </select>
      </label>

      {contrato === "estagio" ? (
        <p className="self-center text-sm text-slate-600">Estágio não tem nível</p>
      ) : (
        <label>
          {titulo("Nível")}
          <select name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value)} className={classeDoSeletor} aria-label="Nível da vaga">
            <option value="">Todos os níveis</option>
            {niveis.map((n) => <option key={n} value={n}>{ROTULO_TIPO[n]}</option>)}
          </select>
        </label>
      )}
    </>
  );
}
