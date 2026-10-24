import Link from "next/link";
import type { Metadata } from "next";
import { calcularCompatibilidade } from "@/lib/compatibilidade";
import { fonteDeVagas } from "@/lib/fonte-de-vagas";
import { ehDaRegiao, interpretarLocal, nomeDoEstado } from "@/lib/localizacao";
import { numeroDaPagina, paginar } from "@/lib/paginacao";
import { ROTULO_MODALIDADE, ROTULO_TIPO } from "@/lib/rotulos";
import { usuarioAtual } from "@/lib/sessao";
import { CartaoVaga } from "@/components/CartaoVaga";
import { Paginacao } from "@/components/Paginacao";

export const metadata: Metadata = { title: "Vagas" };

type Parametros = {
  busca?: string;
  tipo?: string;
  modalidade?: string;
  area?: string;
  uf?: string;
  cidade?: string;
  somenteRegiao?: string;
  compativeis?: string;
  pagina?: string;
};

const seletor = "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm";
const COMPATIBILIDADE_MINIMA = 60;
const LIMITE_DE_SUGESTOES_DE_CIDADE = 300;

export default async function PaginaDeVagas({ searchParams }: { searchParams: Promise<Parametros> }) {
  const filtros = await searchParams;
  const [usuario, areas, locais] = await Promise.all([usuarioAtual(), fonteDeVagas.areas(), fonteDeVagas.locais()]);

  const uf = filtros.uf?.toUpperCase() || undefined;
  const cidade = filtros.cidade?.trim() || undefined;
  const somenteRegiao = !!filtros.somenteRegiao;
  const temRegiao = !!(uf || cidade);

  const vagas = await fonteDeVagas.listar({
    busca: filtros.busca?.trim() || undefined,
    tipo: filtros.tipo || undefined,
    modalidade: filtros.modalidade || undefined,
    area: filtros.area || undefined,
    uf,
    cidade,
    somenteRegiao,
  });

  const habilidades = usuario?.habilidades.map((h) => ({ slug: h.habilidade.slug, nivel: h.nivel })) ?? [];
  const temPerfil = habilidades.length > 0;

  let itens = vagas.map((vaga) => ({
    vaga,
    // Sem requisitos identificados não dá para calcular compatibilidade (100% seria enganoso).
    percentual: temPerfil && vaga.requisitos.length > 0 ? calcularCompatibilidade(vaga.requisitos, habilidades).percentual : null,
  }));
  if (temPerfil && filtros.compativeis) itens = itens.filter((i) => (i.percentual ?? 0) >= COMPATIBILIDADE_MINIMA);

  // Com região escolhida, as vagas de lá vêm primeiro e as remotas de outros lugares depois. O sort do JavaScript
  // é estável: dentro de cada grupo, vale a ordem anterior (por data, ou por compatibilidade abaixo).
  const daRegiaoPrimeiro = temRegiao && !somenteRegiao;
  const grupo = (v: (typeof itens)[number]["vaga"]) => (daRegiaoPrimeiro && !ehDaRegiao(v, uf, cidade) ? 1 : 0);
  if (temPerfil) {
    // Em empate, vem primeiro a vaga com mais requisitos identificados: a compatibilidade é mais confiável.
    itens.sort(
      (a, b) =>
        grupo(a.vaga) - grupo(b.vaga) ||
        (b.percentual ?? -1) - (a.percentual ?? -1) ||
        b.vaga.requisitos.length - a.vaga.requisitos.length,
    );
  } else if (daRegiaoPrimeiro) {
    itens.sort((a, b) => grupo(a.vaga) - grupo(b.vaga));
  }

  const pagina = paginar(itens, numeroDaPagina(filtros.pagina));

  // Estados com vagas (para o seletor) e cidades com vagas (sugestões do campo de cidade).
  const porEstado = new Map<string, number>();
  for (const l of locais) if (l.uf) porEstado.set(l.uf, (porEstado.get(l.uf) ?? 0) + l.vagas);
  const estados = [...porEstado.entries()]
    .map(([sigla, n]) => ({ sigla, nome: nomeDoEstado(sigla), n }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  const sugestoesDeCidade = locais.filter((l) => l.cidade).slice(0, LIMITE_DE_SUGESTOES_DE_CIDADE);

  // Cidade do perfil: atalho para filtrar por ela.
  const daPessoa = usuario?.cidade ? interpretarLocal(usuario.cidade) : null;
  const atalhoDaCidade =
    daPessoa && (daPessoa.uf || daPessoa.cidade)
      ? new URLSearchParams({ ...(daPessoa.uf ? { uf: daPessoa.uf } : {}), ...(daPessoa.cidade ? { cidade: daPessoa.cidade } : {}) })
      : null;
  const jaFiltrandoPelaCidadeDaPessoa =
    daPessoa !== null && (daPessoa.uf || "") === (uf ?? "") && (daPessoa.cidade || "").toLowerCase() === (cidade ?? "").toLowerCase();

  // "em Recife (PE)", ou "no estado Pernambuco (PE)" quando só o estado foi escolhido.
  const resumoDaRegiao = !temRegiao
    ? null
    : cidade
      ? `em ${cidade}${uf ? ` (${uf})` : ""}`
      : `no estado ${nomeDoEstado(uf!)} (${uf})`;

  const parametrosAtivos = {
    busca: filtros.busca,
    tipo: filtros.tipo,
    modalidade: filtros.modalidade,
    area: filtros.area,
    uf: filtros.uf,
    cidade: filtros.cidade,
    somenteRegiao: filtros.somenteRegiao,
    compativeis: filtros.compativeis,
  };

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

      <form className="mt-5 space-y-3" method="get">
        <div className="flex flex-wrap items-end gap-3">
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
        </div>

        <div className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-3">
          <span className="text-sm font-medium text-slate-700">Onde:</span>
          <select name="uf" defaultValue={uf ?? ""} className={seletor} aria-label="Estado">
            <option value="">Todos os estados</option>
            {estados.map((e) => <option key={e.sigla} value={e.sigla}>{e.nome} ({e.sigla}) · {e.n}</option>)}
          </select>
          <input
            name="cidade"
            defaultValue={filtros.cidade}
            list="sugestoes-de-cidade"
            placeholder="Cidade (ex.: Recife)"
            autoComplete="off"
            aria-label="Cidade"
            className={`${seletor} min-w-48`}
          />
          <datalist id="sugestoes-de-cidade">
            {sugestoesDeCidade.map((l) => (
              <option key={`${l.cidade}-${l.uf}`} value={l.cidade}>{l.uf ? `${l.cidade} (${l.uf}) · ${l.vagas}` : `${l.cidade} · ${l.vagas}`}</option>
            ))}
          </datalist>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="somenteRegiao" value="1" defaultChecked={somenteRegiao} />
            Esconder vagas remotas
          </label>
          {atalhoDaCidade && !jaFiltrandoPelaCidadeDaPessoa && (
            <Link href={`/vagas?${atalhoDaCidade}`} className="rounded-full border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-800 hover:bg-indigo-100">
              📍 Usar minha cidade ({usuario?.cidade})
            </Link>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {temPerfil && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="compativeis" value="1" defaultChecked={!!filtros.compativeis} />
              Só as que combinam comigo ({COMPATIBILIDADE_MINIMA}%+)
            </label>
          )}
          <button className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">Filtrar</button>
          <Link href="/vagas" className="text-sm text-slate-600 underline">Limpar</Link>
        </div>
      </form>

      <p className="mt-4 text-sm text-slate-600" aria-live="polite">
        {pagina.total} vaga(s) encontrada(s)
        {resumoDaRegiao && (
          <>
            {" "}<strong>{resumoDaRegiao}</strong>
            {somenteRegiao ? "" : ", mais as vagas remotas"}
          </>
        )}
        {pagina.totalPaginas > 1 && ` · página ${pagina.atual} de ${pagina.totalPaginas}`}
      </p>

      <div className="mt-3 grid gap-4 md:grid-cols-2">
        {pagina.itens.map(({ vaga, percentual }) => <CartaoVaga key={vaga.id} vaga={vaga} percentual={percentual} />)}
      </div>
      {pagina.total === 0 && (
        <p className="mt-8 text-center text-slate-500">
          Nenhuma vaga com esses filtros.
          {temRegiao && " Tente outra cidade, ou tire o filtro de cidade e deixe só o estado."}
        </p>
      )}

      <Paginacao atual={pagina.atual} totalPaginas={pagina.totalPaginas} caminho="/vagas" parametros={parametrosAtivos} />
    </div>
  );
}
