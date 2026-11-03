import type { CursoCandidato } from "./compatibilidade";
import type { PassoDaTrilha, Trilha } from "./dados/trilhas";
import { alcanceDoCurso, ensinaDeVerdade, ordenarCursos } from "./filtrar-cursos";
import { pesoNivel } from "./niveis";

export type PassoMontado = {
  passo: PassoDaTrilha;
  /** Um curso para começar e, se a meta for mais alta, um que leve até ela. Vazio só se o catálogo não tiver nada. */
  cursos: CursoCandidato[];
  /** O perfil já tem a habilidade no nível da meta, ou todos os cursos do passo foram concluídos. */
  concluido: boolean;
  motivoDaConclusao: "perfil" | "cursos" | null;
};

export type TrilhaMontada = {
  trilha: Trilha;
  passos: PassoMontado[];
  concluidos: number;
  /** Posição do primeiro passo ainda não concluído, ou null se a trilha acabou. */
  proximo: number | null;
};

/**
 * Escolhe os cursos de um passo: o melhor curso (gratuito e com certificado primeiro, em português em empate) para COMEÇAR
 * na habilidade e, quando a meta é mais alta que o nível inicial, o melhor que leve até a meta.
 */
export function cursosDoPasso(passo: PassoDaTrilha, catalogo: CursoCandidato[]): CursoCandidato[] {
  const deVerdade = ordenarCursos(catalogo.filter((c) => ensinaDeVerdade(c, passo.habilidade)), undefined, passo.habilidade);
  if (deVerdade.length === 0) return [];

  const meta = pesoNivel(passo.ate);
  const inicial = deVerdade.find((c) => c.nivel === "iniciante") ?? deVerdade[0];
  if (alcanceDoCurso(inicial, passo.habilidade) >= meta) return [inicial];

  const ate = deVerdade.find((c) => c.id !== inicial.id && alcanceDoCurso(c, passo.habilidade) >= meta);
  return ate ? [inicial, ate] : [inicial];
}

/** Junta a trilha com o catálogo e com o que a pessoa já sabe e já concluiu. */
export function montarTrilha(
  trilha: Trilha,
  catalogo: CursoCandidato[],
  perfil: Map<string, string> = new Map(),
  concluidos: Set<number> = new Set(),
): TrilhaMontada {
  const passos: PassoMontado[] = trilha.passos.map((passo) => {
    const cursos = cursosDoPasso(passo, catalogo);
    const nivelAtual = perfil.get(passo.habilidade);
    const peloPerfil = nivelAtual !== undefined && pesoNivel(nivelAtual) >= pesoNivel(passo.ate);
    const pelosCursos = cursos.length > 0 && cursos.every((c) => concluidos.has(c.id));
    return { passo, cursos, concluido: peloPerfil || pelosCursos, motivoDaConclusao: peloPerfil ? "perfil" : pelosCursos ? "cursos" : null };
  });
  const concluidosNaTrilha = passos.filter((p) => p.concluido).length;
  const indice = passos.findIndex((p) => !p.concluido);
  return { trilha, passos, concluidos: concluidosNaTrilha, proximo: indice === -1 ? null : indice };
}
