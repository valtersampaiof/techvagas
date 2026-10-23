import Link from "next/link";
import type { Metadata } from "next";
import { calcularCompatibilidade } from "@/lib/compatibilidade";
import { fonteDeVagas } from "@/lib/fonte-de-vagas";
import { ROTULO_MODALIDADE, ROTULO_TIPO } from "@/lib/rotulos";
import { usuarioAtual } from "@/lib/sessao";
import { CartaoVaga } from "@/components/CartaoVaga";

export const metadata: Metadata = { title: "Vagas" };

type Parametros = { busca?: string; tipo?: string; modalidade?: string; area?: string; compativeis?: string };

const seletor = "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm";
const COMPATIBILIDADE_MINIMA = 60;

export default async function PaginaDeVagas({ searchParams }: { searchParams: Promise<Parametros> }) {
  const filtros = await searchParams;
  const [usuario, areas] = await Promise.all([usuarioAtual(), fonteDeVagas.areas()]);
  const vagas = await fonteDeVagas.listar({
    busca: filtros.busca?.trim() || undefined,
    tipo: filtros.tipo || undefined,
    modalidade: filtros.modalidade || undefined,
    area: filtros.area || undefined,
  });

  const habilidades = usuario?.habilidades.map((h) => ({ slug: h.habilidade.slug, nivel: h.nivel })) ?? [];
  const temPerfil = habilidades.length > 0;

  let itens = vagas.map((vaga) => ({
    vaga,
    // Sem requisitos identificados não dá para calcular compatibilidade (100% seria enganoso).
    percentual: temPerfil && vaga.requisitos.length > 0 ? calcularCompatibilidade(vaga.requisitos, habilidades).percentual : null,
  }));
  if (temPerfil) {
    if (filtros.compativeis) itens = itens.filter((i) => (i.percentual ?? 0) >= COMPATIBILIDADE_MINIMA);
    // Em empate, vem primeiro a vaga com mais requisitos identificados: a compatibilidade é mais confiável.
    itens.sort(
      (a, b) => (b.percentual ?? -1) - (a.percentual ?? -1) || b.vaga.requisitos.length - a.vaga.requisitos.length,
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Vagas para quem está começando</h1>

      {!usuario ? (
        <p className="mt-2 rounded-md bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
          <Link href="/cadastrar" className="font-semibold underline">Crie sua conta</Link> e envie seu currículo para ver
          a compatibilidade de cada vaga com o seu perfil.
        </p>
      ) : !temPerfil ? (
        <p className="mt-2 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Seu perfil ainda não tem habilidades.{" "}
          <Link href="/perfil" className="font-semibold underline">Complete o perfil</Link> para ordenar as vagas pela
          compatibilidade.
        </p>
      ) : null}

      <form className="mt-5 flex flex-wrap items-end gap-3" method="get">
        <input name="busca" defaultValue={filtros.busca} placeholder="Buscar por cargo ou empresa" className={`${seletor} min-w-60 flex-1`} />
        <select name="tipo" defaultValue={filtros.tipo ?? ""} className={seletor} aria-label="Tipo de vaga">
          <option value="">Todos os tipos</option>
          {Object.entries(ROTULO_TIPO).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
        </select>
        <select name="modalidade" defaultValue={filtros.modalidade ?? ""} className={seletor} aria-label="Modalidade">
          <option value="">Qualquer modalidade</option>
          {Object.entries(ROTULO_MODALIDADE).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
        </select>
        <select name="area" defaultValue={filtros.area ?? ""} className={seletor} aria-label="Área">
          <option value="">Todas as áreas</option>
          {areas.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        {temPerfil && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="compativeis" value="1" defaultChecked={!!filtros.compativeis} />
            Só as que combinam comigo ({COMPATIBILIDADE_MINIMA}%+)
          </label>
        )}
        <button className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">Filtrar</button>
        <Link href="/vagas" className="text-sm text-slate-600 underline">Limpar</Link>
      </form>

      <p className="mt-4 text-sm text-slate-600">{itens.length} vaga(s) encontrada(s)</p>
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        {itens.map(({ vaga, percentual }) => <CartaoVaga key={vaga.id} vaga={vaga} percentual={percentual} />)}
      </div>
      {itens.length === 0 && <p className="mt-8 text-center text-slate-500">Nenhuma vaga com esses filtros.</p>}
    </div>
  );
}
