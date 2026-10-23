import { db } from "./db";
import type { CursoCandidato } from "./compatibilidade";

export async function listarCursosCandidatos(): Promise<CursoCandidato[]> {
  const cursos = await db.curso.findMany({
    include: { habilidades: { include: { habilidade: { select: { slug: true } } } } },
    orderBy: { id: "asc" },
  });
  return cursos.map((c) => ({
    id: c.id,
    titulo: c.titulo,
    instituicao: c.instituicao,
    link: c.link,
    gratuito: c.gratuito,
    preco: c.preco,
    cargaHoraria: c.cargaHoraria,
    nivel: c.nivel,
    certificado: c.certificado,
    descricao: c.descricao,
    habilidades: c.habilidades.map((h) => ({ slug: h.habilidade.slug, nivelEnsinado: h.nivelEnsinado, principal: h.principal })),
  }));
}
