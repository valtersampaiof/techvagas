import type { HabilidadeBase } from "../dados/habilidades";
import { extrairHabilidades, normalizar } from "../extrair-habilidades";
import { truncar } from "./texto";
import type { VagaExterna } from "./tipos";

export type TipoDeVaga = "estagio" | "trainee" | "junior";

export type VagaNormalizada = VagaExterna & {
  tipo: TipoDeVaga;
  modalidade: "remoto" | "hibrido" | "presencial";
  area: string;
  requisitos: { slug: string; nivelMinimo: "iniciante"; obrigatorio: boolean }[];
};

const NIVEL_ACIMA = /\b(senior|sr|pleno|pl|especialista|lead|tech lead|staff|principal|gerente|coordenador|head)\b/;
const ESTAGIO = /\b(estagio|estagiario|estagiaria|intern|internship)\b/;
const TRAINEE = /\btrainee\b/;
const JUNIOR = /\b(junior|jr|entry[ -]level)\b/;

/** Descobre se a vaga é para quem está começando; se não for, devolve null. */
export function detectarTipo(titulo: string, rotulos: string[] = []): TipoDeVaga | null {
  const t = normalizar(titulo);
  const r = normalizar(rotulos.join(" "));

  if (ESTAGIO.test(t)) return "estagio";
  if (TRAINEE.test(t)) return "trainee";
  // Título de nível mais alto vence as etiquetas (muitas fontes marcam "Júnior" e "Pleno" juntos).
  if (NIVEL_ACIMA.test(t)) return null;
  if (JUNIOR.test(t)) return "junior";

  if (ESTAGIO.test(r)) return "estagio";
  if (TRAINEE.test(r)) return "trainee";
  if (JUNIOR.test(r)) return "junior";
  return null;
}

export function detectarModalidade(v: VagaExterna): "remoto" | "hibrido" | "presencial" {
  if (v.modalidade) return v.modalidade;
  const t = normalizar([v.titulo, v.cidade, ...(v.rotulos ?? []), v.descricao.slice(0, 1500)].join(" "));
  if (/\bhibrid[oa]\b/.test(t)) return "hibrido";
  if (/\b(remot[oa]|home ?office|anywhere|trabalho a distancia)\b/.test(t)) return "remoto";
  return "presencial";
}

const MARCADOR_DE_DIFERENCIAL =
  /(diferenciais?|desej[aá]ve(?:l|is)|nice[ -]to[ -]have|b[oô]nus|(?:would be )?a plus|ser[aá] um plus)/i;

/**
 * Habilidades vistas no título ou antes do trecho "diferenciais/desejável" são
 * obrigatórias; as que só aparecem depois dele são desejáveis.
 */
export function extrairRequisitos(titulo: string, descricao: string, catalogo: HabilidadeBase[]) {
  const corte = descricao.search(MARCADOR_DE_DIFERENCIAL);
  const principal = corte === -1 ? descricao : descricao.slice(0, corte);
  const diferencial = corte === -1 ? "" : descricao.slice(corte);

  const obrigatorias = new Set(extrairHabilidades(`${titulo}\n${principal}`, catalogo));
  const desejaveis = extrairHabilidades(diferencial, catalogo).filter((s) => !obrigatorias.has(s));

  return [
    ...[...obrigatorias].map((slug) => ({ slug, nivelMinimo: "iniciante" as const, obrigatorio: true })),
    ...desejaveis.map((slug) => ({ slug, nivelMinimo: "iniciante" as const, obrigatorio: false })),
  ];
}

const AREAS_GENERICAS = new Set(["Ferramentas", "Idiomas", "Gestão"]);

/**
 * A área que mais pesa entre as habilidades pedidas (ignorando as genéricas).
 * Habilidade citada no título vale três vezes mais: o cargo diz mais sobre a área
 * do que a lista de requisitos.
 */
export function escolherArea(slugs: string[], catalogo: HabilidadeBase[], titulo = ""): string {
  const doTitulo = new Set(titulo ? extrairHabilidades(titulo, catalogo) : []);
  const pontos = new Map<string, number>();
  for (const slug of slugs) {
    const area = catalogo.find((h) => h.slug === slug)?.area;
    if (area && !AREAS_GENERICAS.has(area)) pontos.set(area, (pontos.get(area) ?? 0) + (doTitulo.has(slug) ? 3 : 1));
  }
  const ordenadas = [...pontos.entries()].sort((a, b) => b[1] - a[1]);
  return ordenadas[0]?.[0] ?? catalogo.find((h) => h.slug === slugs[0])?.area ?? "Outras";
}

/**
 * Transforma uma vaga bruta em uma vaga do site. Devolve null quando não serve:
 * não é para iniciantes, ou não pede nenhuma habilidade que a gente reconheça
 * (nesse caso a "compatibilidade" não significaria nada).
 */
export function normalizarVaga(v: VagaExterna, catalogo: HabilidadeBase[]): VagaNormalizada | null {
  const tipo = detectarTipo(v.titulo, v.rotulos);
  if (!tipo) return null;

  const requisitos = extrairRequisitos(v.titulo, v.descricao, catalogo);
  if (requisitos.length === 0) return null;

  return {
    ...v,
    cidade: v.cidade || "Brasil",
    descricao: truncar(v.descricao, 1500),
    tipo,
    modalidade: detectarModalidade(v),
    area: escolherArea(requisitos.map((r) => r.slug), catalogo, v.titulo),
    requisitos,
  };
}
