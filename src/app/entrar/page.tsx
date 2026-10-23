import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { entrar } from "@/app/acoes";
import { FormularioAuth } from "@/components/FormularioAuth";
import { usuarioAtual } from "@/lib/sessao";

export const metadata: Metadata = { title: "Entrar" };

export default async function PaginaEntrar() {
  if (await usuarioAtual()) redirect("/vagas");
  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-2xl font-bold">Entrar</h1>
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
        <FormularioAuth acao={entrar} modo="entrar" />
      </div>
      <p className="mt-4 text-center text-sm text-slate-600">
        Ainda não tem conta? <Link href="/cadastrar" className="font-semibold text-indigo-700 underline">Criar conta</Link>
      </p>
    </div>
  );
}
