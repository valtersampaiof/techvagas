import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { usuarioAtual } from "@/lib/sessao";
import { EditorDePerfil } from "@/components/EditorDePerfil";
import { salvarPerfil } from "@/app/acoes";

export const metadata: Metadata = { title: "Meu perfil" };

export default async function PaginaDePerfil() {
  const usuario = await usuarioAtual();

  if (!usuario) {
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="text-2xl font-bold">Meu perfil</h1>
        <p className="mt-3 text-slate-600">Entre na sua conta para enviar o currículo e salvar suas habilidades.</p>
        <div className="mt-5 flex justify-center gap-3">
          <Link href="/entrar" className="rounded-md border border-slate-300 px-4 py-2 hover:bg-slate-50">Entrar</Link>
          <Link href="/cadastrar" className="rounded-md bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700">Criar conta</Link>
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
      <h1 className="text-2xl font-bold">Meu perfil</h1>
      <p className="mt-1 mb-6 text-sm text-slate-600">
        Quanto mais fiel for esta lista, mais certeira será a análise das vagas.
      </p>
      <EditorDePerfil
        catalogo={catalogo}
        inicial={usuario.habilidades.map((h) => ({ slug: h.habilidade.slug, nivel: h.nivel }))}
        curso={usuario.curso}
        cidade={usuario.cidade}
        acao={salvarPerfil}
      />
    </div>
  );
}
