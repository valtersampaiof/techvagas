import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { entrar } from "@/app/acoes";
import { Marca } from "@/components/Cabecalho";
import { FormularioAuth } from "@/components/FormularioAuth";
import { usuarioAtual } from "@/lib/sessao";

export const metadata: Metadata = { title: "Entrar" };

export default async function PaginaEntrar() {
  if (await usuarioAtual()) redirect("/vagas");
  return (
    <div className="mx-auto max-w-sm pt-4">
      <div className="text-center">
        <Marca tamanho="grande" />
        <h1 className="mt-5 text-2xl font-bold">Que bom ver você de novo</h1>
        <p className="mt-1 text-sm text-slate-600">Entre para ver a compatibilidade das vagas, suas vagas salvas e seus alertas.</p>
      </div>
      <div className="cartao mt-6 p-6">
        <FormularioAuth acao={entrar} modo="entrar" />
      </div>
      <p className="mt-4 text-center text-sm text-slate-600">
        Ainda não tem conta? <Link href="/cadastrar" className="font-semibold text-indigo-700 hover:underline">Criar conta</Link>
      </p>
    </div>
  );
}
