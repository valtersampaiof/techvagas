import { pedirJson, buscarPorTermos } from "../http";
import { dataOuNull, markdownParaTexto, textoOuVazio, urlSegura } from "../texto";
import type { FonteExterna, VagaExterna } from "../tipos";

/**
 * Comunidades brasileiras que publicam vagas como "issues" em repositórios públicos do GitHub.
 * A lista é fácil de mudar; um repositório que não existir ou sair do ar é apenas ignorado.
 */
export const REPOSITORIOS = [
  "frontendbr/vagas",
  "backend-br/vagas",
  "qa-brasil/vagas",
  "datascience-br/vagas",
  "androiddevbr/vagas",
  "react-brasil/vagas",
];

type Issue = {
  number?: number;
  title?: string;
  html_url?: string;
  body?: string | null;
  created_at?: string;
  labels?: (string | { name?: string })[];
  pull_request?: unknown;
};

/** "[São Paulo] Dev Júnior @ Empresa" → { cidade, titulo, empresa } (o que não aparecer fica vazio). */
export function interpretarTitulo(tituloBruto: string) {
  let titulo = tituloBruto.trim();
  let cidade = "";
  let empresa = "";

  const colchetes = titulo.match(/^\s*\[([^\]]+)\]\s*/);
  if (colchetes) {
    cidade = colchetes[1].trim();
    titulo = titulo.slice(colchetes[0].length);
  }
  const arroba = titulo.match(/\s+@\s*([^|]+?)\s*$/) ?? titulo.match(/\s+(?:na|at)\s+([^|]+?)\s*$/i);
  if (arroba && arroba.index !== undefined) {
    empresa = arroba[1].trim();
    titulo = titulo.slice(0, arroba.index).trim();
  }
  return { titulo, cidade, empresa };
}

export function converterIssues(json: unknown, repositorio: string): VagaExterna[] {
  if (!Array.isArray(json)) return [];

  return (json as Issue[]).flatMap((i) => {
    if (i.pull_request || typeof i.number !== "number") return [];
    const link = urlSegura(i.html_url);
    const { titulo, cidade, empresa } = interpretarTitulo(textoOuVazio(i.title));
    if (!link || !titulo) return [];

    const rotulos = (i.labels ?? []).map((l) => (typeof l === "string" ? l : textoOuVazio(l?.name))).filter(Boolean);
    return [{
      origem: "github",
      idExterno: `${repositorio}#${i.number}`,
      titulo,
      empresa: empresa || "Empresa não informada",
      cidade,
      descricao: markdownParaTexto(textoOuVazio(i.body)),
      link,
      publicadaEm: dataOuNull(i.created_at),
      rotulos,
    }];
  });
}

export const github: FonteExterna = {
  origem: "github",
  rotulo: "Comunidades no GitHub",
  // O token é opcional: sem ele a API do GitHub aceita poucas chamadas por hora, o que basta para uma execução.
  indisponivel: () => null,

  async buscar() {
    const cabecalhos: Record<string, string> = { Accept: "application/vnd.github+json" };
    if (process.env.GITHUB_TOKEN) cabecalhos.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

    // Duas páginas de 100 por repositório (as vagas mais recentes primeiro).
    return buscarPorTermos(REPOSITORIOS, async (repositorio) => {
      const vagas: VagaExterna[] = [];
      for (const pagina of [1, 2]) {
        const issues = await pedirJson(`https://api.github.com/repos/${repositorio}/issues?state=open&per_page=100&page=${pagina}`, {
          headers: cabecalhos,
        });
        vagas.push(...converterIssues(issues, repositorio));
        if (!Array.isArray(issues) || issues.length < 100) break;
      }
      return vagas;
    });
  },
};
