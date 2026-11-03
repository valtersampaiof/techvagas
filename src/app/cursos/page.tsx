import Link from "next/link";
import type { Metadata } from "next";
import { listarCursosCandidatos } from "@/lib/cursos";
import { idsDosCursosConcluidos } from "@/lib/concluidos";
import { db } from "@/lib/db";
import { usuarioAtual } from "@/lib/sessao";
import { DURACOES, ORDENS, filtrarCursos, ordenarCursos, type FiltrosDeCursos } from "@/lib/filtrar-cursos";
import { NIVEIS, ROTULO_NIVEL } from "@/lib/niveis";
import { numeroDaPagina, paginar } from "@/lib/paginacao";
import { CartaoCurso } from "@/components/CartaoCurso";
import { Paginacao } from "@/components/Paginacao";

export const metadata: Metadata = { title: "Cursos" };

type Parametros = FiltrosDeCursos & { pagina?: string };

const campo = "campo mt-1";
const rotulo = "legenda";

export default async function PaginaDeCursos({ searchParams }: { searchParams: Promise<Parametros> }) {
  const { pagina: paginaTexto, ...filtros } = await searchParams;
  const usuario = await usuarioAtual();
  const concluidos = usuario ? await idsDosCursosConcluidos(usuario.id) : null;
  const [todos, habilidades] = await Promise.all([
    listarCursosCandidatos(),
    db.habilidade.findMany({ orderBy: [{ area: "asc" }, { nome: "asc" }], select: { slug: true, nome: true } }),
  ]);

  const filtrados = ordenarCursos(filtrarCursos(todos, filtros), filtros.ordem, filtros.habilidade);
  const pagina = paginar(filtrados, numeroDaPagina(paginaTexto));
  const temFiltro = Object.entries(filtros).some(([chave, valor]) => chave !== "ordem" && !!valor);

  return (
    <div>
      <h1 className="titulo-de-pagina">Cursos para se aprofundar</h1>
      <p className="mt-1 text-slate-600">
        Gratuitos e pagos, de plataformas conhecidas, do básico ao avançado. Preço, carga horária, certificado e idioma podem
        mudar: confira no site de cada instituição.
      </p>

      <form method="get" className="cartao mt-6 space-y-4 p-5">
        <label className="block">
          <span className={rotulo}>Buscar</span>
          <input
            name="q"
            defaultValue={filtros.q}
            placeholder="Nome do curso, instituição ou assunto (ex.: Alura, Docker, algoritmos)"
            className={campo}
          />
        </label>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <label>
            <span className={rotulo}>Habilidade</span>
            <select name="habilidade" defaultValue={filtros.habilidade ?? ""} className={campo}>
              <option value="">Todas</option>
              {habilidades.map((h) => <option key={h.slug} value={h.slug}>{h.nome}</option>)}
            </select>
          </label>
          <label>
            <span className={rotulo}>Preço</span>
            <select name="preco" defaultValue={filtros.preco ?? ""} className={campo}>
              <option value="">Gratuitos e pagos</option>
              <option value="gratuito">Só gratuitos</option>
              <option value="pago">Só pagos</option>
            </select>
          </label>
          <label>
            <span className={rotulo}>Começa no nível</span>
            <select name="nivel" defaultValue={filtros.nivel ?? ""} className={campo}>
              <option value="">Qualquer</option>
              {NIVEIS.map((n) => <option key={n} value={n}>{ROTULO_NIVEL[n]}</option>)}
            </select>
          </label>
          <label>
            <span className={rotulo}>Leva até o nível</span>
            <select name="alcance" defaultValue={filtros.alcance ?? ""} className={campo}>
              <option value="">Qualquer</option>
              <option value="intermediario">Intermediário ou mais</option>
              <option value="avancado">Avançado</option>
            </select>
          </label>
          <label>
            <span className={rotulo}>Idioma</span>
            <select name="idioma" defaultValue={filtros.idioma ?? ""} className={campo}>
              <option value="">Qualquer</option>
              <option value="pt">Português (ou com versão em português)</option>
              <option value="en">Inglês</option>
            </select>
          </label>
          <label>
            <span className={rotulo}>Duração</span>
            <select name="duracao" defaultValue={filtros.duracao ?? ""} className={campo}>
              <option value="">Qualquer</option>
              {Object.entries(DURACOES).map(([valor, d]) => <option key={valor} value={valor}>{d.rotulo}</option>)}
            </select>
          </label>
          <label>
            <span className={rotulo}>Ordenar por</span>
            <select name="ordem" defaultValue={filtros.ordem ?? "relevancia"} className={campo}>
              {Object.entries(ORDENS).map(([valor, nome]) => <option key={valor} value={valor}>{nome}</option>)}
            </select>
          </label>
          <label className="flex items-end gap-2 pb-2 text-sm">
            <input type="checkbox" name="certificado" value="1" defaultChecked={!!filtros.certificado} />
            Só com certificado
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button className="btn-primario">Filtrar</button>
          {temFiltro && <Link href="/cursos" className="btn-secundario">Limpar filtros</Link>}
        </div>
      </form>

      <p className="mt-4 text-sm text-slate-600" aria-live="polite">
        {pagina.total} curso(s)
        {pagina.totalPaginas > 1 && ` · página ${pagina.atual} de ${pagina.totalPaginas}`}
      </p>

      <div className="mt-3 grid gap-4 md:grid-cols-2">
        {pagina.itens.map((c) => <CartaoCurso key={c.id} curso={c} nivelDoTitulo={2} concluido={concluidos ? concluidos.has(c.id) : undefined} />)}
      </div>
      {pagina.total === 0 && (
        <p className="mt-8 text-center text-slate-500">
          Nenhum curso com esses filtros. Tente tirar algum deles{filtros.idioma === "pt" ? " (por exemplo, o de idioma)" : ""}.
        </p>
      )}

      <Paginacao
        atual={pagina.atual}
        totalPaginas={pagina.totalPaginas}
        caminho="/cursos"
        parametros={{ ...filtros }}
      />
    </div>
  );
}
