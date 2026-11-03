import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { entrar } from "@/app/acoes";
import { Marca } from "@/components/Cabecalho";
import { FormularioAuth } from "@/components/FormularioAuth";
import { usuarioAtual } from "@/lib/sessao";

export const metadata: Metadata = { title: "Entrar" };

export default async function PaginaEntrar({ searchParams }: { searchParams: Promise<{ redefinida?: string }> }) {
  const { redefinida } = await searchParams;
  if (await usuarioAtual()) redirect("/vagas");
  return (
    <div className="mx-auto max-w-sm pt-4">
      <div className="text-center">
        <Marca tamanho="grande" />
        <h1 className="mt-5 text-2xl font-bold">Que bom ver você de novo</h1>
        <p className="mt-1 text-sm text-slate-600">Entre para ver a compatibilidade das vagas, suas vagas salvas e seus alertas.</p>
      </div>
      {redefinida && (
        <p role="status" className="mt-6 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-inset ring-emerald-100">
          Senha alterada! Entre com a nova senha.
        </p>
      )}
      <div className="cartao mt-6 p-6">
        <FormularioAuth acao={entrar} modo="entrar" />
        <p className="mt-4 text-center text-sm">
          <Link href="/esqueci-senha" className="font-medium text-slate-600 hover:text-indigo-700 hover:underline">Esqueci minha senha</Link>
        </p>
      </div>
      <p className="mt-4 text-center text-sm text-slate-600">
        Ainda não tem conta? <Link href="/cadastrar" className="font-semibold text-indigo-700 hover:underline">Criar conta</Link>
      </p>
    </div>
  );
}
