import { ensinaDeVerdade } from "./filtrar-cursos";
import { ehNivel, pesoNivel, type Nivel } from "./niveis";

type CursoComHabilidades = { habilidades: { slug: string; nivelEnsinado: string; principal?: boolean }[] };

export type HabilidadeGanha = { slug: string; nivel: Nivel; antes: Nivel | null };

/**
 * O que concluir um curso acrescenta ao perfil: cada habilidade que ele ensina DE VERDADE (é a principal dele ou o leva ao
 * menos ao nível intermediário) entra no perfil, ou sobe de nível se a pessoa já a tinha em um nível menor. Nunca diminui.
 * (Citar a habilidade de passagem não conta, pelo mesmo motivo do filtro de habilidade.)
 */
export function habilidadesGanhasComCurso(curso: CursoComHabilidades, perfil: Map<string, string>): HabilidadeGanha[] {
  const ganhas: HabilidadeGanha[] = [];
  curso.habilidades.forEach((h) => {
    if (!ehNivel(h.nivelEnsinado)) return;
    if (!ensinaDeVerdade({ habilidades: curso.habilidades.map((x, j) => ({ ...x, principal: x.principal ?? j === 0 })) }, h.slug)) return;
    const atual = perfil.get(h.slug);
    const antes = atual && ehNivel(atual) ? atual : null;
    if (antes === null || pesoNivel(h.nivelEnsinado) > pesoNivel(antes)) {
      ganhas.push({ slug: h.slug, nivel: h.nivelEnsinado, antes });
    }
  });
  return ganhas;
}
