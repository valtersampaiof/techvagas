import { db } from "./db";
import { memorizar, TEMPO_DA_MEMORIA_MS } from "./memoria";
import type { CursoCandidato } from "./compatibilidade";

const lembrar = memorizar<CursoCandidato[]>(TEMPO_DA_MEMORIA_MS);

/** O catálogo quase não muda (só quando o atualizador roda), então fica guardado por alguns minutos na internet. */
export function listarCursosCandidatos(): Promise<CursoCandidato[]> {
  return lembrar("catalogo", lerCatalogo);
}

async function lerCatalogo(): Promise<CursoCandidato[]> {
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
