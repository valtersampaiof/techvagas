import Link from "next/link";
import type { Metadata } from "next";
import { listarCursosCandidatos } from "@/lib/cursos";
import { idsDosCursosConcluidos } from "@/lib/concluidos";
import { TRILHAS } from "@/lib/dados/trilhas";
import { usuarioAtual } from "@/lib/sessao";
import { montarTrilha } from "@/lib/trilhas";

export const metadata: Metadata = {
  title: "Trilhas de estudo",
  description: "Caminhos de estudo por carreira de TI, com os cursos na ordem certa.",
};

export default async function PaginaDeTrilhas() {
  const usuario = await usuarioAtual();
  const [catalogo, concluidos] = await Promise.all([listarCursosCandidatos(), usuario ? idsDosCursosConcluidos(usuario.id) : null]);
  const perfil = new Map(usuario?.habilidades.map((h) => [h.habilidade.slug, h.nivel]) ?? []);

  return (
    <div>
      <h1 className="titulo-de-pagina">Trilhas de estudo</h1>
      <p className="mt-1 text-slate-600">
        Escolha uma carreira e siga os cursos na ordem. Ao marcar um curso como concluído, as habilidades dele entram no seu perfil
        e as vagas passam a combinar mais com você.
      </p>
      {!usuario && (
        <p className="mt-4 rounded-xl bg-indigo-50 px-4 py-3 text-sm text-indigo-900 ring-1 ring-inset ring-indigo-100">
          <Link href="/cadastrar" className="font-semibold underline">Crie sua conta</Link> para acompanhar o seu progresso em cada trilha.
        </p>
      )}

      <ul className="mt-6 grid gap-5 md:grid-cols-2">
        {TRILHAS.map((t) => {
          const m = montarTrilha(t, catalogo, perfil, concluidos ?? new Set());
          const pct = Math.round((m.concluidos / m.passos.length) * 100);
          return (
            <li key={t.slug}>
              <Link
                href={`/trilhas/${t.slug}`}
                className="cartao flex h-full flex-col p-5 transition duration-200 hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-900/10"
              >
                <h2 className="text-lg font-semibold text-slate-900">{t.nome}</h2>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{t.descricao}</p>
                <p className="mt-3 text-xs font-medium text-slate-500">{t.passos.length} passos</p>
                {usuario ? (
                  <div className="mt-auto pt-3">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-indigo-700">{m.concluidos} de {m.passos.length} concluídos</span>
                      <span className="text-slate-500">{pct}%</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" style={{ width: `${Math.max(pct, 2)}%` }} />
                    </div>
                  </div>
                ) : (
                  <span className="mt-auto pt-3 text-sm font-semibold text-indigo-700">Ver a trilha →</span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
