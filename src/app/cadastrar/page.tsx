import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cadastrar } from "@/app/acoes";
import { FormularioAuth } from "@/components/FormularioAuth";
import { usuarioAtual } from "@/lib/sessao";

export const metadata: Metadata = { title: "Criar conta" };

export default async function PaginaCadastrar() {
  if (await usuarioAtual()) redirect("/perfil");
  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-2xl font-bold">Criar conta</h1>
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
        <FormularioAuth acao={cadastrar} modo="cadastrar" />
      </div>
      <p className="mt-4 text-center text-sm text-slate-600">
        Já tem conta? <Link href="/entrar" className="font-semibold text-indigo-700 underline">Entrar</Link>
      </p>
    </div>
  );
}
