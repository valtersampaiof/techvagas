import type { PrismaClient } from "@prisma/client";

/**
 * Bancos criados antes da coluna `primeiraVezEm` ganharam, nas vagas que já existiam, a data em TEXTO
 * ("2026-10-25 02:55:41") em vez do número que o Prisma grava. No SQLite, texto é sempre maior que número,
 * então comparar "vaga achada depois de X" dava verdadeiro para todas elas e o primeiro alerta listava vagas antigas.
 * Aqui o texto vira número (a hora é a mesma, só muda o formato). Pode rodar quantas vezes quiser.
 */
export async function normalizarDatasDeDescoberta(db: PrismaClient): Promise<number> {
  try {
    return await db.$executeRawUnsafe(
      `UPDATE "Vaga" SET "primeiraVezEm" = CAST(strftime('%s', "primeiraVezEm") AS INTEGER) * 1000 WHERE typeof("primeiraVezEm") = 'text'`,
    );
  } catch {
    // Outros bancos (ex.: Postgres) têm coluna de data de verdade e não sofrem desse problema.
    return 0;
  }
}
