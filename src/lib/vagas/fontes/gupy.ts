import { buscarPorTermos, pausa, pedirJson } from "../http";
import { interpretarLocal } from "../../localizacao";
import { escritoEmEspanhol, sinaisDeIdioma } from "../idioma";
import { dataOuNull, ehBancoDeTalentos, htmlParaTexto, textoOuVazio, urlSegura } from "../texto";
import type { Contrato } from "../../tipos-de-vaga";
import type { FonteExterna, VagaExterna } from "../tipos";

/**
 * Gupy: a maior plataforma de recrutamento do Brasil, com muito estágio e trainee.
 *
 * ATENÇÃO: não existe API pública oficial para candidatos. Usamos o mesmo endereço que a busca do
 * próprio site (portal.gupy.io) usa no navegador. O robots.txt do portal permite o acesso, mas isso é
 * não oficial: pode mudar ou ser bloqueado a qualquer momento. Por isso:
 *  - o volume é moderado e há pausa entre as chamadas (~130 por execução, a maioria de uma página só);
 *  - nos identificamos no User-Agent;
 *  - cada vaga mostra a fonte e leva de volta à página original na Gupy.
 */
const ENDERECO = "https://portal.gupy.io/api/job-search/jobs";
const POR_PAGINA = 50;
const MAX_PAGINAS = 2; // até 100 vagas (as mais recentes) por busca; a Gupy não devolve mais que isso por termo

const ESTAGIO = "vacancy_type_internship";
const TRAINEE = "vacancy_type_trainee";
const EFETIVO = "vacancy_type_effective";
const PJ = "vacancy_legal_entity";

type Busca = { termo: string; tipo?: string };

/** Funções de TI de todos os níveis. A Gupy devolve no máximo 100 vagas por busca, então vários termos cobrem mais. */
const TERMOS_DE_TI = [
  "desenvolvedor", "desenvolvedor java", "desenvolvedor python", "desenvolvedor .net", "desenvolvedor php", "desenvolvedor node",
  "desenvolvedor react", "desenvolvedor angular", "desenvolvedor mobile", "desenvolvedor full stack", "desenvolvedor front-end",
  "desenvolvedor back-end", "engenheiro de software", "arquiteto de software", "tech lead",
  "analista de sistemas", "analista de dados", "cientista de dados", "engenheiro de dados", "analista de bi", "machine learning",
  "devops", "sre", "cloud", "analista de infraestrutura", "administrador de redes", "analista de redes", "dba", "administrador de sistemas",
  "analista de suporte", "suporte técnico", "service desk", "help desk",
  "segurança da informação", "analista de segurança", "pentest",
  "qa", "analista de testes", "automação de testes",
  "scrum master", "product owner", "gerente de ti", "coordenador de ti", "gerente de projetos de ti",
  "sap", "protheus", "ux designer", "rpa", "tecnologia da informação", "ti",
];

const BUSCAS: Busca[] = [
  // Estágio e trainee (as buscas que o site já fazia)
  ...["tecnologia", "ti", "desenvolvedor", "dados", "suporte", "infraestrutura", "sistemas", "segurança da informação", "redes", "testes", "programação"]
    .map((termo) => ({ termo, tipo: ESTAGIO })),
  ...["tecnologia", "ti", "desenvolvedor", "dados"].map((termo) => ({ termo, tipo: TRAINEE })),
  // Vagas efetivas (CLT) de todos os níveis
  ...TERMOS_DE_TI.map((termo) => ({ termo, tipo: EFETIVO })),
  // Vagas PJ (pessoa jurídica): há bem menos, então poucos termos bastam
  ...["desenvolvedor", "engenheiro de software", "analista de sistemas", "analista de dados", "devops", "suporte", "segurança da informação", "qa", "ti"]
    .map((termo) => ({ termo, tipo: PJ })),
];

type VagaGupy = {
  id?: number | string;
  name?: string;
  description?: string;
  careerPageName?: string;
  type?: string;
  publishedDate?: string;
  applicationDeadline?: string;
  workplaceType?: string;
  city?: string;
  state?: string;
  jobUrl?: string;
};

const MODALIDADE: Record<string, VagaExterna["modalidade"]> = {
  "on-site": "presencial",
  hybrid: "hibrido",
  remote: "remoto",
};

