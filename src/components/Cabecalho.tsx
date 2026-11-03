import Link from "next/link";
import { db } from "@/lib/db";
import { usuarioAtual } from "@/lib/sessao";
import { sair } from "@/app/acoes";
import { LinkDoMenu } from "./LinkDoMenu";

export function Marca({ tamanho = "normal" }: { tamanho?: "normal" | "grande" }) {
  const caixa = tamanho === "grande" ? "h-11 w-11 text-xl" : "h-8 w-8 text-base";
  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        className={`${caixa} inline-flex items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 font-extrabold text-white shadow-md shadow-indigo-600/30`}
        aria-hidden="true"
      >
        T
      </span>
      <span className={`font-extrabold tracking-tight text-slate-900 ${tamanho === "grande" ? "text-2xl" : "text-lg"}`}>
        Tech<span className="text-indigo-600">Vagas</span>
      </span>
    </span>
  );
}

export async function Cabecalho() {
  const usuario = await usuarioAtual();
  const totalSalvas = usuario ? await db.vagaSalva.count({ where: { usuarioId: usuario.id } }) : 0;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3">
        <Link href="/" aria-label="TechVagas, página inicial">
          <Marca />
        </Link>
        <nav aria-label="Principal" className="order-last -mx-1 flex w-full items-center gap-1 overflow-x-auto px-1 sm:order-none sm:mx-0 sm:w-auto sm:overflow-visible sm:px-0">
          <LinkDoMenu href="/vagas">Vagas</LinkDoMenu>
          <LinkDoMenu href="/cursos">Cursos</LinkDoMenu>
          <LinkDoMenu href="/mercado">Mercado</LinkDoMenu>
          <LinkDoMenu href="/salvas">
            Salvas
            {totalSalvas > 0 && (
              <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-700">{totalSalvas}</span>
            )}
          </LinkDoMenu>
          <LinkDoMenu href="/alertas">Alertas</LinkDoMenu>
          <LinkDoMenu href="/perfil">Meu perfil</LinkDoMenu>
        </nav>
        <div className="ml-auto flex items-center gap-3 text-sm">
          {usuario ? (
            <>
              <span className="flex items-center gap-2 text-slate-600">
                <span
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700"
                  aria-hidden="true"
                >
                  {usuario.nome.trim().charAt(0).toUpperCase()}
                </span>
                <span className="hidden sm:inline">Olá, {usuario.nome.split(" ")[0]}</span>
              </span>
              <form action={sair}>
                <button className="btn-secundario !px-3 !py-1.5">Sair</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/entrar" className="rounded-full px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900">
                Entrar
              </Link>
              <Link href="/cadastrar" className="btn-primario !py-1.5">
                Criar conta
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
