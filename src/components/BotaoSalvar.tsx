"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { alternarVagaSalva } from "@/app/acoes";

type Props = {
  vagaId: number;
  salvaInicial: boolean;
  logado: boolean;
  /** "icone": só a estrela (cartões). "completo": estrela com texto (página da vaga). */
  variante?: "icone" | "completo";
  className?: string;
};

export function BotaoSalvar({ vagaId, salvaInicial, logado, variante = "icone", className = "" }: Props) {
  const router = useRouter();
  const [salva, setSalva] = useState(salvaInicial);
  const [pendente, iniciar] = useTransition();
  const rotulo = salva ? "Remover das vagas salvas" : "Salvar vaga";

  function aoClicar() {
    if (!logado) {
      router.push("/entrar");
      return;
    }
    const anterior = salva;
    setSalva(!anterior); // resposta imediata; se o servidor discordar, voltamos atrás
    iniciar(async () => {
      try {
        const r = await alternarVagaSalva(vagaId);
        if ("erro" in r) {
          setSalva(anterior);
          if (r.erro === "login") router.push("/entrar");
        } else {
          setSalva(r.salva);
          router.refresh(); // atualiza o contador do menu e a página "Salvas"
        }
      } catch {
        setSalva(anterior);
      }
    });
  }

  const base =
    variante === "icone"
      ? "flex h-9 w-9 items-center justify-center rounded-full border text-lg leading-none"
      : "inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium";
  const cores = salva
    ? "border-amber-300 bg-amber-50 text-amber-600 hover:bg-amber-100"
    : "border-slate-300 bg-white text-slate-500 hover:border-amber-300 hover:text-amber-600";

  return (
    <button
      type="button"
      onClick={aoClicar}
      disabled={pendente}
      aria-pressed={salva}
      aria-label={rotulo}
      title={logado ? rotulo : "Entre na sua conta para salvar vagas"}
      className={`${base} ${cores} disabled:opacity-60 ${className}`}
    >
      <span aria-hidden="true">{salva ? "★" : "☆"}</span>
      {variante === "completo" && <span>{salva ? "Vaga salva" : "Salvar vaga"}</span>}
    </button>
  );
}
