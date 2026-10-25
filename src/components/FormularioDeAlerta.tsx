"use client";

import { useActionState } from "react";
import type { EstadoDoFormulario } from "@/app/acoes";
import { ESTADOS } from "@/lib/localizacao";
import { SALARIOS_MINIMOS } from "@/lib/filtros-de-vagas";
import { formatarReais } from "@/lib/formatar";
import { ROTULO_CONTRATO, ROTULO_TIPO } from "@/lib/rotulos";
import { FILTROS_DE_CONTRATO } from "@/lib/tipos-de-vaga";

type Props = {
  acao: (estado: EstadoDoFormulario, formData: FormData) => Promise<EstadoDoFormulario>;
  areas: string[];
  /** Valores iniciais (vindos da lista de vagas, quando a pessoa clica em "criar alerta com estes filtros"). */
  inicial: { uf: string; cidade: string; tipo: string; contrato: string; area: string; salarioMinimo: string; incluirRemotas: boolean };
};

const campo = "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm";
const rotulo = "block text-xs font-semibold uppercase tracking-wide text-slate-500";

export function FormularioDeAlerta({ acao, areas, inicial }: Props) {
  const [estado, criar, pendente] = useActionState(acao, undefined);
  // Depois de um erro, vale o que a pessoa tinha escolhido; senão, os valores iniciais.
  const v = estado?.campos ?? null;
  const valor = (nome: "uf" | "cidade" | "tipo" | "contrato" | "area" | "salarioMinimo") => v?.[nome] ?? inicial[nome];
  const remotas = v ? v.incluirRemotas === "1" : inicial.incluirRemotas;

  // A chave refaz o formulário quando há valores devolvidos: o React volta os campos de seleção ao valor
  // do primeiro desenho depois de cada ação e ignora mudanças posteriores do valor padrão.
  return (
    <form key={v ? JSON.stringify(v) : "inicial"} action={criar} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <label>
          <span className={rotulo}>Estado</span>
          <select name="uf" defaultValue={valor("uf")} className={campo}>
            <option value="">Qualquer</option>
            {ESTADOS.map((e) => <option key={e.uf} value={e.uf}>{e.nome} ({e.uf})</option>)}
          </select>
        </label>
        <label>
          <span className={rotulo}>Cidade</span>
          <input name="cidade" defaultValue={valor("cidade")} placeholder="Ex.: Recife" maxLength={80} autoComplete="off" className={campo} />
        </label>
        <label>
          <span className={rotulo}>Nível</span>
          <select name="tipo" defaultValue={valor("tipo")} className={campo}>
            <option value="">Qualquer</option>
            {Object.entries(ROTULO_TIPO).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
          </select>
        </label>
        <label>
          <span className={rotulo}>Contratação</span>
          <select name="contrato" defaultValue={valor("contrato")} className={campo}>
            <option value="">CLT ou PJ</option>
            {FILTROS_DE_CONTRATO.map((v) => <option key={v} value={v}>{ROTULO_CONTRATO[v]}</option>)}
          </select>
        </label>
        <label>
          <span className={rotulo}>Área</span>
          <select name="area" defaultValue={valor("area")} className={campo}>
            <option value="">Qualquer</option>
            {areas.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </label>
        <label>
          <span className={rotulo}>Salário ou bolsa mínimo</span>
          <select name="salarioMinimo" defaultValue={valor("salarioMinimo")} className={campo}>
            <option value="">Qualquer</option>
            {SALARIOS_MINIMOS.map((v) => <option key={v} value={v}>A partir de {formatarReais(v)} por mês</option>)}
          </select>
        </label>
        <label className="flex items-end gap-2 pb-2 text-sm">
          <input type="checkbox" name="incluirRemotas" value="1" defaultChecked={remotas} />
          Incluir vagas remotas
        </label>
      </div>
      <p className="text-xs text-slate-500">
        Escolha pelo menos um filtro. Só vagas com salário informado passam quando você define um mínimo.
      </p>

      {estado?.erro && <p role="alert" className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{estado.erro}</p>}
      {estado?.ok && <p role="status" className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{estado.ok}</p>}

      <button disabled={pendente} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60">
        {pendente ? "Criando..." : "🔔 Criar alerta"}
      </button>
    </form>
  );
}
