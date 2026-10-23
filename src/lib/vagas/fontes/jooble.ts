import { pedirJson, buscarPorTermos } from "../http";
import { dataOuNull, htmlParaTexto, textoOuVazio, urlSegura } from "../texto";
import type { FonteExterna, VagaExterna } from "../tipos";

/** API oficial da Jooble (https://jooble.org/api/about). Exige uma chave gratuita, pedida por formulário. */
const TERMOS = [
  "estágio desenvolvedor",
  "estágio ti",
  "desenvolvedor júnior",
  "suporte técnico júnior",
  "analista de dados júnior",
  "trainee tecnologia",
  "segurança da informação júnior",
];

type VagaJooble = {
  id?: string | number;
  title?: string;
  location?: string;
  snippet?: string;
  link?: string;
  company?: string;
  updated?: string;
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
    }];
  });
}

export const jooble: FonteExterna = {
  origem: "jooble",
  rotulo: "Jooble",
  indisponivel: () => (process.env.JOOBLE_API_KEY ? null : "defina JOOBLE_API_KEY no arquivo .env"),

  async buscar() {
    return buscarPorTermos(TERMOS, async (termo) =>
      converterJooble(
        await pedirJson(`https://jooble.org/api/${encodeURIComponent(process.env.JOOBLE_API_KEY!)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keywords: termo, location: "Brasil", page: "1" }),
        }),
      ),
    );
  },
};
