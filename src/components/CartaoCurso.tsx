import { ROTULO_NIVEL, ehNivel } from "@/lib/niveis";
import type { CursoCandidato } from "@/lib/compatibilidade";
import { Etiqueta } from "./Etiqueta";

export function CartaoCurso({ curso, destaque }: { curso: CursoCandidato; destaque?: string }) {
  return (
    <article
      className="cartao relative flex h-full flex-col overflow-hidden p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-900/10"
    >
      <span
        className={`absolute inset-x-0 top-0 h-1 ${curso.gratuito ? "bg-gradient-to-r from-emerald-400 to-teal-400" : "bg-gradient-to-r from-violet-400 to-fuchsia-400"}`}
        aria-hidden="true"
      />
      {destaque && <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-indigo-600">{destaque}</p>}
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold leading-snug text-slate-900">{curso.titulo}</h3>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
            curso.gratuito ? "bg-emerald-100 text-emerald-800" : "bg-violet-100 text-violet-800"
          }`}
        >
          {curso.gratuito ? "Gratuito" : "Pago"}
        </span>
      </div>
      <p className="mt-0.5 text-sm font-medium text-slate-500">{curso.instituicao}</p>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{curso.descricao}</p>
      <ul className="mt-3 flex flex-wrap gap-1.5">
        <li><Etiqueta variante="nivel">{ehNivel(curso.nivel) ? ROTULO_NIVEL[curso.nivel] : curso.nivel}</Etiqueta></li>
        <li><Etiqueta>⏱ ≈ {curso.cargaHoraria} h</Etiqueta></li>
        <li><Etiqueta variante={curso.certificado ? "salario" : "neutra"}>{curso.certificado ? "🎓 Com certificado" : "Sem certificado"}</Etiqueta></li>
      </ul>
      <p className="mt-2 text-xs text-slate-500">{curso.preco}</p>
      <a
        href={curso.link}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-auto inline-flex items-center gap-1 pt-3 text-sm font-semibold text-indigo-700 hover:text-indigo-900"
      >
        Ver o curso <span aria-hidden="true">↗</span>
      </a>
    </article>
  );
}
