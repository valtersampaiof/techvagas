import Link from "next/link";
import { usuarioAtual } from "@/lib/sessao";
import { sair } from "@/app/acoes";

export async function Cabecalho() {
  const usuario = await usuarioAtual();

  return (
    <header className="bg-white border-b border-slate-200">
      <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2">
        <Link href="/" className="text-lg font-bold text-indigo-700">
          Rota TI
        </Link>
        <nav className="flex gap-4 text-sm font-medium text-slate-700">
          <Link href="/vagas" className="hover:text-indigo-700">Vagas</Link>
          <Link href="/cursos" className="hover:text-indigo-700">Cursos</Link>
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
