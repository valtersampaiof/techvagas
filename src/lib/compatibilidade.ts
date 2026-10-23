import { pesoNivel } from "./niveis";

export type Requisito = {
  slug: string;
  nome: string;
  nivelMinimo: string;
  obrigatorio: boolean;
};

export type HabilidadeDoEstudante = { slug: string; nivel: string };

export type Lacuna = Requisito & {
  /** "ausente": não tem a habilidade. "nivel_abaixo": tem, mas num nível menor que o pedido. */
  situacao: "ausente" | "nivel_abaixo";
  nivelAtual: string | null;
};

export type Compatibilidade = {
  /** De 0 a 100. */
  percentual: number;
  atendidos: Requisito[];
  lacunas: Lacuna[];
};

const PESO_OBRIGATORIO = 3;
const PESO_DESEJAVEL = 1;
/** Quem tem a habilidade mas num nível menor ainda ganha parte dos pontos. */
const CREDITO_NIVEL_ABAIXO = 0.5;

export function calcularCompatibilidade(
  requisitos: Requisito[],
  habilidades: HabilidadeDoEstudante[],
): Compatibilidade {
  const niveis = new Map(habilidades.map((h) => [h.slug, h.nivel]));
  const atendidos: Requisito[] = [];
  const lacunas: Lacuna[] = [];
  let pontos = 0;
  let total = 0;

  for (const r of requisitos) {
    const peso = r.obrigatorio ? PESO_OBRIGATORIO : PESO_DESEJAVEL;
    total += peso;
    const nivelAtual = niveis.get(r.slug) ?? null;

    if (nivelAtual === null) {
      lacunas.push({ ...r, situacao: "ausente", nivelAtual });
    } else if (pesoNivel(nivelAtual) >= pesoNivel(r.nivelMinimo)) {
      atendidos.push(r);
      pontos += peso;
    } else {
      lacunas.push({ ...r, situacao: "nivel_abaixo", nivelAtual });
      pontos += peso * CREDITO_NIVEL_ABAIXO;
    }
  }

  return {
    percentual: total === 0 ? 100 : Math.round((pontos / total) * 100),
    atendidos,
    // obrigatórias primeiro: são as que mais pesam
    lacunas: lacunas.sort((a, b) => Number(b.obrigatorio) - Number(a.obrigatorio)),
  };
}

export type CursoCandidato = {
  id: number;
  titulo: string;
  instituicao: string;
  link: string;
  gratuito: boolean;
  preco: string;
  cargaHoraria: number;
  nivel: string;
  certificado: boolean;
  descricao: string;
  habilidades: { slug: string; nivelEnsinado: string; principal?: boolean }[];
};

export type RecomendacaoDaLacuna = {
  lacuna: Lacuna;
  melhorGratuito: CursoCandidato | null;
  melhorPago: CursoCandidato | null;
};

export type Recomendacoes = {
  porLacuna: RecomendacaoDaLacuna[];
  /** Cursos que cobrem várias lacunas ao mesmo tempo, os que mais compensam. */
  maisUteis: { curso: CursoCandidato; lacunasCobertas: string[] }[];
};

function ensina(curso: CursoCandidato, lacuna: Lacuna): boolean {
  return curso.habilidades.some(
    (h) => h.slug === lacuna.slug && pesoNivel(h.nivelEnsinado) >= pesoNivel(lacuna.nivelMinimo),
  );
}

function lacunasCobertas(curso: CursoCandidato, lacunas: Lacuna[]): Lacuna[] {
  return lacunas.filter((l) => ensina(curso, l));
}

function nivelEnsinadoDe(curso: CursoCandidato, slug: string): number {
  return pesoNivel(curso.habilidades.find((h) => h.slug === slug)?.nivelEnsinado ?? "iniciante");
}

/**
 * Quanto maior, melhor o curso para esta lacuna. O que mais pesa é a adequação
 * ao estudante (não pedir mais do que ele tem); depois vêm o foco do curso na
 * habilidade, o certificado e o bônus por cobrir outras lacunas da mesma vaga.
 */
function pontuar(curso: CursoCandidato, lacuna: Lacuna, todas: Lacuna[]): number {
  let pontos = 0;
  // Bônus por resolver outras lacunas de uma vez; as obrigatórias valem mais.
  for (const outra of todas) {
    if (outra.slug !== lacuna.slug && ensina(curso, outra)) pontos += outra.obrigatorio ? 10 : 4;
  }
  if (curso.certificado) pontos += 3;
  // Curso dedicado à habilidade (ela é a principal dele) vale mais que um
  // curso que só passa por ela.
  if (curso.habilidades.some((h) => h.slug === lacuna.slug && h.principal)) pontos += 5;
  // Curso que já começa acima do nível do estudante tende a frustrar.
  const nivelDoEstudante = lacuna.nivelAtual ?? "iniciante";
  if (pesoNivel(curso.nivel) > pesoNivel(nivelDoEstudante)) pontos -= 10;
  // Ensinar muito além do que a vaga pede alonga o caminho sem necessidade.
  pontos -= 2 * (nivelEnsinadoDe(curso, lacuna.slug) - pesoNivel(lacuna.nivelMinimo));
  // Entre empates, o de menor carga horária chega mais rápido ao objetivo.
  pontos -= curso.cargaHoraria / 1000;
  return pontos;
}

export function recomendarCursos(lacunas: Lacuna[], cursos: CursoCandidato[]): Recomendacoes {
  const porLacuna: RecomendacaoDaLacuna[] = lacunas.map((lacuna) => {
    const candidatos = cursos
      .filter((c) => ensina(c, lacuna))
      .sort((a, b) => pontuar(b, lacuna, lacunas) - pontuar(a, lacuna, lacunas));
    return {
      lacuna,
      melhorGratuito: candidatos.find((c) => c.gratuito) ?? null,
      melhorPago: candidatos.find((c) => !c.gratuito) ?? null,
    };
  });

  const maisUteis = cursos
    .map((curso) => ({
      curso,
      lacunasCobertas: lacunasCobertas(curso, lacunas).map((l) => l.nome),
    }))
    .filter((x) => x.lacunasCobertas.length >= 2)
    .sort((a, b) => b.lacunasCobertas.length - a.lacunasCobertas.length)
    .slice(0, 3);

  return { porLacuna, maisUteis };
}
