import Link from "next/link";
import type { Metadata } from "next";
import { listarCursosCandidatos } from "@/lib/cursos";
import { db } from "@/lib/db";
import { NIVEIS, ROTULO_NIVEL } from "@/lib/niveis";
import { CartaoCurso } from "@/components/CartaoCurso";

export const metadata: Metadata = { title: "Cursos" };

type Parametros = { habilidade?: string; preco?: string; certificado?: string; nivel?: string };

const seletor = "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm";

export default async function PaginaDeCursos({ searchParams }: { searchParams: Promise<Parametros> }) {
  const f = await searchParams;
  const [todos, habilidades] = await Promise.all([
    listarCursosCandidatos(),
    db.habilidade.findMany({ orderBy: [{ area: "asc" }, { nome: "asc" }], select: { slug: true, nome: true } }),
  ]);

  const cursos = todos.filter(
    (c) =>
      (!f.habilidade || c.habilidades.some((h) => h.slug === f.habilidade)) &&
      (f.preco !== "gratuito" || c.gratuito) &&
      (f.preco !== "pago" || !c.gratuito) &&
      (!f.certificado || c.certificado) &&
      (!f.nivel || c.nivel === f.nivel),
  );

  return (
    <div>
      <h1 className="text-2xl font-bold">Cursos para se aprofundar</h1>
      <p className="mt-1 text-sm text-slate-600">
        Gratuitos e pagos, de plataformas conhecidas. Preço, carga horária e certificado podem mudar: confira no site de cada
        instituição.
      </p>

      <form method="get" className="mt-5 flex flex-wrap items-end gap-3">
        <select name="habilidade" defaultValue={f.habilidade ?? ""} className={seletor} aria-label="Habilidade">
          <option value="">Todas as habilidades</option>
          {habilidades.map((h) => <option key={h.slug} value={h.slug}>{h.nome}</option>)}
        </select>
        <select name="preco" defaultValue={f.preco ?? ""} className={seletor} aria-label="Preço">
          <option value="">Gratuitos e pagos</option>
          <option value="gratuito">Só gratuitos</option>
          <option value="pago">Só pagos</option>
        </select>
        <select name="nivel" defaultValue={f.nivel ?? ""} className={seletor} aria-label="Nível">
          <option value="">Qualquer nível</option>
          {NIVEIS.map((n) => <option key={n} value={n}>{ROTULO_NIVEL[n]}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="certificado" value="1" defaultChecked={!!f.certificado} />
          Com certificado
        </label>
        <button className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">Filtrar</button>
        <Link href="/cursos" className="text-sm text-slate-600 underline">Limpar</Link>
      </form>

      <p className="mt-4 text-sm text-slate-600">{cursos.length} curso(s)</p>
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        {cursos.map((c) => <CartaoCurso key={c.id} curso={c} />)}
      </div>
      {cursos.length === 0 && <p className="mt-8 text-center text-slate-500">Nenhum curso com esses filtros.</p>}
    </div>
  );
}
