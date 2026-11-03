import Link from "next/link";
import type { Metadata } from "next";
import { pedirRedefinicao } from "@/app/acoes-conta";
import { Marca } from "@/components/Cabecalho";
import { FormularioDeConta } from "@/components/FormularioDeConta";

export const metadata: Metadata = { title: "Esqueci minha senha" };

export default function PaginaEsqueciSenha() {
  return (
    <div className="mx-auto max-w-sm pt-4">
      <div className="text-center">
        <Marca tamanho="grande" />
        <h1 className="mt-5 text-2xl font-bold">Esqueci minha senha</h1>
        <p className="mt-1 text-sm text-slate-600">Digite o e-mail da sua conta. Vamos enviar um link para você criar uma nova senha.</p>
      </div>
      <div className="cartao mt-6 p-6">
        <FormularioDeConta
          acao={pedirRedefinicao}
          campos={[{ nome: "email", rotulo: "E-mail", tipo: "email", autoComplete: "email" }]}
          botao="Enviar o link"
        />
      </div>
      <p className="mt-4 text-center text-sm text-slate-600">
        Lembrou? <Link href="/entrar" className="font-semibold text-indigo-700 hover:underline">Entrar</Link>
      </p>
    </div>
  );
}
