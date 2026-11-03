"use client";

import { useActionState } from "react";
import type { EstadoDoFormulario } from "@/app/acoes";

type Props = {
  acao: (estado: EstadoDoFormulario, formData: FormData) => Promise<EstadoDoFormulario>;
  modo: "entrar" | "cadastrar";
};

const campo = "campo mt-1 py-2.5";

export function FormularioAuth({ acao, modo }: Props) {
  const [estado, executar, pendente] = useActionState(acao, undefined);

  return (
    <form action={executar} className="space-y-4">
      {modo === "cadastrar" && (
        <label className="block text-sm font-medium text-slate-700">
          Nome
          <input name="nome" required autoComplete="name" defaultValue={estado?.campos?.nome} className={campo} />
        </label>
      )}
      <label className="block text-sm font-medium text-slate-700">
        E-mail
        <input name="email" type="email" required autoComplete="email" defaultValue={estado?.campos?.email} className={campo} />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Senha
        <input
          name="senha"
          type="password"
          required
          minLength={modo === "cadastrar" ? 8 : undefined}
          autoComplete={modo === "cadastrar" ? "new-password" : "current-password"}
          className={campo}
        />
        {modo === "cadastrar" && <span className="text-xs font-normal text-slate-500">Mínimo de 8 caracteres.</span>}
      </label>
      {estado?.erro && (
        <p role="alert" className="rounded-xl ring-1 ring-inset ring-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {estado.erro}
        </p>
      )}
      <button
        disabled={pendente}
        className="btn-primario w-full !py-2.5"
      >
        {pendente ? "Aguarde..." : modo === "entrar" ? "Entrar" : "Criar conta"}
      </button>
    </form>
  );
}
