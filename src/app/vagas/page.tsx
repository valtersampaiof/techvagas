import Link from "next/link";
import type { Metadata } from "next";
import { calcularCompatibilidade } from "@/lib/compatibilidade";
import { fonteDeVagas } from "@/lib/fonte-de-vagas";
import { PUBLICACOES, SALARIOS_MINIMOS } from "@/lib/filtros-de-vagas";
import { formatarReais } from "@/lib/formatar";
import { ehDaRegiao, interpretarLocal, nomeDoEstado } from "@/lib/localizacao";
import { numeroDaPagina, paginar } from "@/lib/paginacao";
import { ROTULO_MODALIDADE } from "@/lib/rotulos";
import { ajustarRegime } from "@/lib/tipos-de-vaga";
import { idsDasVagasSalvas } from "@/lib/salvas";
import { usuarioAtual } from "@/lib/sessao";
import { CartaoVaga } from "@/components/CartaoVaga";
import { Paginacao } from "@/components/Paginacao";
import { RegimeENivel } from "@/components/RegimeENivel";

export const metadata: Metadata = { title: "Vagas" };

type Parametros = {
  busca?: string;
  tipo?: string;
  contrato?: string;
  modalidade?: string;
  area?: string;
  uf?: string;
  cidade?: string;
  somenteRegiao?: string;
  publicada?: string;
  salario?: string;
  ordem?: string;
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
  // Só valores conhecidos: qualquer outra coisa na URL é ignorada em vez de quebrar a página.
  const publicadaHaDias = filtros.publicada && PUBLICACOES[filtros.publicada] ? Number(filtros.publicada) : undefined;
  const salarioMinimo = (SALARIOS_MINIMOS as readonly number[]).includes(Number(filtros.salario)) ? Number(filtros.salario) : undefined;
  // Regime primeiro; o nível só vale dentro do regime (estágio não tem nível, PJ não tem trainee).
  const regime = ajustarRegime(filtros.contrato ?? "", filtros.tipo ?? "");
  const tipo = regime.tipo || undefined;
  const contrato = regime.contrato || undefined;
  const ordem = filtros.ordem === "recentes" || filtros.ordem === "salario" ? filtros.ordem : "padrao";

  const vagas = await fonteDeVagas.listar({
    busca: filtros.busca?.trim() || undefined,
    tipo,
    contrato,
    modalidade: filtros.modalidade || undefined,
    area: filtros.area || undefined,
    uf,
    cidade,
    somenteRegiao,
    publicadaHaDias,
    salarioMinimo,
  });

  const salvas = new Set(usuario ? await idsDasVagasSalvas(usuario.id) : []);
  const habilidades = usuario?.habilidades.map((h) => ({ slug: h.habilidade.slug, nivel: h.nivel })) ?? [];
  const temPerfil = habilidades.length > 0;

  let itens = vagas.map((vaga) => ({
    vaga,
    // Sem requisitos identificados não dá para calcular compatibilidade (100% seria enganoso).
    percentual: temPerfil && vaga.requisitos.length > 0 ? calcularCompatibilidade(vaga.requisitos, habilidades).percentual : null,
  }));
  if (temPerfil && filtros.compativeis) itens = itens.filter((i) => (i.percentual ?? 0) >= COMPATIBILIDADE_MINIMA);

  // Com região escolhida, as vagas de lá vêm primeiro e as remotas de outros lugares depois.
  const daRegiaoPrimeiro = temRegiao && !somenteRegiao;
  const grupo = (v: (typeof itens)[number]["vaga"]) => (daRegiaoPrimeiro && !ehDaRegiao(v, uf, cidade) ? 1 : 0);
  const dataDe = (v: (typeof itens)[number]["vaga"]) => v.publicadaEm?.getTime() ?? 0;
  const valorDe = (v: (typeof itens)[number]["vaga"]) => v.salarioMax ?? v.salarioMin ?? -1;
  itens.sort(
    (a, b) =>
      grupo(a.vaga) - grupo(b.vaga) ||
      (ordem === "recentes"
        ? dataDe(b.vaga) - dataDe(a.vaga)
        : ordem === "salario"
          ? valorDe(b.vaga) - valorDe(a.vaga) || dataDe(b.vaga) - dataDe(a.vaga)
          : // Padrão: com perfil, as mais compatíveis (e, em empate, as com mais requisitos identificados, que são mais
            // confiáveis); sem perfil, mantém a ordem do banco (mais recentes primeiro).
            temPerfil
            ? (b.percentual ?? -1) - (a.percentual ?? -1) || b.vaga.requisitos.length - a.vaga.requisitos.length
            : 0),
  );
  const comSalario = itens.filter((i) => i.vaga.salarioMin !== null).length;

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
    tipo,
    contrato,
    modalidade: filtros.modalidade,
    area: filtros.area,
    uf: filtros.uf,
    cidade: filtros.cidade,
    somenteRegiao: filtros.somenteRegiao,
    publicada: filtros.publicada,
    salario: filtros.salario,
    ordem: filtros.ordem,
    compativeis: filtros.compativeis,
  };

  return (
    <div>
      <h1 className="text-2xl font-bold">Vagas de TI</h1>
      <p className="mt-1 text-sm text-slate-600">Do estágio à liderança, em CLT e PJ. Filtre pelo seu nível e veja o que falta para chegar lá.</p>

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
        <div className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-3">
          <RegimeENivel contratoInicial={contrato ?? ""} tipoInicial={tipo ?? ""} classeDoSeletor={seletor} />
          <p className="basis-full text-xs text-slate-500">
            CLT, PJ e estágio são regimes diferentes. Vagas que não informam o regime só aparecem em &quot;Qualquer regime&quot;.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <input name="busca" defaultValue={filtros.busca} placeholder="Buscar por cargo ou empresa" className={`${seletor} min-w-60 flex-1`} />
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

        <div className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-3">
          <span className="text-sm font-medium text-slate-700">Quando e quanto:</span>
          <select name="publicada" defaultValue={publicadaHaDias ? String(publicadaHaDias) : ""} className={seletor} aria-label="Publicada">
            <option value="">Publicada em qualquer data</option>
            {Object.entries(PUBLICACOES).map(([valor, nome]) => <option key={valor} value={valor}>{nome}</option>)}
          </select>
          <select name="salario" defaultValue={salarioMinimo ? String(salarioMinimo) : ""} className={seletor} aria-label="Salário ou bolsa mínimo">
            <option value="">Qualquer salário ou bolsa</option>
            {SALARIOS_MINIMOS.map((v) => <option key={v} value={v}>A partir de {formatarReais(v)} por mês</option>)}
          </select>
          <select name="ordem" defaultValue={ordem} className={seletor} aria-label="Ordenar por">
            <option value="padrao">{temPerfil ? "Ordenar: mais compatíveis" : "Ordenar: mais recentes"}</option>
            {temPerfil && <option value="recentes">Ordenar: mais recentes</option>}
            <option value="salario">Ordenar: maior salário</option>
          </select>
          <p className="basis-full text-xs text-slate-500">
            Só uma parte dos anúncios informa o valor. Ao escolher um mínimo, as vagas sem valor informado ficam de fora.
          </p>
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

      {(temRegiao || tipo || contrato || filtros.area || salarioMinimo) && (
        <p className="mt-3 text-sm">
          <Link href={`/alertas?${new URLSearchParams(Object.entries({ uf: filtros.uf, cidade: filtros.cidade, tipo, contrato, area: filtros.area, salario: filtros.salario, somenteRegiao: filtros.somenteRegiao }).filter((e): e is [string, string] => !!e[1]))}`}
            className="font-medium text-indigo-700 underline">
            🔔 Receber por e-mail as vagas novas com estes filtros
          </Link>
        </p>
      )}

      <p className="mt-4 text-sm text-slate-600" aria-live="polite">
        {pagina.total} vaga(s) encontrada(s)
        {resumoDaRegiao && (
          <>
            {" "}<strong>{resumoDaRegiao}</strong>
            {somenteRegiao ? "" : ", mais as vagas remotas"}
          </>
        )}
        {pagina.totalPaginas > 1 && ` · página ${pagina.atual} de ${pagina.totalPaginas}`}
        {comSalario > 0 && ` · ${comSalario} informam salário ou bolsa`}
        {publicadaHaDias && ` · ${PUBLICACOES[String(publicadaHaDias)].toLowerCase()}`}
      </p>

      <div className="mt-3 grid gap-4 md:grid-cols-2">
        {pagina.itens.map(({ vaga, percentual }) => (
          <CartaoVaga key={vaga.id} vaga={vaga} percentual={percentual} salva={salvas.has(vaga.id)} logado={!!usuario} />
        ))}
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
