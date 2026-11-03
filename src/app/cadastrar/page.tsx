import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cadastrar } from "@/app/acoes";
import { Marca } from "@/components/Cabecalho";
import { FormularioAuth } from "@/components/FormularioAuth";
import { usuarioAtual } from "@/lib/sessao";

export const metadata: Metadata = { title: "Criar conta" };

export default async function PaginaCadastrar() {
  if (await usuarioAtual()) redirect("/perfil");
  return (
    <div className="mx-auto max-w-sm pt-4">
      <div className="text-center">
        <Marca tamanho="grande" />
        <h1 className="mt-5 text-2xl font-bold">Crie sua conta grátis</h1>
        <p className="mt-1 text-sm text-slate-600">Envie seu currículo e descubra o que falta para chegar nas vagas que você quer.</p>
      </div>
      <div className="cartao mt-6 p-6">
        <FormularioAuth acao={cadastrar} modo="cadastrar" />
      </div>
      <p className="mt-4 text-center text-sm text-slate-600">
        Já tem conta? <Link href="/entrar" className="font-semibold text-indigo-700 hover:underline">Entrar</Link>
      </p>
    </div>
  );
}
