"use client";

import { useState, useTransition } from "react";
import { reenviarConfirmacao } from "@/app/acoes-conta";

/** Aviso "confirme seu e-mail", com botão para pedir outro link. */
export function AvisoDeEmail({ email }: { email: string }) {
  const [pendente, iniciar] = useTransition();
  const [resposta, setResposta] = useState<{ erro?: string; ok?: string }>({});
  return (
    <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-inset ring-amber-100">
      <p>
        <strong>Confirme seu e-mail.</strong> Mandamos um link para <strong>{email}</strong>. Enquanto ele não for confirmado, os alertas
        por e-mail ficam desligados.
      </p>
      <button
        type="button"
        disabled={pendente}
        onClick={() => iniciar(async () => setResposta((await reenviarConfirmacao()) ?? {}))}
        className="mt-2 font-semibold underline disabled:opacity-60"
      >
        {pendente ? "Enviando..." : "Enviar o link de novo"}
      </button>
      {resposta.ok && <p role="status" className="mt-2 text-emerald-800">{resposta.ok}</p>}
      {resposta.erro && <p role="alert" className="mt-2 text-rose-700">{resposta.erro}</p>}
    </div>
  );
}
