"use client";

import Link from "next/link";
import { useEffect } from "react";

/** Aparece quando algo dá errado ao montar uma página (por exemplo, o banco de dados fora do ar). */
export default function ErroDaPagina({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-md py-10 text-center">
      <p className="text-5xl" aria-hidden="true">🛠️</p>
      <h1 className="mt-4 text-2xl font-bold">Algo deu errado por aqui</h1>
      <p className="mt-2 text-slate-600">
        Não foi culpa sua. Pode ser uma falha passageira: tente de novo em alguns instantes.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={() => retry()} className="btn-primario">Tentar de novo</button>
        <Link href="/" className="btn-secundario">Voltar ao início</Link>
      </div>
      {error.digest && <p className="mt-6 text-xs text-slate-500">Código do erro: {error.digest}</p>}
    </div>
  );
}
