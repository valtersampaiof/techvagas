import type { PrismaClient } from "@prisma/client";
import { correspondeABusca, palavrasDaBusca, textoParaBusca } from "./busca";
import { db } from "./db";
import { normalizar } from "./extrair-habilidades";
import type { Requisito } from "./compatibilidade";
import { contratosDoFiltro } from "./tipos-de-vaga";

export type FiltrosDeVagas = {
  busca?: string;
  /** Nível: "estagio", "trainee", "junior", "pleno", "senior", "lideranca" ou "indefinido". */
  tipo?: string;
  /** "clt" ou "pj". Vagas que aceitam os dois entram nas duas; as que não informam ficam de fora. */
  contrato?: string;
  modalidade?: string;
  area?: string;
  /** Sigla do estado, ex.: "PE". */
  uf?: string;
  /** Parte do nome da cidade; acentos e maiúsculas não importam. */
  cidade?: string;
  /** "qualquer" (toda vaga afirmativa) ou um grupo: "pcd", "mulheres", "negros", "lgbt". */
  afirmativa?: string;
  /** Por padrão, ao filtrar por estado/cidade as vagas remotas continuam aparecendo. */
  somenteRegiao?: boolean;
  /** Salário ou bolsa mensal mínimo. Vagas sem valor informado ficam de fora. */
  salarioMinimo?: number;
  /** Só vagas publicadas nos últimos N dias. Vagas sem data ficam de fora. */
  publicadaHaDias?: number;
  /** Só vagas que o site achou DEPOIS deste momento (usado pelos alertas por e-mail). */
  descobertasDepoisDe?: Date;
  /** Relógio usado em "últimos N dias" (existe para os testes). */
  agora?: Date;
};

export type LocalComVagas = { uf: string; cidade: string; vagas: number };

export type HabilidadePedida = {
  slug: string;
  nome: string;
  /** Em quantas das vagas analisadas a habilidade aparece. */
  vagas: number;
  /** Em quantas delas ela é obrigatória (e não só desejável). */
  obrigatorias: number;
};

export type HabilidadesMaisPedidas = {
  /** Vagas que passam nos filtros. */
  totalDeVagas: number;
  /** Vagas em que o site identificou ao menos um requisito: é a base dos percentuais. */
  vagasAnalisadas: number;
  habilidades: HabilidadePedida[];
};

export type VagaComRequisitos = {
  id: number;
  titulo: string;
  empresa: string;
  cidade: string;
  modalidade: string;
  tipo: string;
  /** "clt", "pj", "clt_pj", "estagio" ou "" (o anúncio não diz). */
  contrato: string;
  area: string;
  /** Na lista, o resumo da vaga (o que a pessoa vai fazer); em `obter`, o texto simples do anúncio. */
  descricao: string;
  /** O anúncio organizado em seções (JSON de `DescricaoOrganizada`). Só vem em `obter`; vazio na lista e nas vagas antigas. */
  detalhes: string;
  link: string;
  /** false: a vaga sumiu da fonte, mas foi mantida porque alguém a salvou. */
  ativa: boolean;
  /** Quando o site achou a vaga pela primeira vez. */
  primeiraVezEm: Date;
  /** Localização já interpretada (pode estar vazia, ex.: vagas "Brasil" ou remotas). */
  cidadeNome: string;
  uf: string;
  origem: string;
  publicadaEm: Date | null;
  /** Salário ou bolsa em reais por mês, quando o anúncio informa. */
  salarioMin: number | null;
  salarioMax: number | null;
  /** "fonte" (campo próprio), "texto" (lido do anúncio) ou "". */
  salarioOrigem: string;
  requisitos: Requisito[];
};

/**
 * Qualquer origem de vagas (banco com dados de exemplo hoje; uma interface
 * pública como Adzuna ou Jooble amanhã) só precisa cumprir este contrato.
 */
export interface FonteDeVagas {
  listar(filtros: FiltrosDeVagas): Promise<VagaComRequisitos[]>;
  obter(id: number): Promise<VagaComRequisitos | null>;
  areas(): Promise<string[]>;
  /** Cidades (e estados) que têm vagas, com a quantidade, da maior para a menor. */
  locais(): Promise<LocalComVagas[]>;
  /** As vagas com estes números (inclusive as inativas), na ordem pedida; as que não existem mais ficam de fora. */
  porIds(ids: number[]): Promise<VagaComRequisitos[]>;
  /** As habilidades que mais aparecem nos requisitos das vagas que passam nos filtros, da mais pedida para a menos. */
  habilidadesMaisPedidas(filtros: Pick<FiltrosDeVagas, "tipo" | "contrato" | "modalidade" | "area">): Promise<HabilidadesMaisPedidas>;
}

