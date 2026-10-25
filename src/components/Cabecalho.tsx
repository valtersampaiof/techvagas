import Link from "next/link";
import { db } from "@/lib/db";
import { usuarioAtual } from "@/lib/sessao";
import { sair } from "@/app/acoes";

export async function Cabecalho() {
  const usuario = await usuarioAtual();
  const totalSalvas = usuario ? await db.vagaSalva.count({ where: { usuarioId: usuario.id } }) : 0;

  return (
    <header className="bg-white border-b border-slate-200">
      <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2">
        <Link href="/" className="text-lg font-bold text-indigo-700">
          TechVagas
        </Link>
        <nav className="flex flex-wrap gap-x-4 gap-y-1 text-sm font-medium text-slate-700">
          <Link href="/vagas" className="hover:text-indigo-700">Vagas</Link>
          <Link href="/cursos" className="hover:text-indigo-700">Cursos</Link>
          <Link href="/salvas" className="hover:text-indigo-700">
            Salvas{totalSalvas > 0 && <span className="ml-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-700">{totalSalvas}</span>}
          </Link>
          <Link href="/alertas" className="hover:text-indigo-700">Alertas</Link>
          <Link href="/perfil" className="hover:text-indigo-700">Meu perfil</Link>
        </nav>
        <div className="ml-auto flex items-center gap-3 text-sm">
          {usuario ? (
            <>
              <span className="text-slate-600">Olá, {usuario.nome.split(" ")[0]}</span>
              <form action={sair}>
                <button className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-50">Sair</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/entrar" className="hover:text-indigo-700">Entrar</Link>
              <Link href="/cadastrar" className="rounded-md bg-indigo-600 px-3 py-1.5 font-medium text-white hover:bg-indigo-700">
                Criar conta
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
