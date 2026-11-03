import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { usuarioAtual } from "@/lib/sessao";
import { AvisoDeEmail } from "@/components/AvisoDeEmail";
import { EditorDePerfil } from "@/components/EditorDePerfil";
import { FormularioDeConta } from "@/components/FormularioDeConta";
import { salvarPerfil } from "@/app/acoes";
import { excluirConta } from "@/app/acoes-conta";
import { emailConfigurado } from "@/lib/email";
import { emailValidado } from "@/lib/seguranca";

export const metadata: Metadata = { title: "Meu perfil" };

export default async function PaginaDePerfil() {
  const usuario = await usuarioAtual();

  if (!usuario) {
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="titulo-de-pagina">Meu perfil</h1>
        <p className="mt-3 text-slate-600">Entre na sua conta para enviar o currículo e salvar suas habilidades.</p>
        <div className="mt-5 flex justify-center gap-3">
          <Link href="/entrar" className="btn-secundario">Entrar</Link>
          <Link href="/cadastrar" className="btn-primario">Criar conta</Link>
        </div>
      </div>
    );
  }

  const catalogo = await db.habilidade.findMany({
    orderBy: [{ area: "asc" }, { nome: "asc" }],
    select: { slug: true, nome: true, area: true },
  });

  return (
    <div>
      <h1 className="titulo-de-pagina">Meu perfil</h1>
      <p className="mt-1 mb-6 text-sm text-slate-600">
        Quanto mais fiel for esta lista, mais certeira será a análise das vagas.
      </p>
      {!emailValidado(usuario.emailConfirmadoEm, emailConfigurado()) && (
        <div className="mb-6">
          <AvisoDeEmail email={usuario.email} />
        </div>
      )}
      <EditorDePerfil
        catalogo={catalogo}
        inicial={usuario.habilidades.map((h) => ({ slug: h.habilidade.slug, nivel: h.nivel }))}
        curso={usuario.curso}
        cidade={usuario.cidade}
        acao={salvarPerfil}
      />

      <section className="cartao mt-10 p-5">
        <h2 className="font-semibold">Segurança da conta</h2>
        <p className="mt-1 text-sm text-slate-600">
          {usuario.totpAtivoEm ? "A verificação em dois passos está ligada." : "Proteja a sua conta com a verificação em dois passos: além da senha, um código no celular."}
        </p>
        <Link href="/perfil/seguranca" className="btn-secundario mt-3">{usuario.totpAtivoEm ? "Gerenciar" : "Ligar a verificação em dois passos"}</Link>
      </section>

      <section className="cartao mt-6 border-rose-200 p-5">
        <h2 className="font-semibold text-rose-800">Excluir minha conta</h2>
        <p className="mt-1 text-sm text-slate-600">
          Apaga a sua conta e tudo o que está ligado a ela: perfil, vagas salvas, candidaturas e alertas. Não dá para desfazer.
          Veja também a <Link href="/privacidade" className="font-medium text-indigo-700 hover:underline">política de privacidade</Link>.
        </p>
        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-semibold text-rose-700">Quero excluir</summary>
          <div className="mt-3 max-w-sm">
            <FormularioDeConta
              acao={excluirConta}
              campos={[{ nome: "senha", rotulo: "Digite sua senha para confirmar", tipo: "password", autoComplete: "current-password" }]}
              botao="Excluir minha conta para sempre"
              perigo
            />
          </div>
        </details>
      </section>
    </div>
  );
}
