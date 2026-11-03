"use client";

import { useActionState } from "react";
import type { EstadoDoFormulario } from "@/app/acoes";

type Campo = { nome: string; rotulo: string; tipo?: "text" | "email" | "password"; autoComplete?: string; dica?: string; minimo?: number };

type Props = {
  acao: (estado: EstadoDoFormulario, formData: FormData) => Promise<EstadoDoFormulario>;
  campos: Campo[];
  botao: string;
  /** Campos escondidos (ex.: o código do link). */
  ocultos?: Record<string, string>;
  perigo?: boolean;
};

const campo = "campo mt-1 py-2.5";

/** Formulário curto de conta (esqueci a senha, nova senha, excluir conta) com mensagem de erro e de sucesso. */
export function FormularioDeConta({ acao, campos, botao, ocultos = {}, perigo = false }: Props) {
  const [estado, executar, pendente] = useActionState(acao, undefined);
  return (
    <form action={executar} className="space-y-4">
      {Object.entries(ocultos).map(([nome, valor]) => <input key={nome} type="hidden" name={nome} value={valor} />)}
      {campos.map((c) => (
        <label key={c.nome} className="block text-sm font-medium text-slate-700">
          {c.rotulo}
          <input
            name={c.nome}
            type={c.tipo ?? "text"}
            required
            minLength={c.minimo}
            autoComplete={c.autoComplete}
            defaultValue={estado?.campos?.[c.nome]}
            className={campo}
          />
          {c.dica && <span className="text-xs font-normal text-slate-500">{c.dica}</span>}
        </label>
      ))}
      {estado?.erro && (
        <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-inset ring-rose-100">{estado.erro}</p>
      )}
      {estado?.ok && (
        <p role="status" className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800 ring-1 ring-inset ring-emerald-100">{estado.ok}</p>
      )}
      <button
        disabled={pendente}
        className={perigo ? "inline-flex w-full items-center justify-center rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:opacity-60" : "btn-primario w-full !py-2.5"}
      >
        {pendente ? "Aguarde..." : botao}
      </button>
    </form>
  );
}
