import type { PrismaClient } from "@prisma/client";
import { HABILIDADES } from "../dados/habilidades";
import { FONTES } from "./fontes";
import { normalizarVaga } from "./normalizar";
import type { FonteExterna } from "./tipos";

export type ResultadoDaFonte = {
  rotulo: string;
  situacao: "ok" | "pulada" | "erro";
  detalhe?: string;
  recebidas: number;
  salvas: number;
  descartadas: number;
};

export async function sincronizarVagas(db: PrismaClient, fontes: FonteExterna[] = FONTES): Promise<ResultadoDaFonte[]> {
  const ids = new Map((await db.habilidade.findMany({ select: { id: true, slug: true } })).map((h) => [h.slug, h.id]));
  if (ids.size === 0) throw new Error("O catálogo de habilidades está vazio. Rode `npm run db:preparar` antes.");

  const resultados: ResultadoDaFonte[] = [];

  for (const fonte of fontes) {
    const base = { rotulo: fonte.rotulo, recebidas: 0, salvas: 0, descartadas: 0 };

    const motivo = fonte.indisponivel();
    if (motivo) {
      resultados.push({ ...base, situacao: "pulada", detalhe: motivo });
      continue;
    }

    try {
      const brutas = await fonte.buscar();
      // A mesma vaga pode vir em mais de uma busca.
      const unicas = [...new Map(brutas.map((v) => [v.idExterno, v])).values()];
      const aceitas = unicas.flatMap((v) => {
        const n = normalizarVaga(v, HABILIDADES);
        return n ? [n] : [];
      });

      for (const v of aceitas) {
        const dados = {
          titulo: v.titulo,
          empresa: v.empresa,
          cidade: v.cidade,
          modalidade: v.modalidade,
          tipo: v.tipo,
          area: v.area,
          descricao: v.descricao,
          link: v.link,
          publicadaEm: v.publicadaEm,
          atualizadaEm: new Date(),
          requisitos: {
            deleteMany: {},
            create: v.requisitos.map((r) => ({
              habilidadeId: ids.get(r.slug)!,
              nivelMinimo: r.nivelMinimo,
              obrigatorio: r.obrigatorio,
            })),
          },
        };
        await db.vaga.upsert({
          where: { origem_idExterno: { origem: v.origem, idExterno: v.idExterno } },
          update: dados,
          create: { ...dados, origem: v.origem, idExterno: v.idExterno, requisitos: { create: dados.requisitos.create } },
        });
      }

      // Vagas dessa fonte que não apareceram mais saíram do ar. Só limpa se a busca trouxe algo,
      // para uma falha silenciosa da fonte não apagar tudo.
      if (aceitas.length > 0) {
        await db.vaga.deleteMany({
          where: { origem: fonte.origem, idExterno: { notIn: aceitas.map((v) => v.idExterno) } },
        });
      }

      resultados.push({
        ...base,
        situacao: "ok",
        recebidas: unicas.length,
        salvas: aceitas.length,
        descartadas: unicas.length - aceitas.length,
      });
    } catch (e) {
      resultados.push({ ...base, situacao: "erro", detalhe: e instanceof Error ? e.message : String(e) });
    }
  }
  return resultados;
}
