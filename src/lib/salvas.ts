import { db } from "./db";
import type { Etapa } from "./candidaturas";
import { ehEtapa } from "./candidaturas";

export type VagaAcompanhada = { vagaId: number; etapa: Etapa; anotacao: string; etapaEm: Date; criadaEm: Date };

/** As vagas que a pessoa salvou ou acompanha, com a etapa de cada uma; a mexida mais recente primeiro. */
export async function vagasAcompanhadas(usuarioId: number): Promise<VagaAcompanhada[]> {
  const linhas = await db.vagaSalva.findMany({ where: { usuarioId }, orderBy: [{ etapaEm: "desc" }, { criadaEm: "desc" }] });
  return linhas.map((l) => ({
    vagaId: l.vagaId,
    etapa: ehEtapa(l.etapa) ? l.etapa : "salva",
    anotacao: l.anotacao,
    etapaEm: l.etapaEm,
    criadaEm: l.criadaEm,
  }));
}

/** Números das vagas que a pessoa salvou, da mais recente para a mais antiga. */
export async function idsDasVagasSalvas(usuarioId: number): Promise<number[]> {
  const linhas = await db.vagaSalva.findMany({ where: { usuarioId }, orderBy: { criadaEm: "desc" }, select: { vagaId: true } });
  return linhas.map((l) => l.vagaId);
}

/** Etapa e anotação de uma vaga, ou null se a pessoa não a salvou. */
export async function acompanhamentoDaVaga(usuarioId: number, vagaId: number): Promise<{ etapa: Etapa; anotacao: string } | null> {
  const l = await db.vagaSalva.findUnique({ where: { usuarioId_vagaId: { usuarioId, vagaId } } });
  return l ? { etapa: ehEtapa(l.etapa) ? l.etapa : "salva", anotacao: l.anotacao } : null;
}
