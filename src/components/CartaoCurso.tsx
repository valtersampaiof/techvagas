import { ROTULO_NIVEL, ehNivel } from "@/lib/niveis";
import type { CursoCandidato } from "@/lib/compatibilidade";

export function CartaoCurso({ curso, destaque }: { curso: CursoCandidato; destaque?: string }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4">
      {destaque && <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-indigo-600">{destaque}</p>}
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-slate-900">{curso.titulo}</h3>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
            curso.gratuito ? "bg-emerald-100 text-emerald-800" : "bg-violet-100 text-violet-800"
          }`}
        >
          {curso.gratuito ? "Gratuito" : "Pago"}
        </span>
      </div>
      <p className="text-sm text-slate-600">{curso.instituicao}</p>
      <p className="mt-2 text-sm text-slate-600">{curso.descricao}</p>
      <ul className="mt-3 flex flex-wrap gap-2 text-xs text-slate-700">
        <li className="rounded bg-slate-100 px-2 py-1">{ehNivel(curso.nivel) ? ROTULO_NIVEL[curso.nivel] : curso.nivel}</li>
        <li className="rounded bg-slate-100 px-2 py-1">≈ {curso.cargaHoraria} h</li>
        <li className="rounded bg-slate-100 px-2 py-1">{curso.certificado ? "Com certificado" : "Sem certificado"}</li>
      </ul>
      <p className="mt-2 text-xs text-slate-500">{curso.preco}</p>
      <a
        href={curso.link}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-block text-sm font-medium text-indigo-700 hover:underline"
      >
        Ver o curso ↗
      </a>
    </article>
  );
}
