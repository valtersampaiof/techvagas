import { salarioDeCamposDaFonte } from "../../salario";
import { buscarPorTermos, pausa, pedirJson } from "../http";
import { dataOuNull, htmlParaTexto, textoOuVazio, urlSegura } from "../texto";
import type { FonteExterna, VagaExterna } from "../tipos";

/** API oficial da Adzuna (https://developer.adzuna.com). Exige app_id e app_key gratuitos. */
type Busca = { termo: string; paginas: number };

/** Termos amplos trazem muitas vagas, então valem duas páginas (até 100 vagas); os específicos, uma. */
const TERMOS_AMPLOS = ["desenvolvedor", "engenheiro de software", "analista de sistemas", "analista de dados", "devops", "analista de suporte", "segurança da informação", "qa testes"];
const TERMOS_ESPECIFICOS = [
  // Estágio e trainee
  "estágio desenvolvedor", "estágio tecnologia da informação", "estágio infraestrutura redes", "trainee tecnologia",
  // Níveis e funções de TI
  "desenvolvedor júnior", "desenvolvedor pleno", "desenvolvedor sênior", "analista de dados júnior", "cientista de dados", "engenheiro de dados",
  "arquiteto de software", "arquiteto de soluções", "tech lead", "full stack", "front-end", "back-end", "desenvolvedor mobile",
  "java", "python", ".net", "php", "react", "node.js", "cloud aws azure", "infraestrutura ti", "administrador de redes", "dba banco de dados",
  "scrum master", "product owner", "gerente de ti", "coordenador de ti", "sap", "ux designer", "analista de bi",
];
const BUSCAS: Busca[] = [
  ...TERMOS_AMPLOS.map((termo) => ({ termo, paginas: 2 })),
  ...TERMOS_ESPECIFICOS.map((termo) => ({ termo, paginas: 1 })),
];

/** O plano gratuito da Adzuna limita as chamadas por minuto: uma pausa maior entre elas evita o erro 429. */
const PAUSA_MS = 2000;
const POR_PAGINA = 50;

type ResultadoAdzuna = {
  id?: string | number;
  title?: string;
  description?: string;
  redirect_url?: string;
  created?: string;
  salary_min?: number | null;
  salary_max?: number | null;
  /** "1" quando o valor é uma estimativa da Adzuna, e não o que o anúncio informa. */
  salary_is_predicted?: string | number | null;
  company?: { display_name?: string };
  location?: { display_name?: string };
};

export function converterAdzuna(json: unknown): VagaExterna[] {
  const resultados = (json as { results?: ResultadoAdzuna[] } | null)?.results;
  if (!Array.isArray(resultados)) return [];

  return resultados.flatMap((r) => {
    const link = urlSegura(r.redirect_url);
    const titulo = htmlParaTexto(textoOuVazio(r.title));
    if (r.id === undefined || !link || !titulo) return [];
    return [{
      origem: "adzuna",
      idExterno: String(r.id),
      titulo,
      empresa: textoOuVazio(r.company?.display_name) || "Empresa não informada",
      cidade: textoOuVazio(r.location?.display_name),
      descricao: htmlParaTexto(textoOuVazio(r.description)),
      link,
      publicadaEm: dataOuNull(r.created),
      // Os valores da Adzuna são anuais. Estimativas dela (salary_is_predicted = 1) não são usadas.
      salario: String(r.salary_is_predicted) === "1" ? null : salarioDeCamposDaFonte(r.salary_min, r.salary_max, "ano"),
    }];
  });
}

export const adzuna: FonteExterna = {
  origem: "adzuna",
  rotulo: "Adzuna",
  indisponivel: () =>
    process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY ? null : "defina ADZUNA_APP_ID e ADZUNA_APP_KEY no arquivo .env",

  async buscar() {
    return buscarPorTermos(
      BUSCAS,
      async ({ termo, paginas }) => {
        const vagas: VagaExterna[] = [];
        for (let pagina = 1; pagina <= paginas; pagina++) {
          const url = new URL(`https://api.adzuna.com/v1/api/jobs/br/search/${pagina}`);
          url.search = new URLSearchParams({
            app_id: process.env.ADZUNA_APP_ID!,
            app_key: process.env.ADZUNA_APP_KEY!,
            what: termo,
            results_per_page: String(POR_PAGINA),
            max_days_old: "30",
            sort_by: "date",
          }).toString();
          const json = await pedirJson(url.toString());
          vagas.push(...converterAdzuna(json));
          if (((json as { results?: unknown[] } | null)?.results?.length ?? 0) < POR_PAGINA) break;
          await pausa(PAUSA_MS);
        }
        return vagas;
      },
      PAUSA_MS,
    );
  },
};
