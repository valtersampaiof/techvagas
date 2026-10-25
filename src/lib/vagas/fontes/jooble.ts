import { lerCampoDeSalario } from "../../salario";
import { pedirJson, buscarPorTermos } from "../http";
import { dataOuNull, htmlParaTexto, textoOuVazio, urlSegura } from "../texto";
import type { FonteExterna, VagaExterna } from "../tipos";

/** API oficial da Jooble (https://jooble.org/api/about). Exige uma chave gratuita, pedida por formulário. */
const TERMOS = [
  "estágio ti", "estagiário", "tecnologia da informação", "analista de suporte", "analista de dados", "segurança da informação",
  "desenvolvedor", "desenvolvedor junior", "desenvolvedor pleno", "desenvolvedor senior", "software engineer", "engenheiro de software",
  "analista de sistemas", "cientista de dados", "engenheiro de dados", "devops", "cloud", "arquiteto de software", "tech lead",
  "infraestrutura ti", "qa", "scrum master", "product owner", "gerente de ti",
];

type VagaJooble = {
  id?: string | number;
  title?: string;
  location?: string;
  snippet?: string;
  link?: string;
  company?: string;
  updated?: string;
  salary?: string;
  type?: string;
};

export function converterJooble(json: unknown): VagaExterna[] {
  const vagas = (json as { jobs?: VagaJooble[] } | null)?.jobs;
  if (!Array.isArray(vagas)) return [];

  return vagas.flatMap((j) => {
    const link = urlSegura(j.link);
    const titulo = htmlParaTexto(textoOuVazio(j.title));
    // Sem id próprio, o endereço da vaga serve de identificador estável.
    const idExterno = j.id !== undefined ? String(j.id) : link;
    if (!link || !titulo || !idExterno) return [];
    return [{
      origem: "jooble",
      idExterno,
      titulo,
      empresa: textoOuVazio(j.company) || "Empresa não informada",
      cidade: textoOuVazio(j.location),
      descricao: htmlParaTexto(textoOuVazio(j.snippet)),
      link,
      publicadaEm: dataOuNull(j.updated),
      salario: lerCampoDeSalario(j.salary),
    }];
  });
}

/**
 * Endereço oficial da API. Para usar outro (ex.: de um país específico), defina JOOBLE_HOST no .env.
 * Atenção: o campo `location` precisa ser "Brazil" (em inglês); com "Brasil" a Jooble devolve zero vagas.
 */
const HOST_PADRAO = "jooble.org";
const LOCAL = "Brazil";

export const jooble: FonteExterna = {
  origem: "jooble",
  rotulo: "Jooble",
  indisponivel: () => (process.env.JOOBLE_API_KEY ? null : "defina JOOBLE_API_KEY no arquivo .env"),

  async buscar() {
    const host = process.env.JOOBLE_HOST?.trim() || HOST_PADRAO;
    const chave = encodeURIComponent(process.env.JOOBLE_API_KEY!);
    return buscarPorTermos(TERMOS, async (termo) =>
      converterJooble(
        await pedirJson(`https://${host}/api/${chave}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keywords: termo, location: LOCAL, page: "1" }),
        }),
      ),
    );
  },
};