// Os requisitos vêm só com o número da habilidade; o nome vem de um mapa em memória (são poucas dezenas de habilidades).
// Buscar a habilidade dentro de cada requisito deixava a lista com milhares de vagas quase duas vezes mais lenta.
const incluirRequisitos = { requisitos: true } as const;

type HabilidadesPorId = Map<number, { slug: string; nome: string }>;

type VagaDoBanco = {
  id: number;
  titulo: string;
  empresa: string;
  cidade: string;
  cidadeNome: string;
  uf: string;
  modalidade: string;
  tipo: string;
  contrato: string;
  area: string;
  /** Fica de fora das listas quando não há busca (é o texto maior); `resumo` serve para o cartão. */
  descricao?: string;
  resumo: string;
  /** O anúncio organizado só é lido na página da vaga; as listas não o carregam. */
  detalhes?: string;
  link: string;
  origem: string;
  ativa: boolean;
  primeiraVezEm: Date;
  publicadaEm: Date | null;
  salarioMin: number | null;
  salarioMax: number | null;
  salarioOrigem: string;
  requisitos: { habilidadeId: number; nivelMinimo: string; obrigatorio: boolean }[];
};

function converter(v: VagaDoBanco, habilidades: HabilidadesPorId, completa = false): VagaComRequisitos {
  return {
    id: v.id,
    titulo: v.titulo,
    empresa: v.empresa,
    cidade: v.cidade,
    cidadeNome: v.cidadeNome,
    uf: v.uf,
    modalidade: v.modalidade,
    tipo: v.tipo,
    contrato: v.contrato,
    area: v.area,
    // Na lista vale o resumo (vagas antigas, sem resumo, mostram o começo do texto).
    descricao: completa ? (v.descricao ?? "") : v.resumo || (v.descricao ?? ""),
    detalhes: completa ? (v.detalhes ?? "") : "",
    link: v.link,
    origem: v.origem,
    ativa: v.ativa,
    primeiraVezEm: v.primeiraVezEm,
    publicadaEm: v.publicadaEm,
    salarioMin: v.salarioMin,
    salarioMax: v.salarioMax,
    salarioOrigem: v.salarioOrigem,
    requisitos: v.requisitos.flatMap((r) => {
      const h = habilidades.get(r.habilidadeId);
      return h ? [{ slug: h.slug, nome: h.nome, nivelMinimo: r.nivelMinimo, obrigatorio: r.obrigatorio }] : [];
    }),
  };
}

/** Filtros de nível, regime, modalidade e área (os que a lista de vagas e a página de mercado têm em comum). */
function condicoesBasicas({ tipo, contrato, modalidade, area }: Pick<FiltrosDeVagas, "tipo" | "contrato" | "modalidade" | "area">) {
  return [
    // Uma vaga "Pleno/Sênior" aparece nos dois níveis.
    tipo ? { OR: [{ tipo }, { niveisExtras: { contains: `,${tipo},` } }] } : {},
    contrato ? { contrato: { in: contratosDoFiltro(contrato) } } : {},
    modalidade ? { modalidade } : {},
    area ? { area } : {},
  ];
}

