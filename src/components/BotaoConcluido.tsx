"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { alternarCursoConcluido } from "@/app/acoes";
import { ROTULO_NIVEL, ehNivel } from "@/lib/niveis";

type Props = { cursoId: number; concluidoInicial: boolean };

/** "Marcar como concluído": ao concluir, o perfil recebe as habilidades que o curso ensina. */
export function BotaoConcluido({ cursoId, concluidoInicial }: Props) {
  const router = useRouter();
  const [concluido, setConcluido] = useState(concluidoInicial);
  const [aviso, setAviso] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [pendente, iniciar] = useTransition();

  function aoClicar() {
    setAviso(null);
    iniciar(async () => {
      const r = await alternarCursoConcluido(cursoId);
      if ("erro" in r) {
        setAviso({ tipo: "erro", texto: r.erro });
        return;
      }
      setConcluido(r.concluido);
      if (r.concluido && r.ganhas.length > 0) {
        const lista = r.ganhas.map((g) => `${g.nome} (${ehNivel(g.nivel) ? ROTULO_NIVEL[g.nivel].toLowerCase() : g.nivel})`).join(", ");
        setAviso({ tipo: "ok", texto: `Parabéns! Adicionamos ao seu perfil: ${lista}.` });
      } else if (r.concluido) {
        setAviso({ tipo: "ok", texto: "Parabéns! Seu perfil já tinha essas habilidades neste nível." });
      }
      router.refresh();
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={aoClicar}
        disabled={pendente}
        aria-pressed={concluido}
        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-semibold transition disabled:opacity-60 ${
          concluido
            ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            : "border-slate-300 bg-white text-slate-700 hover:border-emerald-300 hover:text-emerald-700"
        }`}
      >
        <span aria-hidden="true">{concluido ? "✔" : "○"}</span>
        {concluido ? "Concluído" : "Marcar como concluído"}
      </button>
      {aviso && (
        <p role={aviso.tipo === "erro" ? "alert" : "status"} className={`mt-1.5 text-xs ${aviso.tipo === "erro" ? "text-rose-700" : "text-emerald-700"}`}>
          {aviso.texto}
        </p>
      )}
    </div>
  );
}
