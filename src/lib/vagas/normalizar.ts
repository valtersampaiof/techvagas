import type { HabilidadeBase } from "../dados/habilidades";
import { extrairHabilidades, normalizar } from "../extrair-habilidades";
import type { Nivel } from "../niveis";
import { extrairSalarioDoTexto, type Salario } from "../salario";
import type { Contrato, TipoDeVaga } from "../tipos-de-vaga";
import { organizarDescricao, textoSimples } from "./organizar";
import { ehBancoDeTalentos, espacarFrases, truncar } from "./texto";
import type { VagaExterna } from "./tipos";

export type { TipoDeVaga } from "../tipos-de-vaga";

export type VagaNormalizada = VagaExterna & {
  tipo: TipoDeVaga;
  /** Outros níveis que o título aceita (",senior,"), ou "". */
  niveisExtras: string;
  contrato: Contrato;
  /** Atividades da vaga em poucas linhas, para o cartão. */
  resumo: string;
  /** O anúncio organizado em seções, em JSON (`DescricaoOrganizada`). */
  detalhes: string;
  modalidade: "remoto" | "hibrido" | "presencial";
  area: string;
  requisitos: { slug: string; nivelMinimo: Nivel; obrigatorio: boolean }[];
  /** Salário ou bolsa mensal: o que a fonte informou ou, na falta, o que está no texto do anúncio. */
  salario: Salario | null;
};

const ESTAGIO = /\b(estagio|estagiario|estagiaria|intern|internship)\b/;
const TRAINEE = /\btrainee\b/;
const JUNIOR = /\b(junior|jr|entry[ -]level|iniciante)\b/;
// "PL/SQL" não é "pleno"; "SR 1067" é código de vaga, não "sênior".
const PLENO = /\b(pleno|pl(?![/-]?\s*sql)|mid|middle|mid[ -]level|intermediate)\b/;
const SENIOR = /\b(senior|sr(?!\s*\d)|especialista|specialist|staff|principal|arquiteto|arquiteta|architect|expert)\b/;
const LIDERANCA =
  /\b(gerente|coordenador|coordenadora|head|diretor|diretora|supervisor|supervisora|lider|leader|lideranca|lead|cto|cio|ciso|engineering manager|manager)\b/;
const PAPEL = /\b(analista|desenvolvedor|desenvolvedora|engenheiro|engenheira|developer|engineer|programador|programadora|tecnico|administrador|consultor|consultora|arquiteto|dba|especialista)\b/;
/** "Analista de Sistemas II": a numeração romana no fim do cargo indica o nível (I júnior, II pleno, III em diante sênior). */
const NIVEL_ROMANO = /\b(i|ii|iii|iv)\s*$/;

/** Níveis que aparecem no texto do cargo (ou nas etiquetas). Quando há mais de um ("Júnior/Pleno"), vale o menor. */
function nivelNoTexto(textoNormalizado: string): TipoDeVaga | null {
  const t = textoNormalizado.replace(/semi[ -]?senior/g, "pleno");
  if (JUNIOR.test(t)) return "junior";
  if (PLENO.test(t)) return "pleno";
  if (LIDERANCA.test(t)) return "lideranca";
  if (SENIOR.test(t)) return "senior";
  return null;
}

/**
 * Outros níveis que o título também aceita: "Pleno/Sênior" é uma vaga de nível pleno (o menor), mas também serve a quem
 * é sênior, e deve aparecer nos dois filtros. Devolve ",senior," (com vírgulas nas pontas, para a busca no banco) ou "".
 */
export function niveisExtrasDoTitulo(titulo: string, tipo: TipoDeVaga): string {
  if (tipo !== "junior" && tipo !== "pleno") return "";
  const t = normalizar(titulo).replace(/semi[ -]?senior/g, "pleno");
  const presentes: TipoDeVaga[] = [];
  if (/\b(junior|jr)\b/.test(t)) presentes.push("junior");
  if (PLENO.test(t)) presentes.push("pleno");
  if (/\b(senior|sr(?!\s*\d))\b/.test(t)) presentes.push("senior");
  const extras = presentes.filter((n) => n !== tipo);
  return extras.length > 0 ? `,${extras.join(",")},` : "";
}

