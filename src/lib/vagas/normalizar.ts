import type { HabilidadeBase } from "../dados/habilidades";
import { extrairHabilidades, normalizar } from "../extrair-habilidades";
import { extrairSalarioDoTexto, type Salario } from "../salario";
import { espacarFrases, truncar } from "./texto";
import type { VagaExterna } from "./tipos";

export type TipoDeVaga = "estagio" | "trainee" | "junior";

export type VagaNormalizada = VagaExterna & {
  tipo: TipoDeVaga;
  modalidade: "remoto" | "hibrido" | "presencial";
  area: string;
  requisitos: { slug: string; nivelMinimo: "iniciante"; obrigatorio: boolean }[];
  /** Salário ou bolsa mensal: o que a fonte informou ou, na falta, o que está no texto do anúncio. */
  salario: Salario | null;
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

/** Área sugerida pelo cargo, para quando os requisitos não bastam (ou não existem). */
const AREAS_PELO_TITULO: [RegExp, string][] = [
  [/\b(seguranca da informacao|ciberseguranca|cybersecurity|soc)\b/, "Segurança"],
  [/\b(qa|testes?|qualidade de software|tester)\b/, "Qualidade"],
  [/\b(dados|data|bi|business intelligence|cientista)\b/, "Dados"],
  [/\b(infraestrutura|redes|devops|cloud|sysadmin)\b/, "Infraestrutura"],
  [/\b(suporte|help ?desk|service desk)\b/, "Suporte"],
  [/\b(desenvolvedor[a]?|desenvolvimento de (software|sistemas)|programador[a]?|software|developer|engineer|engenheiro de software)\b/, "Programação"],
];

export function areaPeloTitulo(titulo: string): string | null {
  const t = normalizar(titulo);
  return AREAS_PELO_TITULO.find(([regex]) => regex.test(t))?.[1] ?? null;
}

/**
 * Título que indica trabalho de TI. Serve para manter vagas como "Estágio em Tecnologia
 * da Informação", que quase nunca listam tecnologias no resumo do anúncio.
 */
const SINAIS_DE_TI =
  /\b(t\.?i\.?|tecnologia da informacao|informatica|analista de sistemas|sistemas de informacao|software|desenvolvedor[a]?(?!(?: a)? de negocios)|desenvolvimento de (software|sistemas)|programador[a]?|analise e desenvolvimento|infraestrutura de ti|seguranca da informacao|ciberseguranca|suporte (tecnico|de ti|ti)|tecnico de (suporte|informatica|ti)|analista de suporte(?! (comercial|ao cliente|de vendas|administrativo|financeiro|operacional|de negocios))|help ?desk|service desk|devops|qa|testes? de software|analista de dados|(estagio|estagiario|estagiaria) (em|de) (dados|data)(?! cadastra)|cientista de dados|engenheiro de dados|inteligencia de dados|business intelligence|dados e ia|front-?end|back-?end|full ?stack)\b/;

export function pareceDeTI(titulo: string): boolean {
  return SINAIS_DE_TI.test(normalizar(titulo));
}

/**
 * A área que mais pesa entre as habilidades pedidas (ignorando as genéricas).
 * Habilidade citada no título vale três vezes mais: o cargo diz mais sobre a área
 * do que a lista de requisitos. Sem pistas nas habilidades, usa o cargo.
 */
export function escolherArea(slugs: string[], catalogo: HabilidadeBase[], titulo = ""): string {
  const doTitulo = new Set(titulo ? extrairHabilidades(titulo, catalogo) : []);
  const pontos = new Map<string, number>();
  for (const slug of slugs) {
    const area = catalogo.find((h) => h.slug === slug)?.area;
    if (area && !AREAS_GENERICAS.has(area)) pontos.set(area, (pontos.get(area) ?? 0) + (doTitulo.has(slug) ? 3 : 1));
  }
  const melhor = [...pontos.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  return melhor ?? areaPeloTitulo(titulo) ?? catalogo.find((h) => h.slug === slugs[0])?.area ?? "TI em geral";
}

/**
 * Habilidades que aparecem em muita vaga que NÃO é de TI (o "suporte" ao cliente, o "Excel" do
 * administrativo, o inglês). Sozinhas, não bastam para provar que a vaga é de tecnologia.
 */
const HABILIDADES_FRACAS = new Set(["ingles", "ageis", "suporte", "analise-dados"]);
const MIN_TECNICAS_FORTES_SEM_CARGO_DE_TI = 2;

/**
 * Transforma uma vaga bruta em uma vaga do site. Devolve null quando não serve:
 *  - não é para iniciantes; ou
 *  - não parece de TI: o cargo não indica tecnologia E o texto pede menos de duas habilidades técnicas fortes.
 * Vaga claramente de TI mas sem tecnologias citadas é mantida SEM requisitos; o site mostra isso
 * com clareza em vez de inventar uma compatibilidade.
 */
export function normalizarVaga(v: VagaExterna, catalogo: HabilidadeBase[]): VagaNormalizada | null {
  const tipo = detectarTipo(v.titulo, v.rotulos);
  if (!tipo) return null;

  const requisitos = extrairRequisitos(v.titulo, v.descricao, catalogo);
  const tecnicasFortes = requisitos.filter((r) => r.obrigatorio && !HABILIDADES_FRACAS.has(r.slug)).length;
  // Cargo sem cara de TI precisa de provas no texto: uma menção solta (ex.: "IA" num programa geral de estágio) não basta.
  if (!pareceDeTI(v.titulo) && tecnicasFortes < MIN_TECNICAS_FORTES_SEM_CARGO_DE_TI) return null;

  return {
    ...v,
    cidade: v.cidade || "Brasil",
    // As habilidades já foram lidas do texto original; aqui só arrumamos a versão exibida.
    descricao: truncar(espacarFrases(v.descricao), 1500),
    tipo,
    modalidade: detectarModalidade(v),
    area: escolherArea(requisitos.map((r) => r.slug), catalogo, v.titulo),
    requisitos,
    // Lido do texto COMPLETO (antes de truncar), que é onde a bolsa costuma aparecer, perto do fim.
    salario: v.salario ?? extrairSalarioDoTexto(v.descricao),
  };
}
