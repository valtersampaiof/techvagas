import { ROTULO_NIVEL, ehNivel } from "@/lib/niveis";
import type { CursoCandidato } from "@/lib/compatibilidade";
import { BotaoConcluido } from "./BotaoConcluido";
import { Etiqueta } from "./Etiqueta";

type Props = {
  curso: CursoCandidato;
  destaque?: string;
  /** Só quando há alguém logado: mostra o botão "marcar como concluído". undefined = sem botão. */
  concluido?: boolean;
  /** Nível do título (h2 ou h3): o título não pode pular nível em relação ao que vem antes na página. */
  nivelDoTitulo?: 2 | 3;
};

export function CartaoCurso({ curso, destaque, concluido, nivelDoTitulo = 3 }: Props) {
  const Titulo = `h${nivelDoTitulo}` as "h2" | "h3";
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
        <Titulo className="font-semibold leading-snug text-slate-900">{curso.titulo}</Titulo>
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
      <div className="mt-auto flex flex-wrap items-start justify-between gap-3 pt-3">
        <a
          href={curso.link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 py-1.5 text-sm font-semibold text-indigo-700 hover:text-indigo-900"
        >
          Ver o curso <span aria-hidden="true">↗</span>
        </a>
        {concluido !== undefined && <BotaoConcluido cursoId={curso.id} concluidoInicial={concluido} />}
      </div>
    </article>
  );
}
