import Link from "next/link";
import type { Metadata } from "next";
import { cancelarAlertaPorToken } from "@/app/acoes";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Cancelar alerta", robots: { index: false } };

type Parametros = { token?: string; cancelado?: string };

/**
 * Página do link "cancelar este alerta" dos e-mails. O cancelamento só acontece ao apertar o botão (um POST):
 * assim, programas que abrem os links do e-mail automaticamente (antivírus, pré-visualização) não cancelam por engano.
 */
export default async function PaginaDeCancelamento({ searchParams }: { searchParams: Promise<Parametros> }) {
  const { token, cancelado } = await searchParams;

  if (cancelado) {
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="text-2xl font-bold">Alerta cancelado</h1>
        <p className="mt-3 text-slate-600">Pronto: você não receberá mais e-mails desse alerta.</p>
        <Link href="/vagas" className="mt-5 inline-block rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">Ver vagas</Link>
      </div>
    );
  }

  const alerta = token && token.length >= 20 ? await db.alerta.findUnique({ where: { token }, select: { nome: true } }) : null;

  if (!alerta || !token) {
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="text-2xl font-bold">Link não encontrado</h1>
        <p className="mt-3 text-slate-600">Este alerta não existe mais (talvez já tenha sido cancelado) ou o link está incompleto.</p>
        <Link href="/alertas" className="mt-5 inline-block text-sm font-medium text-indigo-700 underline">Ver meus alertas</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md text-center">
      <h1 className="text-2xl font-bold">Cancelar alerta?</h1>
      <p className="mt-3 text-slate-600">
        Você deixará de receber e-mails do alerta <strong>{alerta.nome}</strong>.
      </p>
      <form action={cancelarAlertaPorToken.bind(null, token)} className="mt-5">
        <button className="rounded-md bg-rose-600 px-5 py-2.5 font-medium text-white hover:bg-rose-700">Sim, cancelar este alerta</button>
      </form>
      <Link href="/vagas" className="mt-4 inline-block text-sm text-slate-600 underline">Não, manter</Link>
    </div>
  );
}
