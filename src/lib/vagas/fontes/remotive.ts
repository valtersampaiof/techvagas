import { pedirJson, buscarPorTermos } from "../http";
import { dataOuNull, htmlParaTexto, htmlParaTextoEstruturado, textoOuVazio, urlSegura } from "../texto";
import type { FonteExterna, VagaExterna } from "../tipos";

/**
 * API pública da Remotive (https://github.com/remotive-com/remote-jobs-api): vagas 100% remotas, em inglês.
 * Não exige chave. Pelos termos de uso, evite chamar mais que algumas vezes por dia e mantenha o link
 * de volta para a vaga original (já mantemos).
 */
const CATEGORIAS = ["software-dev", "data", "devops", "qa", "product"];

/** Só interessa o que um brasileiro pode ocupar. */
const LOCAL_ACEITO = /(worldwide|anywhere|brazil|brasil|latam|latin america|americas|south america)/i;

type VagaRemotive = {
  id?: number | string;
  url?: string;
  title?: string;
  company_name?: string;
  publication_date?: string;
  candidate_required_location?: string;
  description?: string;
};

export function converterRemotive(json: unknown): VagaExterna[] {
  const vagas = (json as { jobs?: VagaRemotive[] } | null)?.jobs;
  if (!Array.isArray(vagas)) return [];

  return vagas.flatMap((j) => {
    const link = urlSegura(j.url);
    const titulo = htmlParaTexto(textoOuVazio(j.title));
    const local = textoOuVazio(j.candidate_required_location);
    if (j.id === undefined || !link || !titulo || !LOCAL_ACEITO.test(local)) return [];
    return [{
      origem: "remotive",
      idExterno: String(j.id),
      titulo,
      empresa: textoOuVazio(j.company_name) || "Empresa não informada",
      cidade: `Remoto (${local})`,
      descricao: htmlParaTextoEstruturado(textoOuVazio(j.description)),
      link,
      publicadaEm: dataOuNull(j.publication_date),
      modalidade: "remoto" as const,
    }];
  });
}

export const remotive: FonteExterna = {
  origem: "remotive",
  rotulo: "Remotive",
  indisponivel: () => null,

  async buscar() {
    return buscarPorTermos(CATEGORIAS, async (categoria) =>
      converterRemotive(await pedirJson(`https://remotive.com/api/remote-jobs?category=${categoria}&limit=100`)),
    );
  },
};
