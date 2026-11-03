import type { Nivel } from "../niveis";

export type PassoDaTrilha = {
  /** `slug` de uma habilidade do catálogo. */
  habilidade: string;
  /** Até que nível a trilha leva nessa habilidade. */
  ate: Nivel;
};

export type Trilha = {
  slug: string;
  nome: string;
  /** Uma frase sobre para quem é a trilha. */
  descricao: string;
  /** Os passos em ordem: do que vem primeiro ao que vem depois. */
  passos: PassoDaTrilha[];
};

/**
 * Caminhos de estudo por meta de carreira. A ordem dos passos segue o que costuma ser pedido nas vagas de entrada e o que
 * depende de quê (ex.: SQL antes de engenharia de dados). Os cursos de cada passo são escolhidos do catálogo na hora.
 */
export const TRILHAS: Trilha[] = [
  {
    slug: "backend-java",
    nome: "Desenvolvedor back-end (Java)",
    descricao: "Para quem quer criar sistemas e APIs que rodam no servidor, como em bancos, varejo e grandes empresas.",
    passos: [
      { habilidade: "logica", ate: "intermediario" },
      { habilidade: "git", ate: "iniciante" },
      { habilidade: "java", ate: "intermediario" },
      { habilidade: "sql", ate: "intermediario" },
      { habilidade: "api-rest", ate: "intermediario" },
      { habilidade: "testes", ate: "iniciante" },
      { habilidade: "docker", ate: "iniciante" },
      { habilidade: "arquitetura", ate: "iniciante" },
    ],
  },
  {
    slug: "frontend",
    nome: "Desenvolvedor front-end e web",
    descricao: "Para quem quer construir a parte que as pessoas veem e usam nos sites e aplicativos.",
    passos: [
      { habilidade: "logica", ate: "iniciante" },
      { habilidade: "html-css", ate: "intermediario" },
      { habilidade: "javascript", ate: "intermediario" },
      { habilidade: "git", ate: "iniciante" },
      { habilidade: "react", ate: "intermediario" },
      { habilidade: "typescript", ate: "iniciante" },
      { habilidade: "ux-design", ate: "iniciante" },
      { habilidade: "testes", ate: "iniciante" },
    ],
  },
  {
    slug: "dados",
    nome: "Analista de dados",
    descricao: "Para quem gosta de números e quer transformar dados em respostas para as empresas.",
    passos: [
      { habilidade: "logica", ate: "iniciante" },
      { habilidade: "sql", ate: "intermediario" },
      { habilidade: "python", ate: "intermediario" },
      { habilidade: "analise-dados", ate: "intermediario" },
      { habilidade: "git", ate: "iniciante" },
      { habilidade: "engenharia-dados", ate: "iniciante" },
      { habilidade: "ia-ml", ate: "iniciante" },
    ],
  },
  {
    slug: "devops-cloud",
    nome: "DevOps e computação em nuvem",
    descricao: "Para quem quer cuidar de como os sistemas são publicados, escalam e se mantêm no ar.",
    passos: [
      { habilidade: "linux", ate: "intermediario" },
      { habilidade: "redes", ate: "iniciante" },
      { habilidade: "git", ate: "iniciante" },
      { habilidade: "docker", ate: "intermediario" },
      { habilidade: "cloud", ate: "intermediario" },
      { habilidade: "ci-cd", ate: "intermediario" },
      { habilidade: "kubernetes", ate: "iniciante" },
      { habilidade: "terraform", ate: "iniciante" },
      { habilidade: "monitoramento", ate: "iniciante" },
    ],
  },
  {
    slug: "seguranca",
    nome: "Segurança da informação",
    descricao: "Para quem quer proteger sistemas e dados contra ataques e vazamentos.",
    passos: [
      { habilidade: "redes", ate: "intermediario" },
      { habilidade: "linux", ate: "intermediario" },
      { habilidade: "seguranca", ate: "intermediario" },
      { habilidade: "lgpd", ate: "iniciante" },
      { habilidade: "cloud", ate: "iniciante" },
      { habilidade: "ingles", ate: "iniciante" },
    ],
  },
  {
    slug: "suporte-infra",
    nome: "Suporte e infraestrutura",
    descricao: "A porta de entrada mais comum na área: ajudar pessoas e manter computadores e redes funcionando.",
    passos: [
      { habilidade: "suporte", ate: "intermediario" },
      { habilidade: "windows", ate: "iniciante" },
      { habilidade: "redes", ate: "intermediario" },
      { habilidade: "linux", ate: "iniciante" },
      { habilidade: "itil", ate: "iniciante" },
      { habilidade: "seguranca", ate: "iniciante" },
    ],
  },
  {
    slug: "qualidade",
    nome: "Qualidade de software (QA)",
    descricao: "Para quem tem olho para detalhes e quer garantir que o software funcione antes de chegar ao usuário.",
    passos: [
      { habilidade: "logica", ate: "iniciante" },
      { habilidade: "testes", ate: "intermediario" },
      { habilidade: "sql", ate: "iniciante" },
      { habilidade: "git", ate: "iniciante" },
      { habilidade: "api-rest", ate: "iniciante" },
      { habilidade: "ageis", ate: "iniciante" },
    ],
  },
  {
    slug: "lideranca-tecnica",
    nome: "Liderança técnica",
    descricao: "Para quem já tem experiência e quer coordenar pessoas, projetos e decisões técnicas.",
    passos: [
      { habilidade: "ageis", ate: "intermediario" },
      { habilidade: "gestao-projetos", ate: "intermediario" },
      { habilidade: "lideranca", ate: "intermediario" },
      { habilidade: "arquitetura", ate: "intermediario" },
      { habilidade: "itil", ate: "iniciante" },
    ],
  },
];
