import type { Nivel } from "../niveis";

export type VagaBase = {
  titulo: string;
  empresa: string;
  cidade: string;
  modalidade: "presencial" | "hibrido" | "remoto";
  tipo: "estagio" | "trainee" | "junior";
  area: string;
  descricao: string;
  requisitos: [slug: string, nivelMinimo: Nivel, obrigatorio: boolean][];
};

/** VAGAS FICTÍCIAS, só para demonstração. Empresas e textos são inventados. */
export const VAGAS: VagaBase[] = [
  // ---------- Desenvolvimento web ----------
  { titulo: "Estágio em Desenvolvimento Front-end", empresa: "Nuvem Azul Sistemas", cidade: "São Paulo, SP", modalidade: "hibrido", tipo: "estagio", area: "Desenvolvimento web",
    descricao: "Apoio na criação de telas de um painel para clientes, junto a pessoas desenvolvedoras mais experientes.",
    requisitos: [["html-css", "intermediario", true], ["javascript", "iniciante", true], ["git", "iniciante", true], ["react", "iniciante", false]] },
  { titulo: "Estágio em Desenvolvimento Web Full Stack", empresa: "Pixel Norte Digital", cidade: "Recife, PE", modalidade: "remoto", tipo: "estagio", area: "Desenvolvimento web",
    descricao: "Manutenção de sites e pequenas funcionalidades de back-end para clientes do comércio local.",
    requisitos: [["javascript", "intermediario", true], ["html-css", "intermediario", true], ["sql", "iniciante", true], ["node", "iniciante", false], ["git", "iniciante", true]] },
  { titulo: "Desenvolvedor(a) Front-end Júnior (React)", empresa: "Laranja Software", cidade: "Belo Horizonte, MG", modalidade: "remoto", tipo: "junior", area: "Desenvolvimento web",
    descricao: "Desenvolvimento de interfaces em React para uma plataforma de agendamentos.",
    requisitos: [["react", "intermediario", true], ["javascript", "intermediario", true], ["typescript", "iniciante", true], ["html-css", "intermediario", true], ["git", "intermediario", true], ["testes", "iniciante", false]] },
  { titulo: "Desenvolvedor(a) Back-end Júnior (Node.js)", empresa: "Ágora Tecnologia", cidade: "Curitiba, PR", modalidade: "hibrido", tipo: "junior", area: "Desenvolvimento web",
    descricao: "Criação e manutenção de APIs para um aplicativo de entregas.",
    requisitos: [["node", "intermediario", true], ["api-rest", "intermediario", true], ["sql", "intermediario", true], ["git", "intermediario", true], ["docker", "iniciante", false]] },
  { titulo: "Programa de Trainee em Desenvolvimento Web", empresa: "Caravela Bank (fictício)", cidade: "Porto Alegre, RS", modalidade: "hibrido", tipo: "trainee", area: "Desenvolvimento web",
    descricao: "Seis meses de formação com mentoria, seguidos de alocação em time de produto.",
    requisitos: [["logica", "intermediario", true], ["javascript", "iniciante", true], ["html-css", "iniciante", true], ["ageis", "iniciante", false], ["ingles", "iniciante", false]] },
  { titulo: "Estágio em Desenvolvimento de Sites e Lojas Virtuais", empresa: "Vitrine Online Ltda.", cidade: "Fortaleza, CE", modalidade: "remoto", tipo: "estagio", area: "Desenvolvimento web",
    descricao: "Montagem e ajustes de lojas virtuais, com foco em layout e desempenho.",
    requisitos: [["html-css", "intermediario", true], ["javascript", "iniciante", true], ["git", "iniciante", false]] },
  { titulo: "Desenvolvedor(a) Full Stack Júnior (TypeScript)", empresa: "Brisa Labs", cidade: "Florianópolis, SC", modalidade: "remoto", tipo: "junior", area: "Desenvolvimento web",
    descricao: "Trabalho em produto de gestão para pequenas clínicas, do banco de dados à tela.",
    requisitos: [["typescript", "intermediario", true], ["react", "intermediario", true], ["node", "intermediario", true], ["sql", "intermediario", true], ["testes", "iniciante", false], ["ageis", "iniciante", false]] },

  // ---------- Programação (back-end e outras) ----------
  { titulo: "Estágio em Desenvolvimento Java", empresa: "Orion Seguros (fictício)", cidade: "Rio de Janeiro, RJ", modalidade: "hibrido", tipo: "estagio", area: "Programação",
    descricao: "Apoio na evolução de sistemas internos de uma seguradora.",
    requisitos: [["java", "iniciante", true], ["logica", "intermediario", true], ["sql", "iniciante", true], ["git", "iniciante", false]] },
  { titulo: "Desenvolvedor(a) Java Júnior", empresa: "Meridiano Tecnologia", cidade: "Campinas, SP", modalidade: "presencial", tipo: "junior", area: "Programação",
    descricao: "Desenvolvimento de serviços em Java para o setor de logística.",
    requisitos: [["java", "intermediario", true], ["sql", "intermediario", true], ["api-rest", "intermediario", true], ["git", "intermediario", true], ["testes", "iniciante", false], ["ageis", "iniciante", false]] },
  { titulo: "Estágio em Desenvolvimento C# / .NET", empresa: "Tupã Sistemas", cidade: "Goiânia, GO", modalidade: "hibrido", tipo: "estagio", area: "Programação",
    descricao: "Correção de erros e novas telas em sistema de gestão feito em .NET.",
    requisitos: [["csharp", "iniciante", true], ["sql", "iniciante", true], ["logica", "intermediario", true]] },
  { titulo: "Desenvolvedor(a) .NET Júnior", empresa: "Cais Digital", cidade: "Salvador, BA", modalidade: "remoto", tipo: "junior", area: "Programação",
    descricao: "Construção de APIs em C# para um sistema de pagamentos.",
    requisitos: [["csharp", "intermediario", true], ["api-rest", "intermediario", true], ["sql", "intermediario", true], ["git", "intermediario", true], ["docker", "iniciante", false]] },
  { titulo: "Estágio em Programação Python", empresa: "Serra Verde Analytics", cidade: "Belo Horizonte, MG", modalidade: "remoto", tipo: "estagio", area: "Programação",
    descricao: "Automação de rotinas internas e pequenos scripts de apoio ao time de dados.",
    requisitos: [["python", "iniciante", true], ["logica", "intermediario", true], ["git", "iniciante", true], ["sql", "iniciante", false]] },
  { titulo: "Desenvolvedor(a) Python Júnior", empresa: "Tamanduá Tecnologia", cidade: "Brasília, DF", modalidade: "remoto", tipo: "junior", area: "Programação",
    descricao: "Desenvolvimento de APIs em Python e integração com serviços externos.",
    requisitos: [["python", "intermediario", true], ["api-rest", "intermediario", true], ["sql", "intermediario", true], ["git", "intermediario", true], ["docker", "iniciante", false], ["testes", "iniciante", false]] },

  // ---------- Dados ----------
  { titulo: "Estágio em Análise de Dados", empresa: "Prisma Varejo (fictício)", cidade: "São Paulo, SP", modalidade: "hibrido", tipo: "estagio", area: "Dados",
    descricao: "Montagem de painéis e relatórios de vendas para a diretoria.",
    requisitos: [["analise-dados", "iniciante", true], ["sql", "iniciante", true], ["python", "iniciante", false], ["ingles", "iniciante", false]] },
  { titulo: "Analista de Dados Júnior", empresa: "Rio Claro Dados", cidade: "Porto Alegre, RS", modalidade: "remoto", tipo: "junior", area: "Dados",
    descricao: "Consultas, tratamento de dados e painéis para clientes do setor de saúde.",
    requisitos: [["sql", "intermediario", true], ["analise-dados", "intermediario", true], ["python", "intermediario", true], ["git", "iniciante", false], ["ingles", "iniciante", false]] },
  { titulo: "Programa de Trainee em Dados", empresa: "Aurora Energia (fictício)", cidade: "Rio de Janeiro, RJ", modalidade: "hibrido", tipo: "trainee", area: "Dados",
    descricao: "Formação em engenharia e análise de dados, com rodízio entre as áreas da empresa.",
    requisitos: [["logica", "intermediario", true], ["sql", "iniciante", true], ["python", "iniciante", true], ["analise-dados", "iniciante", false], ["ingles", "intermediario", false]] },

  // ---------- Infraestrutura e nuvem ----------
  { titulo: "Estágio em Infraestrutura de TI", empresa: "Costa Sul Telecom (fictício)", cidade: "Florianópolis, SC", modalidade: "presencial", tipo: "estagio", area: "Infraestrutura",
    descricao: "Apoio à equipe que cuida de servidores, rede e backups da empresa.",
    requisitos: [["linux", "iniciante", true], ["redes", "iniciante", true], ["suporte", "iniciante", false]] },
  { titulo: "Analista de Infraestrutura Júnior", empresa: "Ponte Alta Serviços", cidade: "Curitiba, PR", modalidade: "hibrido", tipo: "junior", area: "Infraestrutura",
    descricao: "Administração de servidores Linux e monitoramento de serviços.",
    requisitos: [["linux", "intermediario", true], ["redes", "intermediario", true], ["cloud", "iniciante", true], ["seguranca", "iniciante", false], ["docker", "iniciante", false]] },
  { titulo: "Estágio em Redes de Computadores", empresa: "Fibra Mais Provedor", cidade: "Recife, PE", modalidade: "presencial", tipo: "estagio", area: "Infraestrutura",
    descricao: "Configuração de roteadores e acompanhamento de chamados de rede.",
    requisitos: [["redes", "intermediario", true], ["linux", "iniciante", false], ["suporte", "iniciante", false]] },
  { titulo: "Analista de Redes Júnior", empresa: "Cumeeira Conectividade", cidade: "São Paulo, SP", modalidade: "hibrido", tipo: "junior", area: "Infraestrutura",
    descricao: "Operação da rede de uma rede de lojas, com foco em estabilidade e segurança.",
    requisitos: [["redes", "avancado", true], ["linux", "intermediario", true], ["seguranca", "iniciante", true], ["ingles", "iniciante", false]] },
  { titulo: "Estágio em Cloud e DevOps", empresa: "Bússola Cloud", cidade: "Belo Horizonte, MG", modalidade: "remoto", tipo: "estagio", area: "Infraestrutura",
    descricao: "Apoio na criação de ambientes de teste na nuvem e em automações simples.",
    requisitos: [["linux", "iniciante", true], ["cloud", "iniciante", true], ["git", "iniciante", true], ["docker", "iniciante", false], ["ingles", "iniciante", false]] },
  { titulo: "Engenheiro(a) DevOps Júnior", empresa: "Maré Alta Tecnologia", cidade: "Porto Alegre, RS", modalidade: "remoto", tipo: "junior", area: "Infraestrutura",
    descricao: "Automatização de entregas e cuidado com a infraestrutura de produtos digitais.",
    requisitos: [["docker", "intermediario", true], ["linux", "intermediario", true], ["cloud", "intermediario", true], ["git", "intermediario", true], ["redes", "iniciante", false], ["ingles", "intermediario", false]] },

  // ---------- Segurança ----------
  { titulo: "Estágio em Segurança da Informação", empresa: "Escudo Digital (fictício)", cidade: "São Paulo, SP", modalidade: "hibrido", tipo: "estagio", area: "Segurança",
    descricao: "Apoio na análise de alertas e na conscientização de equipes sobre boas práticas de segurança.",
    requisitos: [["seguranca", "iniciante", true], ["redes", "iniciante", true], ["linux", "iniciante", true], ["ingles", "iniciante", false]] },
  { titulo: "Analista de SOC Júnior", empresa: "Guarda Norte Cibersegurança", cidade: "Brasília, DF", modalidade: "presencial", tipo: "junior", area: "Segurança",
    descricao: "Monitoramento de eventos de segurança e resposta inicial a incidentes, em escala de turnos.",
    requisitos: [["seguranca", "intermediario", true], ["redes", "intermediario", true], ["linux", "intermediario", true], ["ingles", "intermediario", true], ["python", "iniciante", false], ["sql", "iniciante", false]] },
  { titulo: "Programa de Trainee em Cibersegurança", empresa: "Cofre Forte Pagamentos (fictício)", cidade: "Rio de Janeiro, RJ", modalidade: "hibrido", tipo: "trainee", area: "Segurança",
    descricao: "Formação em segurança ofensiva e defensiva, com laboratórios e mentoria.",
    requisitos: [["seguranca", "intermediario", true], ["redes", "intermediario", true], ["linux", "iniciante", true], ["python", "iniciante", false], ["ingles", "intermediario", false]] },

  // ---------- Suporte ----------
  { titulo: "Estágio em Suporte Técnico (Help Desk)", empresa: "Chave Mestra Informática", cidade: "Goiânia, GO", modalidade: "presencial", tipo: "estagio", area: "Suporte",
    descricao: "Atendimento a chamados de usuários, instalação de programas e manutenção de computadores.",
    requisitos: [["suporte", "iniciante", true], ["redes", "iniciante", false]] },
  { titulo: "Analista de Suporte Júnior", empresa: "Alvorada Serviços de TI", cidade: "Salvador, BA", modalidade: "hibrido", tipo: "junior", area: "Suporte",
    descricao: "Atendimento de segundo nível, administração de usuários e acesso remoto.",
    requisitos: [["suporte", "intermediario", true], ["redes", "iniciante", true], ["linux", "iniciante", false], ["seguranca", "iniciante", false]] },

  // ---------- Qualidade ----------
  { titulo: "Estágio em Qualidade de Software (QA)", empresa: "Trilha Certa Software", cidade: "Campinas, SP", modalidade: "remoto", tipo: "estagio", area: "Qualidade",
    descricao: "Execução de testes manuais, registro de falhas e acompanhamento de correções.",
    requisitos: [["testes", "iniciante", true], ["logica", "iniciante", true], ["ageis", "iniciante", false], ["sql", "iniciante", false]] },
  { titulo: "Analista de QA Júnior (automação)", empresa: "Ponto Fixo Tecnologia", cidade: "Curitiba, PR", modalidade: "remoto", tipo: "junior", area: "Qualidade",
    descricao: "Criação de testes automatizados para aplicações web e APIs.",
    requisitos: [["testes", "intermediario", true], ["javascript", "intermediario", true], ["api-rest", "iniciante", true], ["git", "intermediario", true], ["ageis", "iniciante", false]] },
  { titulo: "Estágio em Análise de Sistemas", empresa: "Cerrado Soluções", cidade: "Brasília, DF", modalidade: "hibrido", tipo: "estagio", area: "Gestão",
    descricao: "Levantamento de requisitos, documentação e apoio a times de desenvolvimento.",
    requisitos: [["sql", "iniciante", true], ["ageis", "iniciante", true], ["logica", "iniciante", false], ["ingles", "iniciante", false]] },
];
