import { db } from "./db";

/** Números das vagas que a pessoa salvou, da mais recente para a mais antiga. */
export async function idsDasVagasSalvas(usuarioId: number): Promise<number[]> {
  const linhas = await db.vagaSalva.findMany({ where: { usuarioId }, orderBy: { criadaEm: "desc" }, select: { vagaId: true } });
  return linhas.map((l) => l.vagaId);
}