const ANOS = String.raw`(\d{1,2})\s*(?:\+|ou mais)?\s*(?:(?:a|ate|-|to)\s*\d{1,2}\s*)?`;
const PADROES_DE_EXPERIENCIA = [
  new RegExp(`${ANOS}anos?\\s+(?:de\\s+)?(?:\\w+\\s+){0,2}experiencia`, "g"),
  new RegExp(`experiencia\\s+(?:\\w+\\s+){0,6}?${ANOS}anos`, "g"),
  new RegExp(`${ANOS}years?(?:\\s+of)?(?:\\s+\\w+){0,3}\\s+experience`, "g"),
  new RegExp(`experience[^.\\n]{0,40}?${ANOS}years`, "g"),
];
const SEM_EXPERIENCIA = /\b(sem experiencia (previa|anterior|profissional)|nao (e|sera) (necessari[oa]|exigid[oa]) (ter )?experiencia|no (prior )?experience (is )?(required|needed)|experiencia previa nao)\b/;

/**
 * Anos de experiência que o texto pede (o maior número entre os trechos encontrados), ou null se não pede.
 * "Sem experiência" vale 0. Em faixas ("3 a 5 anos"), conta o começo.
 */
export function anosDeExperiencia(texto: string): number | null {
  const t = normalizar(texto);
  if (SEM_EXPERIENCIA.test(t)) return 0;
  let maior: number | null = null;
  for (const padrao of PADROES_DE_EXPERIENCIA) {
    for (const m of t.matchAll(padrao)) {
      const n = Number(m[1]);
      if (n >= 0 && n <= 20) maior = Math.max(maior ?? 0, n);
    }
  }
  return maior;
}

function tipoPelosAnos(anos: number): TipoDeVaga {
  return anos <= 1 ? "junior" : anos <= 4 ? "pleno" : "senior";
}

/**
 * Descobre o nível da vaga. O título manda; depois vêm as etiquetas da fonte; depois a numeração romana do cargo
 * ("Analista II"); e, por último, os anos de experiência pedidos no texto. Sem nenhum sinal, "indefinido".
 */
export function detectarTipo(titulo: string, rotulos: string[] = [], descricao = ""): TipoDeVaga {
  const t = normalizar(titulo);
  const r = normalizar(rotulos.join(" "));

  if (ESTAGIO.test(t)) return "estagio";
  if (TRAINEE.test(t)) return "trainee";
  const doTitulo = nivelNoTexto(t);
  if (doTitulo) return doTitulo;

  if (ESTAGIO.test(r)) return "estagio";
  if (TRAINEE.test(r)) return "trainee";
  const dasEtiquetas = nivelNoTexto(r);
  if (dasEtiquetas) return dasEtiquetas;

  // Cada trecho do cargo ("Hering | Desenvolvedor Full Stack I (Blumenau/SC)") pode terminar com o número do nível.
  const romano = titulo
    .replace(/\([^)]*\)|\[[^\]]*\]/g, " ")
    .split(/\s[|–—-]\s/)
    .map((trecho) => ({ trecho: normalizar(trecho).trim() }))
    .map(({ trecho }) => (PAPEL.test(trecho) ? trecho.match(NIVEL_ROMANO)?.[1] : undefined))
    .find(Boolean);
  if (romano) return romano === "i" ? "junior" : romano === "ii" ? "pleno" : "senior";

  const anos = anosDeExperiencia(descricao);
  return anos === null ? "indefinido" : tipoPelosAnos(anos);
}

const PJ = /\b(pj|pessoa juridica|contrato pj|contratacao pj|prestador(a)? de servicos?)\b/;
const CLT = /\b(clt|carteira assinada|regime clt|contratacao clt|efetivo)\b/;

