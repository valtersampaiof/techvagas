import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { verificarEntrada } from "@/app/acoes-conta";
import { Marca } from "@/components/Cabecalho";
import { FormularioDeConta } from "@/components/FormularioDeConta";
import { lerSessaoPendente } from "@/lib/sessao";

export const metadata: Metadata = { title: "Verificação em dois passos", robots: { index: false } };

export default async function PaginaDeVerificacao() {
  // Só chega aqui quem acabou de acertar a senha e tem a verificação ligada.
  if (!(await lerSessaoPendente())) redirect("/entrar");

  return (
    <div className="mx-auto max-w-sm pt-4">
      <div className="text-center">
        <Marca tamanho="grande" />
        <h1 className="mt-5 text-2xl font-bold">Digite o código</h1>
        <p className="mt-1 text-sm text-slate-600">
          Abra o aplicativo de códigos (como o Google Authenticator) e digite o número de 6 dígitos do TechVagas.
        </p>
      </div>
      <div className="cartao mt-6 p-6">
        <FormularioDeConta
          acao={verificarEntrada}
          campos={[{ nome: "codigo", rotulo: "Código", autoComplete: "one-time-code", dica: "Perdeu o celular? Use um dos seus códigos de recuperação (formato ABCDE-FGHJK)." }]}
          botao="Entrar"
        />
      </div>
      <p className="mt-4 text-center text-sm text-slate-600">
        <Link href="/entrar" className="font-medium text-indigo-700 hover:underline">Voltar</Link>
      </p>
    </div>
  );
}
