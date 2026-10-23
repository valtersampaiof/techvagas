import { buscarPorTermos, pausa, pedirJson } from "../http";
import { dataOuNull, htmlParaTexto, textoOuVazio, urlSegura } from "../texto";
import type { FonteExterna, VagaExterna } from "../tipos";

/**
 * Gupy: a maior plataforma de recrutamento do Brasil, com muito estágio e trainee.
 *
 * ATENÇÃO: não existe API pública oficial para candidatos. Usamos o mesmo endereço que a busca do
 * próprio site (portal.gupy.io) usa no navegador. O robots.txt do portal permite o acesso, mas isso é
 * não oficial: pode mudar ou ser bloqueado a qualquer momento. Por isso:
 *  - o volume é pequeno e há pausa entre as chamadas (~40 por execução);
 *  - nos identificamos no User-Agent;
 *  - cada vaga mostra a fonte e leva de volta à página original na Gupy.
 */
const ENDERECO = "https://portal.gupy.io/api/job-search/jobs";
const POR_PAGINA = 50;
const MAX_PAGINAS = 2; // até 100 vagas (as mais recentes) por busca

const ESTAGIO = "vacancy_type_internship";
const TRAINEE = "vacancy_type_trainee";

type Busca = { termo: string; tipo?: string };

const BUSCAS: Busca[] = [
  ...["tecnologia", "ti", "desenvolvedor", "dados", "suporte", "infraestrutura", "sistemas", "segurança da informação", "redes", "testes", "programação"]
    .map((termo) => ({ termo, tipo: ESTAGIO })),
  ...["tecnologia", "ti", "desenvolvedor", "dados"].map((termo) => ({ termo, tipo: TRAINEE })),
  ...[
    "desenvolvedor júnior",
    "analista de suporte júnior",
    "analista de dados júnior",
    "analista de sistemas júnior",
    "qa júnior",
    "segurança da informação júnior",
    "infraestrutura júnior",
    "suporte técnico júnior",
    "engenheiro de software júnior",
  ].map((termo) => ({ termo })),
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

/** Banco de talentos não é uma vaga aberta de verdade. */
const TIPOS_IGNORADOS = new Set(["vacancy_type_talent_pool"]);

/** Cadastro permanente de currículos, não uma vaga aberta de verdade. */
const BANCO_DE_TALENTOS = /\b(banco de talentos|cadastro (de )?reserva|banco de curr[ií]culos?)\b/i;
const DIAS_MAXIMOS_SEM_PRAZO = 180;
const DIA_MS = 24 * 60 * 60 * 1000;

/** Vaga com prazo vencido, ou sem prazo e antiga demais, provavelmente já não está aberta. */
function estaVencida(v: VagaGupy, agora: Date): boolean {
  const prazo = dataOuNull(v.applicationDeadline);
  if (prazo) return prazo.getTime() < agora.getTime();
  const publicada = dataOuNull(v.publishedDate);
  return publicada !== null && agora.getTime() - publicada.getTime() > DIAS_MAXIMOS_SEM_PRAZO * DIA_MS;
}

export function converterGupy(json: unknown, agora: Date = new Date()): VagaExterna[] {
  const vagas = (json as { data?: VagaGupy[] } | null)?.data;
  if (!Array.isArray(vagas)) return [];

  return vagas.flatMap((v) => {
    const link = urlSegura(v.jobUrl);
    const titulo = htmlParaTexto(textoOuVazio(v.name));
    if (v.id === undefined || !link || !titulo || TIPOS_IGNORADOS.has(textoOuVazio(v.type))) return [];
    if (BANCO_DE_TALENTOS.test(titulo) || estaVencida(v, agora)) return [];

    const cidade = [textoOuVazio(v.city), textoOuVazio(v.state)].filter(Boolean).join(", ");
    const rotulo = ROTULO_DO_TIPO[textoOuVazio(v.type)];
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
