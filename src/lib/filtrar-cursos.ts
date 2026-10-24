import { normalizar } from "./extrair-habilidades";
import type { CursoCandidato } from "./compatibilidade";
import { pesoNivel } from "./niveis";

export type FiltrosDeCursos = {
  /** Texto livre: procura no título, na instituição e na descrição. */
  q?: string;
  habilidade?: string;
  preco?: string; // "gratuito" | "pago"
  /** Nível em que o curso COMEÇA. */
  nivel?: string;
  /** Nível até onde o curso LEVA (na habilidade escolhida, ou em qualquer uma). */
  alcance?: string; // "intermediario" | "avancado"
  certificado?: string;
  idioma?: string; // "pt" | "en"
  duracao?: string; // "curto" | "medio" | "longo"
  ordem?: string; // "relevancia" | "menor" | "maior" | "az"
};

export const DURACOES: Record<string, { rotulo: string; min: number; max: number }> = {
  curto: { rotulo: "Curto (até 10 h)", min: 0, max: 10 },
  medio: { rotulo: "Médio (11 a 40 h)", min: 11, max: 40 },
  longo: { rotulo: "Longo (mais de 40 h)", min: 41, max: Infinity },
};

export const ORDENS: Record<string, string> = {
  relevancia: "Mais relevantes (gratuitos com certificado primeiro)",
  menor: "Menor carga horária",
  maior: "Maior carga horária",
  az: "Ordem alfabética",
};

/** Instituições brasileiras (ou com cursos feitos em português). */
const INSTITUICOES_EM_PORTUGUES = /\b(alura|curso em v[ií]deo|funda[cç][aã]o bradesco|dio\b|digital innovation|usp\b|cultura inglesa|desec|rocketseat|khan academy|santander|oracle next education)/i;
/** Plataformas cujo conteúdo é em inglês, mesmo quando o nome do curso tem palavras como "de" ou "com". */
const INSTITUICOES_EM_INGLES = /\b(hackerrank|datacamp)\b/i;
/**
 * Na Coursera, só os certificados do Google e os cursos da USP são conhecidos por terem versão em português;
 * os demais (Meta, IBM, DeepLearning.AI...) têm o nome traduzido aqui, mas o conteúdo é em inglês.
 */
const COURSERA_COM_VERSAO_EM_PORTUGUES = /\b(google|usp)\b/i;

const SINAIS_DE_LINK_EM_PORTUGUES = /\/pt-br\/|\/pt\/|\/pt_br|locale=pt|#pt-br|\.com\.br|\.org\.br|pt\.khanacademy|pt-br\./i;
const PALAVRAS_DE_TITULO_EM_PORTUGUES = /\b(de|do|da|dos|das|com|para|em|um|uma|aprenda|fundamentos|introdu[cç][aã]o|curso|forma[cç][aã]o|certificado|guia|boas|treinamento|central|estat[ií]stica|certifica[cç][aã]o|tutorial de)\b|[ãõçáéíóúâêô]/i;

/**
 * "pt" quando o curso é em português ou tem versão em português; "en" caso contrário. É uma estimativa
 * feita a partir de sinais no endereço, no título e na descrição: confira no site do curso.
 */
export function idiomaDoCurso(c: Pick<CursoCandidato, "titulo" | "instituicao" | "link" | "descricao">): "pt" | "en" {
  const d = c.descricao;
  const dizEmIngles = /\bem ingl[eê]s\b/i.test(d);
  const mencionaPortugues = /portugu[eê]s/i.test(d);
  if (dizEmIngles && !mencionaPortugues) return "en";
  if (INSTITUICOES_EM_INGLES.test(c.instituicao) && !mencionaPortugues) return "en";
  const tituloPodeIndicarPortugues =
    !/\(coursera\)/i.test(c.instituicao) || COURSERA_COM_VERSAO_EM_PORTUGUES.test(c.instituicao);
  if (
    mencionaPortugues ||
    SINAIS_DE_LINK_EM_PORTUGUES.test(c.link) ||
    INSTITUICOES_EM_PORTUGUES.test(c.instituicao) ||
    (tituloPodeIndicarPortugues && PALAVRAS_DE_TITULO_EM_PORTUGUES.test(c.titulo))
  ) {
    return dizEmIngles && !mencionaPortugues ? "en" : "pt";
  }
  // A Cisco Networking Academy oferece a maioria dos cursos em português (os de inglês, não).
  if (/cisco networking academy/i.test(c.instituicao) && !/english/i.test(c.titulo)) return "pt";
  return "en";
}

/** Maior nível (1 a 3) que o curso ensina; se houver habilidade escolhida, só conta ela. */
export function alcanceDoCurso(c: CursoCandidato, habilidade?: string): number {
  return Math.max(0, ...c.habilidades.filter((h) => !habilidade || h.slug === habilidade).map((h) => pesoNivel(h.nivelEnsinado)));
}

export function filtrarCursos(cursos: CursoCandidato[], f: FiltrosDeCursos): CursoCandidato[] {
  const palavras = f.q ? normalizar(f.q).split(/\s+/).filter(Boolean) : [];
  const duracao = f.duracao ? DURACOES[f.duracao] : undefined;
  const alcanceMinimo = f.alcance ? pesoNivel(f.alcance) : 0;

  return cursos.filter((c) => {
    if (palavras.length > 0) {
      const texto = normalizar(`${c.titulo} ${c.instituicao} ${c.descricao}`);
      if (!palavras.every((p) => texto.includes(p))) return false;
    }
    if (f.habilidade && !c.habilidades.some((h) => h.slug === f.habilidade)) return false;
    if (f.preco === "gratuito" && !c.gratuito) return false;
    if (f.preco === "pago" && c.gratuito) return false;
    if (f.nivel && c.nivel !== f.nivel) return false;
    if (alcanceMinimo > 0 && alcanceDoCurso(c, f.habilidade) < alcanceMinimo) return false;
    if (f.certificado && !c.certificado) return false;
    if (f.idioma && idiomaDoCurso(c) !== f.idioma) return false;
    if (duracao && (c.cargaHoraria < duracao.min || c.cargaHoraria > duracao.max)) return false;
    return true;
  });
}

export function ordenarCursos(cursos: CursoCandidato[], ordem?: string): CursoCandidato[] {
  const copia = [...cursos];
  const porTitulo = (a: CursoCandidato, b: CursoCandidato) => a.titulo.localeCompare(b.titulo, "pt-BR");
  switch (ordem) {
    case "menor":
      return copia.sort((a, b) => a.cargaHoraria - b.cargaHoraria || porTitulo(a, b));
    case "maior":
      return copia.sort((a, b) => b.cargaHoraria - a.cargaHoraria || porTitulo(a, b));
    case "az":
      return copia.sort(porTitulo);
    default:
      // Relevância: gratuitos com certificado, depois gratuitos, depois pagos. Em empate, os em português
      // primeiro e, por fim, ordem alfabética (neutra: o mais curto não é necessariamente o melhor).
      return copia.sort(
        (a, b) =>
          Number(b.gratuito) * 2 + Number(b.certificado) - (Number(a.gratuito) * 2 + Number(a.certificado)) ||
          Number(idiomaDoCurso(b) === "pt") - Number(idiomaDoCurso(a) === "pt") ||
          porTitulo(a, b),
      );
  }
}
