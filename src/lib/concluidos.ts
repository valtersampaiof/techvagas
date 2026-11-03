import { db } from "./db";

/** Números dos cursos que a pessoa marcou como concluídos. */
export async function idsDosCursosConcluidos(usuarioId: number): Promise<Set<number>> {
  const linhas = await db.cursoConcluido.findMany({ where: { usuarioId }, select: { cursoId: true } });
  return new Set(linhas.map((l) => l.cursoId));
}
