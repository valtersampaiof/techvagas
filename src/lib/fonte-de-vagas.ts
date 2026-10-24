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
  /** Localização já interpretada (pode estar vazia, ex.: vagas "Brasil" ou remotas). */
  cidadeNome: string;
  uf: string;
  origem: string;
  publicadaEm: Date | null;
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
  publicadaEm: Date | null;
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
    publicadaEm: v.publicadaEm,
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
    const reais = await banco.vaga.count({ where: { origem: { not: "exemplo" } } });
    return reais > 0 ? { origem: { not: "exemplo" } } : {};
  }

  return {
    async listar({ busca, tipo, modalidade, area, uf, cidade, somenteRegiao }) {
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