export function criarFonteDeVagas(banco: PrismaClient): FonteDeVagas {
  async function habilidadesPorId(): Promise<HabilidadesPorId> {
    const linhas = await banco.habilidade.findMany({ select: { id: true, slug: true, nome: true } });
    return new Map(linhas.map((h) => [h.id, { slug: h.slug, nome: h.nome }]));
  }

  /**
   * As vagas de exemplo só servem para demonstrar o site. Assim que existir ao
   * menos uma vaga real, elas deixam de aparecer nas listagens.
   */
  async function filtroDeOrigem() {
    const reais = await banco.vaga.count({ where: { origem: { not: "exemplo" }, ativa: true } });
    // Vagas inativas (que sumiram da fonte e só ficaram por estarem salvas) nunca entram nas listagens.
    return reais > 0 ? { origem: { not: "exemplo" }, ativa: true } : { ativa: true };
  }

  return {
    async listar({ busca, tipo, contrato, modalidade, area, afirmativa, uf, cidade, somenteRegiao, salarioMinimo, publicadaHaDias, descobertasDepoisDe, agora = new Date() }) {
      const chaveDaCidade = cidade ? normalizar(cidade).trim() : "";
      const regiao = {
        ...(uf ? { uf } : {}),
        ...(chaveDaCidade ? { cidadeChave: { contains: chaveDaCidade } } : {}),
      };
      const temRegiao = Object.keys(regiao).length > 0;

      const [habilidades, filtroDaOrigem] = await Promise.all([habilidadesPorId(), filtroDeOrigem()]);
      const vagas = await banco.vaga.findMany({
        where: {
          AND: [
            filtroDaOrigem,
            ...condicoesBasicas({ tipo, contrato, modalidade, area }),
            afirmativa ? (afirmativa === "qualquer" ? { afirmativa: { not: "" } } : { afirmativa: { contains: `,${afirmativa},` } }) : {},
            // Com estado/cidade, as vagas remotas também servem (a menos que a pessoa peça só a região).
            temRegiao ? (somenteRegiao ? regiao : { OR: [regiao, { modalidade: "remoto" }] }) : {},
            // Vale o teto da faixa ("R$ 1.500 a R$ 1.900" serve para quem quer 1.800+); "a partir de" vale o piso.
            salarioMinimo
              ? { OR: [{ salarioMax: { gte: salarioMinimo } }, { AND: [{ salarioMax: null }, { salarioMin: { gte: salarioMinimo } }] }] }
              : {},
            publicadaHaDias ? { publicadaEm: { gte: new Date(agora.getTime() - publicadaHaDias * 24 * 60 * 60 * 1000) } } : {},
            descobertasDepoisDe ? { primeiraVezEm: { gt: descobertasDepoisDe } } : {},
          ],
        },
        include: incluirRequisitos,
        // Numa lista com milhares de vagas, os textos grandes pesam muito (principalmente com o banco online): o anúncio
        // organizado nunca é preciso aqui, e o texto completo só serve para a busca.
        omit: { detalhes: true, ...(busca ? {} : { descricao: true }) },
        orderBy: [{ publicadaEm: { sort: "desc", nulls: "last" } }, { id: "asc" }],
      });
      // A busca é feita aqui e não no banco: o banco não ignora acentos nem separa "java" de "javascript".
      const palavras = busca ? palavrasDaBusca(busca) : [];
      const achadas =
        palavras.length === 0
          ? vagas
          : vagas.filter((v) => correspondeABusca(textoParaBusca(v.titulo, v.empresa, v.descricao ?? ""), palavras));
      return achadas.map((v) => converter(v, habilidades));
    },

    async obter(id) {
      const v = await banco.vaga.findUnique({ where: { id }, include: incluirRequisitos });
      return v ? converter(v, await habilidadesPorId(), true) : null;
    },

    async areas() {
      const linhas = await banco.vaga.findMany({
        where: await filtroDeOrigem(),
        select: { area: true },
        distinct: ["area"],
        orderBy: { area: "asc" },
      });
      return linhas.map((l) => l.area);
    },

    async habilidadesMaisPedidas(filtros) {
      const where = { AND: [await filtroDeOrigem(), ...condicoesBasicas(filtros)] };
      const comRequisitos = { AND: [...where.AND, { requisitos: { some: {} } }] };
      const [totalDeVagas, vagasAnalisadas, pedidas, obrigatorias, habilidades] = await Promise.all([
        banco.vaga.count({ where }),
        banco.vaga.count({ where: comRequisitos }),
        banco.requisitoDaVaga.groupBy({ by: ["habilidadeId"], where: { vaga: where }, _count: { _all: true } }),
        banco.requisitoDaVaga.groupBy({ by: ["habilidadeId"], where: { vaga: where, obrigatorio: true }, _count: { _all: true } }),
        habilidadesPorId(),
      ]);
      const obrigatoriasPorId = new Map(obrigatorias.map((o) => [o.habilidadeId, o._count._all]));
      const lista = pedidas.flatMap((p) => {
        const h = habilidades.get(p.habilidadeId);
        return h ? [{ slug: h.slug, nome: h.nome, vagas: p._count._all, obrigatorias: obrigatoriasPorId.get(p.habilidadeId) ?? 0 }] : [];
      });
      lista.sort((a, b) => b.vagas - a.vagas || b.obrigatorias - a.obrigatorias || a.nome.localeCompare(b.nome, "pt-BR"));
      return { totalDeVagas, vagasAnalisadas, habilidades: lista };
    },

    async porIds(ids) {
      if (ids.length === 0) return [];
      const vagas = await banco.vaga.findMany({ where: { id: { in: ids } }, include: incluirRequisitos, omit: { detalhes: true } });
      const habilidades = await habilidadesPorId();
      const porId = new Map(vagas.map((v) => [v.id, converter(v, habilidades)]));
      return ids.flatMap((id) => (porId.has(id) ? [porId.get(id)!] : []));
    },

    async locais() {
      const grupos = await banco.vaga.groupBy({
        by: ["uf", "cidadeNome"],
        where: { AND: [await filtroDeOrigem(), { OR: [{ uf: { not: "" } }, { cidadeNome: { not: "" } }] }] },
        _count: { _all: true },
      });
      return grupos
        .map((g) => ({ uf: g.uf, cidade: g.cidadeNome, vagas: g._count._all }))
        .sort((a, b) => b.vagas - a.vagas || a.cidade.localeCompare(b.cidade, "pt-BR"));
    },
  };
}

export const fonteDeVagas: FonteDeVagas = criarFonteDeVagas(db);
