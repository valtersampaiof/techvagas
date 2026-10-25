import { salarioDeCamposDaFonte } from "../../salario";
import { pedirJson, buscarPorTermos } from "../http";
import { dataOuNull, htmlParaTexto, textoOuVazio, urlSegura } from "../texto";
import type { FonteExterna, VagaExterna } from "../tipos";

/** API oficial da Adzuna (https://developer.adzuna.com). Exige app_id e app_key gratuitos. */
const TERMOS = [
  "estágio desenvolvedor",
  "estágio tecnologia da informação",
  "desenvolvedor júnior",
  "analista de suporte júnior",
  "analista de dados júnior",
  "estágio infraestrutura redes",
  "segurança da informação júnior",
  "trainee tecnologia",
  "qa júnior testes",
];

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
    const vagas = await buscarPorTermos(TERMOS, async (termo) => {
      const url = new URL("https://api.adzuna.com/v1/api/jobs/br/search/1");
      url.search = new URLSearchParams({
        app_id: process.env.ADZUNA_APP_ID!,
        app_key: process.env.ADZUNA_APP_KEY!,
        what: termo,
        results_per_page: "50",
        max_days_old: "30",
        sort_by: "date",
      }).toString();
      return converterAdzuna(await pedirJson(url.toString()));
    });
    return vagas;
  },
};