/**
 * Como a pessoa é contratada. Vale o que a fonte informou; senão, o que o anúncio diz (CLT, PJ ou os dois).
 * Sem menção, fica vazio: o site prefere não informar a chutar.
 */
export function detectarContrato(v: Pick<VagaExterna, "titulo" | "descricao" | "rotulos" | "contrato">, tipo: TipoDeVaga): Contrato {
  // Estágio nunca é CLT nem PJ, mesmo que a fonte tenha marcado assim (a Gupy marca vários como "efetivo").
  if (tipo === "estagio") return "estagio";
  if (v.contrato) return v.contrato;
  const t = normalizar([v.titulo, ...(v.rotulos ?? []), v.descricao].join(" "));
  const pj = PJ.test(t);
  const clt = CLT.test(t);
  return pj && clt ? "clt_pj" : pj ? "pj" : clt ? "clt" : "";
}

/** "100% remoto", "(remoto)", "Remote", "home office" no título; "acesso remoto" e "possibilidade de home office" não contam. */
const TITULO_REMOTO = /\b(100 ?(remot[oa]|home ?office)|totalmente remot[oa]|remote)\b/;
const TITULO_REMOTO_ENTRE_PARENTESES = /[(\[]\s*remot[oa]\s*[)\]]/i;

export function detectarModalidade(v: VagaExterna): "remoto" | "hibrido" | "presencial" {
  // Quando o próprio título diz que é remoto ("(100% remoto)", "React Developer Remote"), vale o título.
  if (TITULO_REMOTO.test(normalizar(v.titulo)) || TITULO_REMOTO_ENTRE_PARENTESES.test(v.titulo)) return "remoto";
  if (v.modalidade) return v.modalidade;
  const t = normalizar([v.titulo, v.cidade, ...(v.rotulos ?? []), v.descricao.slice(0, 1500)].join(" "));
  if (/\bhibrid[oa]\b/.test(t)) return "hibrido";
  if (/\b(remot[oa]|remote|home ?office|anywhere|trabalho a distancia)\b/.test(t)) return "remoto";
  return "presencial";
}

const MARCADOR_DE_DIFERENCIAL =
  /(diferenciais?|desej[aá]ve(?:l|is)|nice[ -]to[ -]have|b[oô]nus|(?:would be )?a plus|ser[aá] um plus)/i;

/**
 * Habilidades vistas no título ou antes do trecho "diferenciais/desejável" são
 * obrigatórias; as que só aparecem depois dele são desejáveis.
 */
/** Nível pedido de cada habilidade, conforme o nível da vaga. */
const NIVEL_DO_TIPO: Record<TipoDeVaga, Nivel> = {
  estagio: "iniciante",
  trainee: "iniciante",
  junior: "iniciante",
  indefinido: "iniciante",
  pleno: "intermediario",
  senior: "avancado",
  lideranca: "avancado",
};

/** Habilidades que não fazem sentido pedir em nível avançado, mesmo numa vaga sênior (Git avançado, inglês técnico avançado...). */
const TETO_DE_NIVEL: Record<string, Nivel> = { git: "intermediario", ingles: "intermediario", ageis: "intermediario", suporte: "intermediario" };

export function nivelDoRequisito(tipo: TipoDeVaga, slug: string): Nivel {
  const nivel = NIVEL_DO_TIPO[tipo];
  const teto = TETO_DE_NIVEL[slug];
  return teto && nivel === "avancado" ? teto : nivel;
}

export function extrairRequisitos(titulo: string, descricao: string, catalogo: HabilidadeBase[], tipo: TipoDeVaga = "junior") {
  const corte = descricao.search(MARCADOR_DE_DIFERENCIAL);
  const principal = corte === -1 ? descricao : descricao.slice(0, corte);
  const diferencial = corte === -1 ? "" : descricao.slice(corte);

  const obrigatorias = new Set(extrairHabilidades(`${titulo}\n${principal}`, catalogo));
  const desejaveis = extrairHabilidades(diferencial, catalogo).filter((s) => !obrigatorias.has(s));

  return [
    ...[...obrigatorias].map((slug) => ({ slug, nivelMinimo: nivelDoRequisito(tipo, slug), obrigatorio: true })),
    ...desejaveis.map((slug) => ({ slug, nivelMinimo: nivelDoRequisito(tipo, slug), obrigatorio: false })),
  ];
}