const ROTULO_DO_TIPO: Record<string, string> = {
  [ESTAGIO]: "Estágio",
  [TRAINEE]: "Trainee",
};

/** Como a Gupy classifica o contrato. Só estes tipos são vagas de emprego: temporário, aprendiz, parceria e banco de talentos ficam de fora. */
const CONTRATO_DO_TIPO: Record<string, Contrato> = {
  [EFETIVO]: "clt",
  [PJ]: "pj",
  [ESTAGIO]: "estagio",
  [TRAINEE]: "",
};

const DIAS_MAXIMOS_SEM_PRAZO = 180;
const DIA_MS = 24 * 60 * 60 * 1000;

/** Vaga com prazo vencido, ou sem prazo e antiga demais, provavelmente já não está aberta. */
function estaVencida(v: VagaGupy, agora: Date): boolean {
  const prazo = dataOuNull(v.applicationDeadline);
  if (prazo) return prazo.getTime() < agora.getTime();
  const publicada = dataOuNull(v.publishedDate);
  return publicada !== null && agora.getTime() - publicada.getTime() > DIAS_MAXIMOS_SEM_PRAZO * DIA_MS;
}

/**
 * A Gupy também publica vagas de outros países da América Latina (a Stefanini Latam, a Logicalis Chile...). A API não
 * informa o país, então vale o idioma do anúncio e o local: cidade sem estado que não é brasileira, sem sinal de português.
 */
function ehDeFora(v: VagaGupy, titulo: string): boolean {
  const texto = `${titulo} ${htmlParaTexto(textoOuVazio(v.description)).slice(0, 1500)}`;
  if (escritoEmEspanhol(texto)) return true;
  const cidade = textoOuVazio(v.city);
  return cidade !== "" && textoOuVazio(v.state) === "" && interpretarLocal(cidade).uf === "" && sinaisDeIdioma(texto).portugues === 0;
}

export function converterGupy(json: unknown, agora: Date = new Date()): VagaExterna[] {
  const vagas = (json as { data?: VagaGupy[] } | null)?.data;
  if (!Array.isArray(vagas)) return [];

  return vagas.flatMap((v) => {
    const link = urlSegura(v.jobUrl);
    const titulo = htmlParaTexto(textoOuVazio(v.name));
    const tipo = textoOuVazio(v.type);
    if (v.id === undefined || !link || !titulo || !(tipo === "" || tipo in CONTRATO_DO_TIPO)) return [];
    if (ehBancoDeTalentos(titulo) || estaVencida(v, agora) || ehDeFora(v, titulo)) return [];

    const cidade = [textoOuVazio(v.city), textoOuVazio(v.state)].filter(Boolean).join(", ");
    const rotulo = ROTULO_DO_TIPO[tipo];
    return [{
      origem: "gupy",
      idExterno: String(v.id),
      titulo,
      empresa: textoOuVazio(v.careerPageName) || "Empresa não informada",
      cidade,
      descricao: htmlParaTexto(textoOuVazio(v.description)),
      link,
      publicadaEm: dataOuNull(v.publishedDate),
      modalidade: MODALIDADE[textoOuVazio(v.workplaceType)],
      rotulos: rotulo ? [rotulo] : [],
      contrato: CONTRATO_DO_TIPO[tipo] || undefined,
    }];
  });
}

export async function buscarPaginas({ termo, tipo }: Busca): Promise<VagaExterna[]> {
  const vagas: VagaExterna[] = [];
  for (let pagina = 0; pagina < MAX_PAGINAS; pagina++) {
    const parametros = new URLSearchParams({
      jobName: termo,
      limit: String(POR_PAGINA),
      offset: String(pagina * POR_PAGINA),
      sortBy: "publishedDate",
      sortOrder: "desc",
    });
    if (tipo) parametros.set("type", tipo);

    const json = await pedirJson(`${ENDERECO}?${parametros}`);
    const recebidas = (json as { data?: unknown[] } | null)?.data;
    vagas.push(...converterGupy(json));
    // Menos que uma página cheia: acabaram os resultados.
    if (!Array.isArray(recebidas) || recebidas.length < POR_PAGINA) break;
    await pausa();
  }
  return vagas;
}

export const gupy: FonteExterna = {
  origem: "gupy",
  rotulo: "Gupy",
  indisponivel: () => null,

  async buscar() {
    return buscarPorTermos(BUSCAS, buscarPaginas);
  },
};
