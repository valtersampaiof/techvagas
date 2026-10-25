import type { PrismaClient } from "@prisma/client";
import { db } from "./db";
import { normalizar } from "./extrair-habilidades";
import type { Requisito } from "./compatibilidade";

export type FiltrosDeVagas = {
  busca?: string;
  tipo?: string;
  modalidade?: string;
  area?: string;
  /** Sigla do estado, ex.: "PE". */
  uf?: string;
  /** Parte do nome da cidade; acentos e maiúsculas não importam. */
  cidade?: string;
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

export type VagaComRequisitos = {
  id: number;
  titulo: string;
  empresa: string;
  cidade: string;
  modalidade: string;
  tipo: string;
  area: string;
  descricao: string;
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
}

const incluirRequisitos = {
  requisitos: { include: { habilidade: { select: { slug: true, nome: true } } } },
} as const;

type VagaDoBanco = {
  id: number;
  titulo: string;
  empresa: string;
  cidade: string;
  cidadeNome: string;
  uf: string;
  modalidade: string;
  tipo: string;
  area: string;
  descricao: string;
  link: string;
  origem: string;
  ativa: boolean;
  primeiraVezEm: Date;
  publicadaEm: Date | null;
  salarioMin: number | null;
  salarioMax: number | null;
  salarioOrigem: string;
  requisitos: { nivelMinimo: string; obrigatorio: boolean; habilidade: { slug: string; nome: string } }[];
};

function converter(v: VagaDoBanco): VagaComRequisitos {
  return {
    id: v.id,
    titulo: v.titulo,
    empresa: v.empresa,
    cidade: v.cidade,
    cidadeNome: v.cidadeNome,
    uf: v.uf,
    modalidade: v.modalidade,
    tipo: v.tipo,
    area: v.area,
    descricao: v.descricao,
    link: v.link,
    origem: v.origem,
    ativa: v.ativa,
    primeiraVezEm: v.primeiraVezEm,
    publicadaEm: v.publicadaEm,
    salarioMin: v.salarioMin,
    salarioMax: v.salarioMax,
    salarioOrigem: v.salarioOrigem,
    requisitos: v.requisitos.map((r) => ({
      slug: r.habilidade.slug,
      nome: r.habilidade.nome,
      nivelMinimo: r.nivelMinimo,
      obrigatorio: r.obrigatorio,
    })),
  };
}

export function criarFonteDeVagas(banco: PrismaClient): FonteDeVagas {
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
    async listar({ busca, tipo, modalidade, area, uf, cidade, somenteRegiao, salarioMinimo, publicadaHaDias, descobertasDepoisDe, agora = new Date() }) {
      const chaveDaCidade = cidade ? normalizar(cidade).trim() : "";
      const regiao = {
        ...(uf ? { uf } : {}),
        ...(chaveDaCidade ? { cidadeChave: { contains: chaveDaCidade } } : {}),
      };
      const temRegiao = Object.keys(regiao).length > 0;

      const vagas = await banco.vaga.findMany({
        where: {
          AND: [
            await filtroDeOrigem(),
            tipo ? { tipo } : {},
            modalidade ? { modalidade } : {},
            area ? { area } : {},
            busca
              ? { OR: [{ titulo: { contains: busca } }, { empresa: { contains: busca } }, { descricao: { contains: busca } }] }
              : {},
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
        orderBy: [{ publicadaEm: { sort: "desc", nulls: "last" } }, { id: "asc" }],
      });
      return vagas.map(converter);
    },

    async obter(id) {
      const v = await banco.vaga.findUnique({ where: { id }, include: incluirRequisitos });
      return v ? converter(v) : null;
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

    async porIds(ids) {
      if (ids.length === 0) return [];
      const vagas = await banco.vaga.findMany({ where: { id: { in: ids } }, include: incluirRequisitos });
      const porId = new Map(vagas.map((v) => [v.id, converter(v)]));
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