const AREAS_GENERICAS = new Set(["Ferramentas", "Idiomas", "Gestão"]);
const AREAS_DE_PROGRAMACAO = new Set(["Programação", "Desenvolvimento web", "Arquitetura"]);

/** Área sugerida pelo cargo, para quando os requisitos não bastam (ou não existem). */
const AREAS_PELO_TITULO: [RegExp, string][] = [
  [/\b(seguranca da informacao|ciberseguranca|cybersecurity|cyber security|soc|pentest(er)?|ciso)\b/, "Segurança"],
  [/\b(qa|testes?|qualidade de software|tester|sdet)\b/, "Qualidade"],
  [/\b(product owner|product manager|gerente de produto)\b/, "Produto"],
  [/\b(ux|ui|product designer)\b/, "Design"],
  [/\b(dados|data|bi|business intelligence|cientista|machine learning|analytics)\b/, "Dados"],
  [/\b(infraestrutura|redes|devops|devsecops|cloud|sysadmin|sre|dba|noc|administrador de (redes|sistemas|servidores))\b/, "Infraestrutura"],
  [/\b(suporte|help ?desk|service desk)\b/, "Suporte"],
  [/\b(sap|abap|protheus|totvs|erp)\b/, "Sistemas corporativos"],
  [/\b(desenvolvedor[a]?|desenvolvimento de (software|sistemas)|programador[a]?|software|developer|engineer|engenheiro de software|arquiteto de software|full ?stack|front-?end|back-?end)\b/, "Programação"],
  [/\b(scrum master|agilista|gerente de (projetos|ti|tecnologia)|coordenador de (ti|tecnologia)|project manager)\b/, "Gestão"],
];

export function areaPeloTitulo(titulo: string): string | null {
  const t = normalizar(titulo);
  return AREAS_PELO_TITULO.find(([regex]) => regex.test(t))?.[1] ?? null;
}

/**
 * Título que indica trabalho de TI. Serve para manter vagas como "Estágio em Tecnologia
 * da Informação", que quase nunca listam tecnologias no resumo do anúncio.
 */
