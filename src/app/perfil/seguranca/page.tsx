import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DoisPassos } from "@/components/DoisPassos";
import { restantesDeRecuperacao } from "@/lib/dois-passos";
import { db } from "@/lib/db";
import { usuarioAtual } from "@/lib/sessao";

export const metadata: Metadata = { title: "Segurança da conta", robots: { index: false } };

export default async function PaginaDeSeguranca({ searchParams }: { searchParams: Promise<{ usou?: string }> }) {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/entrar");
  const { usou } = await searchParams;

  const ativo = !!usuario.totpAtivoEm;
  const restantes = ativo ? await restantesDeRecuperacao(db, usuario.id) : 0;

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/perfil" className="inline-flex items-center gap-1 text-sm font-medium text-indigo-700 hover:text-indigo-900">← Meu perfil</Link>
      <h1 className="titulo-de-pagina mt-3">Segurança da conta</h1>
      <p className="mt-1 text-slate-600">Proteja a sua conta com um segundo passo, além da senha.</p>
      <div className="mt-6">
        <DoisPassos
          ativo={ativo}
          ativoDesde={usuario.totpAtivoEm ? usuario.totpAtivoEm.toLocaleDateString("pt-BR") : null}
          recuperacaoRestantes={restantes}
          usouRecuperacao={usou === "recuperacao"}
        />
      </div>
    </div>
  );
}
