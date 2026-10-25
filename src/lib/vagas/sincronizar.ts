import type { PrismaClient } from "@prisma/client";
import { HABILIDADES } from "../dados/habilidades";
import { FONTES } from "./fontes";
import { normalizar } from "../extrair-habilidades";
import { dadosDeLocalizacao } from "../localizacao";
import { normalizarVaga } from "./normalizar";
import type { FonteExterna } from "./tipos";

export type ResultadoDaFonte = {
  origem: string;
  rotulo: string;
  situacao: "ok" | "pulada" | "erro";
  detalhe?: string;
  recebidas: number;
  salvas: number;
  descartadas: number;
  /** Vagas boas que já existiam em uma fonte anterior e por isso não foram salvas de novo. */
  repetidas?: number;
};

/** Identifica a "mesma vaga" em fontes diferentes: mesmo cargo na mesma empresa. */
export function chaveDeVaga(titulo: string, empresa: string): string {
  return `${normalizar(titulo).trim()}|${normalizar(empresa).trim()}`;
}

export async function sincronizarVagas(db: PrismaClient, fontes: FonteExterna[] = FONTES): Promise<ResultadoDaFonte[]> {
  const ids = new Map((await db.habilidade.findMany({ select: { id: true, slug: true } })).map((h) => [h.slug, h.id]));
  if (ids.size === 0) throw new Error("O catálogo de habilidades está vazio. Rode `npm run db:preparar` antes.");
  // O código ganhou habilidades que o banco ainda não tem (depois de uma atualização do site): sem elas, requisitos se perderiam.
  const faltando = HABILIDADES.filter((h) => !ids.has(h.slug));
  if (faltando.length > 0) {
    throw new Error(`O banco não tem ${faltando.length} habilidade(s) do catálogo (${faltando.slice(0, 3).map((h) => h.slug).join(", ")}...). Rode \`npm run db:preparar\` antes.`);
  }

  const resultados: ResultadoDaFonte[] = [];
  const origensAnteriores: string[] = [];

  for (const fonte of fontes) {
    const base = { origem: fonte.origem, rotulo: fonte.rotulo, recebidas: 0, salvas: 0, descartadas: 0 };

    const motivo = fonte.indisponivel();
    if (motivo) {
      resultados.push({ ...base, situacao: "pulada", detalhe: motivo });
      origensAnteriores.push(fonte.origem);
      continue;
    }

    try {
      const brutas = await fonte.buscar();
      // A mesma vaga pode vir em mais de uma busca.
      const unicas = [...new Map(brutas.map((v) => [v.idExterno, v])).values()];
      const normalizadas = unicas.flatMap((v) => {
        const n = normalizarVaga(v, HABILIDADES);
        return n ? [n] : [];
      });

      // A mesma vaga costuma aparecer em mais de uma fonte (a Adzuna, por exemplo, agrega vagas da Gupy).
      // Vale a das fontes anteriores na lista, que são as de dados mais completos.
      const jaExistentes = new Set(
        (await db.vaga.findMany({ where: { origem: { in: origensAnteriores } }, select: { titulo: true, empresa: true } })).map(
          (x) => chaveDeVaga(x.titulo, x.empresa),
        ),
      );
      const aceitas = normalizadas.filter((v) => !jaExistentes.has(chaveDeVaga(v.titulo, v.empresa)));

      for (const v of aceitas) {
        const dados = {
          titulo: v.titulo,
          empresa: v.empresa,
          cidade: v.cidade,
          ...dadosDeLocalizacao(v.cidade),
          modalidade: v.modalidade,
          tipo: v.tipo,
          contrato: v.contrato,
          area: v.area,
          descricao: v.descricao,
          link: v.link,
          publicadaEm: v.publicadaEm,
          salarioMin: v.salario ? Math.round(v.salario.min) : null,
          salarioMax: v.salario?.max != null ? Math.round(v.salario.max) : null,
          salarioOrigem: v.salario?.origem ?? "",
          ativa: true, // reaparecendo na fonte, volta a valer
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

      // Vagas dessa fonte que não apareceram mais saíram do ar. Só limpa se a busca trouxe algo aproveitável (ou se a
      // fonte é uma lista completa), para uma falha silenciosa da fonte não apagar tudo. As que alguém SALVOU não são apagadas: ficam guardadas, marcadas
      // como inativas (somem das listagens, mas continuam em "vagas salvas", avisando que podem ter encerrado).
      if (aceitas.length > 0 || fonte.listaCompleta) {
        const sumiram = { origem: fonte.origem, idExterno: { notIn: aceitas.map((v) => v.idExterno) } };
        await db.vaga.deleteMany({ where: { ...sumiram, salvaPor: { none: {} } } });
        await db.vaga.updateMany({ where: { ...sumiram, salvaPor: { some: {} } }, data: { ativa: false } });
      }

      resultados.push({
        ...base,
        situacao: "ok",
        recebidas: unicas.length,
        salvas: aceitas.length,
        descartadas: unicas.length - aceitas.length,
        repetidas: normalizadas.length - aceitas.length,
      });
    } catch (e) {
      resultados.push({ ...base, situacao: "erro", detalhe: e instanceof Error ? e.message : String(e) });
    }
    origensAnteriores.push(fonte.origem);
  }
  return resultados;
}
