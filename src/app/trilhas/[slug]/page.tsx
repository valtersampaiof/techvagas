import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CartaoCurso } from "@/components/CartaoCurso";
import { idsDosCursosConcluidos } from "@/lib/concluidos";
import { listarCursosCandidatos } from "@/lib/cursos";
import { HABILIDADES } from "@/lib/dados/habilidades";
import { TRILHAS } from "@/lib/dados/trilhas";
import { ROTULO_NIVEL } from "@/lib/niveis";
import { usuarioAtual } from "@/lib/sessao";
import { montarTrilha } from "@/lib/trilhas";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const t = TRILHAS.find((x) => x.slug === slug);
  return t ? { title: `Trilha: ${t.nome}`, description: t.descricao } : { title: "Trilha" };
}

const nomeDaHabilidade = (slug: string) => HABILIDADES.find((h) => h.slug === slug)?.nome ?? slug;

export default async function PaginaDaTrilha({ params }: Props) {
  const { slug } = await params;
  const trilha = TRILHAS.find((t) => t.slug === slug);
  if (!trilha) notFound();

  const usuario = await usuarioAtual();
  const [catalogo, concluidos] = await Promise.all([listarCursosCandidatos(), usuario ? idsDosCursosConcluidos(usuario.id) : null]);
  const perfil = new Map(usuario?.habilidades.map((h) => [h.habilidade.slug, h.nivel]) ?? []);
  const m = montarTrilha(trilha, catalogo, perfil, concluidos ?? new Set());
  const pct = Math.round((m.concluidos / m.passos.length) * 100);

  return (
    <div className="space-y-6">
      <Link href="/trilhas" className="inline-flex items-center gap-1 text-sm font-medium text-indigo-700 hover:text-indigo-900">← Todas as trilhas</Link>

      <header className="cartao p-6">
        <h1 className="text-2xl font-bold tracking-tight">{trilha.nome}</h1>
        <p className="mt-1 text-slate-600">{trilha.descricao}</p>
        {usuario ? (
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm font-semibold">
              <span className="text-indigo-700">{m.concluidos} de {m.passos.length} passos concluídos</span>
              <span className="text-slate-500">{pct}%</span>
            </div>
            <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" style={{ width: `${Math.max(pct, 2)}%` }} />
            </div>
            {m.proximo === null && <p className="mt-3 text-sm font-semibold text-emerald-700">🎉 Você concluiu esta trilha! Veja as <Link href="/vagas?compativeis=1" className="underline">vagas que combinam com você</Link>.</p>}
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-600">
            <Link href="/entrar" className="font-semibold text-indigo-700 underline">Entre</Link> ou{" "}
            <Link href="/cadastrar" className="font-semibold text-indigo-700 underline">crie sua conta</Link> para marcar os cursos que
            você concluir e acompanhar o progresso.
          </p>
        )}
      </header>

      <ol className="space-y-6">
        {m.passos.map((p, i) => {
          const proximo = m.proximo === i;
          return (
            <li key={p.passo.habilidade} className={`rounded-2xl p-5 ${proximo ? "bg-indigo-50/70 ring-2 ring-indigo-300" : p.concluido ? "bg-emerald-50/60 ring-1 ring-emerald-200" : "bg-white/60 ring-1 ring-slate-200"}`}>
              <div className="flex flex-wrap items-center gap-3">
                <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${p.concluido ? "bg-emerald-500 text-white" : "bg-indigo-100 text-indigo-700"}`}>
                  {p.concluido ? "✔" : i + 1}
                </span>
                <div>
                  <h2 className="font-semibold text-slate-900">{nomeDaHabilidade(p.passo.habilidade)}</h2>
                  <p className="text-xs text-slate-500">Meta: chegar ao nível {ROTULO_NIVEL[p.passo.ate].toLowerCase()}</p>
                </div>
                {proximo && usuario && <span className="rounded-full bg-indigo-600 px-2.5 py-0.5 text-xs font-semibold text-white">Próximo passo</span>}
                {p.motivoDaConclusao === "perfil" && <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">Você já tem esse nível</span>}
                {p.motivoDaConclusao === "cursos" && <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">Cursos concluídos</span>}
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {p.cursos.map((c, j) => (
                  <CartaoCurso
                    key={c.id}
                    curso={c}
                    destaque={j === 0 ? "Para começar" : `Para chegar ao nível ${ROTULO_NIVEL[p.passo.ate].toLowerCase()}`}
                    concluido={concluidos ? concluidos.has(c.id) : undefined}
                  />
                ))}
              </div>
            </li>
          );
        })}
      </ol>

      <p className="text-xs text-slate-500">
        Os cursos são escolhidos do catálogo (gratuitos e com certificado primeiro). Confira preço, carga horária e certificado no site de
        cada instituição.
      </p>
    </div>
  );
}