const SINAIS_DE_TI = new RegExp(
  "\\b(" +
    [
      "t\\.?i\\.?", "tecnologia da informacao", "informatica", "analista de sistemas", "sistemas de informacao",
      "software", "desenvolvedor[a]?(?!(?: a)? de (negocios|mercado|vendas|hardware|canais|parcerias|talentos|pessoas|carreira))", "desenvolvimento de (software|sistemas)", "programador[a]?",
      "analise e desenvolvimento", "infraestrutura de ti", "analista de infraestrutura(?! (viaria|de obras|civil|predial|rodoviaria))",
      "seguranca da informacao", "ciberseguranca", "cyber ?security", "seguranca cibernetica", "pentest(er)?", "analista de vulnerabilidades",
      "suporte (tecnico|de ti|ti)", "tecnico de (suporte|informatica|ti|redes)",
      "analista de suporte(?! (comercial|ao cliente|de vendas|administrativo|financeiro|operacional|de negocios))",
      "help ?desk", "service desk", "devops", "devsecops", "sre", "site reliability",
      "qa", "testes? de software", "sdet", "analista de testes", "engenheiro de (testes|qualidade de software)",
      "analista de dados", "data analyst", "(estagio|estagiario|estagiaria) (em|de) (dados|data)(?! cadastra)", "cientista de dados",
      "data scientist", "engenheiro de dados", "data engineer", "analytics engineer", "inteligencia de dados", "business intelligence",
      "analista de bi", "dados e ia", "machine learning", "mlops", "(engenheiro|analista|especialista) de (ia|inteligencia artificial)",
      "front-?end", "back-?end", "full ?stack", "desenvolvedor mobile", "mobile developer", "(ios|android) developer",
      "arquiteto de (software|solucoes|dados|nuvem|cloud|infraestrutura|sistemas|seguranca|ti)",
      "(software|solutions?|cloud|data|security|enterprise) architect",
      "engenheiro de (software|plataforma|nuvem|cloud|seguranca|redes|infraestrutura|sistemas|computacao|automacao de testes)",
      "(software|platform|cloud|security|network|systems|devops|data|machine learning|ml|ai|qa|test|sre|backend|frontend|full ?stack|mobile|infrastructure|reliability|solutions?) engineer",
      "(?<!business |sales |market |account |product |talent |channel )developer",
      "tech(nical)? lead", "lider tecnico", "engineering manager",
      "gerente de (ti|tecnologia|engenharia de software|desenvolvimento|infraestrutura|seguranca da informacao|sistemas|projetos de ti)",
      "coordenador(a)? de (ti|tecnologia|desenvolvimento|infraestrutura|sistemas)", "diretor(a)? de (ti|tecnologia)", "cto", "cio", "ciso",
      "scrum master", "agilista", "agile coach", "product owner", "product manager", "gerente de produto", "analista de requisitos",
      "dba", "administrador(a)? de (banco de dados|bancos de dados|redes|sistemas|servidores|infraestrutura de ti)", "sysadmin",
      "analista de (redes(?! sociais)|seguranca|monitoramento|noc|soc|cloud|devops|integracao|banco de dados|banco de dados)",
      "analista (de )?(noc|soc)", "engenheiro de redes", "administrador(a)? de redes",
      "ux(?: ?/ ?ui)?", "ui ?/ ?ux", "product designer", "designer de (produto|interface|ux)",
      "consultor(a)? (de )?(sap|erp|protheus|totvs|salesforce|dynamics|servicenow|ti|tecnologia|seguranca da informacao|cloud)",
      "(sap|abap|protheus|totvs|salesforce|servicenow) (consultant|developer|consultor|analista|desenvolvedor)", "analista (sap|abap|erp|protheus)",
      "rpa",
    ].join("|") +
    ")\\b",
);

/**
 * Funções que não são de tecnologia, mesmo quando o anúncio cita TI ("Comprador Júnior - TI" é quem COMPRA equipamentos de
 * TI, não quem trabalha com TI). Só vale quando a função está logo no começo do cargo.
 */
const FUNCAO_NAO_TECNICA =
  /^(?:\w+\s+){0,2}(comprador[a]?|vendedor[a]?|recrutador[a]?|contador[a]?|advogad[oa]|motorista|enfermeir[oa]|cozinheir[oa]|analista (de (compras|vendas|marketing|recrutamento|recursos humanos|rh|cobranca|credito|cadastro|logistica)|comercial|contabil|fiscal|financeiro|juridico)|assistente (de (compras|vendas|rh|cobranca|logistica)|comercial|administrativo|financeiro)|auxiliar (de (compras|vendas|cobranca)|administrativo)|executivo de (contas|vendas)|gerente (de (contas|vendas|marketing|compras)|comercial|financeiro)|business developer|sdr)\b/;

export function ehFuncaoNaoTecnica(titulo: string): boolean {
  return FUNCAO_NAO_TECNICA.test(normalizar(titulo).trim());
}

export function pareceDeTI(titulo: string): boolean {
  return SINAIS_DE_TI.test(normalizar(titulo));
}

/**
 * A área que mais pesa entre as habilidades pedidas (ignorando as genéricas).
 * Habilidade citada no título vale três vezes mais: o cargo diz mais sobre a área
 * do que a lista de requisitos. Sem pistas nas habilidades, usa o cargo.
 */
