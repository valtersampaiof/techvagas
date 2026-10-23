import { db } from "./db";
import type { Requisito } from "./compatibilidade";

export type FiltrosDeVagas = {
  busca?: string;
  tipo?: string;
  modalidade?: string;
  area?: string;
};

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
}

const incluirRequisitos = {
  requisitos: { include: { habilidade: { select: { slug: true, nome: true } } } },
} as const;

type VagaDoBanco = NonNullable<Awaited<ReturnType<typeof buscarUma>>>;
const buscarUma = (id: number) => db.vaga.findUnique({ where: { id }, include: incluirRequisitos });

function converter(v: VagaDoBanco): VagaComRequisitos {
  return {
    id: v.id,
    titulo: v.titulo,
    empresa: v.empresa,
    cidade: v.cidade,
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

/**
 * As vagas de exemplo só servem para demonstrar o site. Assim que existir ao
 * menos uma vaga real, elas deixam de aparecer nas listagens.
 */
async function filtroDeOrigem() {
  const reais = await db.vaga.count({ where: { origem: { not: "exemplo" } } });
  return reais > 0 ? { origem: { not: "exemplo" } } : {};
}

export const fonteDeVagas: FonteDeVagas = {
  async listar({ busca, tipo, modalidade, area }) {
    const vagas = await db.vaga.findMany({
      where: {
        ...(await filtroDeOrigem()),
        ...(tipo ? { tipo } : {}),
        ...(modalidade ? { modalidade } : {}),
        ...(area ? { area } : {}),
        ...(busca
          ? { OR: [{ titulo: { contains: busca } }, { empresa: { contains: busca } }, { descricao: { contains: busca } }] }
          : {}),
      },
      include: incluirRequisitos,
      orderBy: [{ publicadaEm: { sort: "desc", nulls: "last" } }, { id: "asc" }],
    });
    return vagas.map(converter);
  },

  async obter(id) {
    const v = await buscarUma(id);
    return v ? converter(v) : null;
  },

  async areas() {
    const linhas = await db.vaga.findMany({
      where: await filtroDeOrigem(),
      select: { area: true },
      distinct: ["area"],
      orderBy: { area: "asc" },
    });
    return linhas.map((l) => l.area);
  },
};
