import Link from "next/link";
import type { Metadata } from "next";
import { redefinirSenha } from "@/app/acoes-conta";
import { Marca } from "@/components/Cabecalho";
import { FormularioDeConta } from "@/components/FormularioDeConta";
import { conferirCodigoDeConta } from "@/lib/contas";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Criar nova senha", robots: { index: false } };

export default async function PaginaRedefinirSenha({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const valido = (await conferirCodigoDeConta(db, "senha", token)) !== null;

  return (
    <div className="mx-auto max-w-sm pt-4">
      <div className="text-center">
        <Marca tamanho="grande" />
        <h1 className="mt-5 text-2xl font-bold">{valido ? "Criar nova senha" : "Link inválido"}</h1>
      </div>
      <div className="cartao mt-6 p-6">
        {valido ? (
          <FormularioDeConta
            acao={redefinirSenha}
            ocultos={{ codigo: token }}
            campos={[
              { nome: "senha", rotulo: "Nova senha", tipo: "password", autoComplete: "new-password", dica: "Mínimo de 8 caracteres.", minimo: 8 },
              { nome: "confirmar", rotulo: "Repita a nova senha", tipo: "password", autoComplete: "new-password", minimo: 8 },
            ]}
            botao="Salvar nova senha"
          />
        ) : (
          <p className="text-sm text-slate-700">
            Este link já foi usado ou venceu (ele vale por 1 hora). <Link href="/esqueci-senha" className="font-semibold text-indigo-700 hover:underline">Peça um novo</Link>.
          </p>
        )}
      </div>
    </div>
  );
}