export function escolherArea(slugs: string[], catalogo: HabilidadeBase[], titulo = ""): string {
  // O cargo diz a família da vaga (segurança, dados, infraestrutura...) melhor que a lista de tecnologias, que em vagas
  // sênior é longa e mistura tudo (um "Analista de Segurança" que cita Linux, redes e nuvem continua sendo de segurança).
  const doCargo = areaPeloTitulo(titulo);
  if (doCargo && doCargo !== "Programação") return doCargo;

  const doTitulo = new Set(titulo ? extrairHabilidades(titulo, catalogo) : []);
  const pontos = new Map<string, number>();
  for (const slug of slugs) {
    const area = catalogo.find((h) => h.slug === slug)?.area;
    if (!area || AREAS_GENERICAS.has(area)) continue;
    // Cargo de desenvolvimento: só contam as áreas de programação, para a infraestrutura citada na vaga não "roubar" a área.
    if (doCargo === "Programação" && !AREAS_DE_PROGRAMACAO.has(area)) continue;
    pontos.set(area, (pontos.get(area) ?? 0) + (doTitulo.has(slug) ? 3 : 1));
  }
  const melhor = [...pontos.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  return melhor ?? doCargo ?? catalogo.find((h) => h.slug === slugs[0])?.area ?? "TI em geral";
}

/**
 * Habilidades que aparecem em muita vaga que NÃO é de TI (o "suporte" ao cliente, o "Excel" do
 * administrativo, o inglês). Sozinhas, não bastam para provar que a vaga é de tecnologia.
 */
const HABILIDADES_FRACAS = new Set(["ingles", "ageis", "suporte", "analise-dados", "itil", "gestao-projetos", "produto", "lideranca", "lgpd", "erp"]);
const MIN_TECNICAS_FORTES_SEM_CARGO_DE_TI = 2;
/** Anúncios maiores que isto são cortados antes de organizar (o resto costuma ser rodapé jurídico e propaganda). */
const TAMANHO_MAXIMO_DO_ANUNCIO = 12_000;

/**
 * Transforma uma vaga bruta em uma vaga do site. Devolve null quando não serve:
 *  - é de banco de talentos (cadastro de currículos, não uma vaga aberta); ou
 *  - não parece de TI: o cargo não indica tecnologia E o texto pede menos de duas habilidades técnicas fortes.
 * Vaga claramente de TI mas sem tecnologias citadas é mantida SEM requisitos; o site mostra isso
 * com clareza em vez de inventar uma compatibilidade.
 */
export function normalizarVaga(v: VagaExterna, catalogo: HabilidadeBase[]): VagaNormalizada | null {
  if (ehBancoDeTalentos(v.titulo) || ehFuncaoNaoTecnica(v.titulo)) return null;
  const tipo = detectarTipo(v.titulo, v.rotulos, v.descricao);

  const requisitos = extrairRequisitos(v.titulo, v.descricao, catalogo, tipo);
  const tecnicasFortes = requisitos.filter((r) => r.obrigatorio && !HABILIDADES_FRACAS.has(r.slug)).length;
  // Cargo sem cara de TI precisa de provas no texto: uma menção solta (ex.: "IA" num programa geral de estágio) não basta.
  if (!pareceDeTI(v.titulo) && tecnicasFortes < MIN_TECNICAS_FORTES_SEM_CARGO_DE_TI) return null;

  const organizada = organizarDescricao(v.descricao.slice(0, TAMANHO_MAXIMO_DO_ANUNCIO));
  return {
    ...v,
    cidade: v.cidade || "Brasil",
    // As habilidades já foram lidas do texto original; aqui só arrumamos a versão exibida.
    descricao: truncar(espacarFrases(textoSimples(v.descricao)), 1500),
    resumo: organizada.resumo,
    detalhes: JSON.stringify(organizada),
    tipo,
    niveisExtras: niveisExtrasDoTitulo(v.titulo, tipo),
    contrato: detectarContrato(v, tipo),
    modalidade: detectarModalidade(v),
    area: escolherArea(requisitos.map((r) => r.slug), catalogo, v.titulo),
    requisitos,
    // Lido do texto COMPLETO (antes de truncar), que é onde a bolsa costuma aparecer, perto do fim.
    salario: v.salario ?? extrairSalarioDoTexto(v.descricao),
  };
}
