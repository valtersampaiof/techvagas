export type HabilidadeBase = {
  slug: string;
  nome: string;
  area: string;
  /** Outras formas de escrever a habilidade em um currículo. */
  sinonimos: string[];
};

export const HABILIDADES: HabilidadeBase[] = [
  { slug: "logica", nome: "Lógica de programação", area: "Programação", sinonimos: ["algoritmos", "logica de programacao", "estrutura de dados", "estruturas de dados"] },
  { slug: "python", nome: "Python", area: "Programação", sinonimos: ["python3", "django", "flask", "pandas"] },
  { slug: "php", nome: "PHP", area: "Programação", sinonimos: ["laravel", "wordpress", "symfony"] },
  { slug: "mobile", nome: "Desenvolvimento mobile", area: "Programação", sinonimos: ["android", "ios", "flutter", "react native", "kotlin", "swift", "aplicativos moveis", "app mobile", "dart"] },
  { slug: "ia-ml", nome: "Inteligência artificial e machine learning", area: "Dados", sinonimos: ["machine learning", "aprendizado de maquina", "inteligencia artificial", "deep learning", "ia generativa", "llm", "ciencia de dados", "data science", "tensorflow", "pytorch"] },
  { slug: "nosql", nome: "Bancos NoSQL", area: "Dados", sinonimos: ["nosql", "mongodb", "redis", "cassandra", "dynamodb", "firebase"] },
  { slug: "ux-design", nome: "UX e design de interfaces", area: "Design", sinonimos: ["ux", "ui", "ux/ui", "design de interface", "figma", "prototipagem", "experiencia do usuario", "user experience", "design thinking"] },
  { slug: "java", nome: "Java", area: "Programação", sinonimos: ["spring", "spring boot", "jvm"] },
  { slug: "csharp", nome: "C#", area: "Programação", sinonimos: ["c sharp", ".net", "dotnet", "asp.net"] },
  { slug: "html-css", nome: "HTML e CSS", area: "Desenvolvimento web", sinonimos: ["html", "css", "html5", "css3", "tailwind", "bootstrap"] },
  { slug: "javascript", nome: "JavaScript", area: "Desenvolvimento web", sinonimos: ["js", "ecmascript", "es6"] },
  { slug: "typescript", nome: "TypeScript", area: "Desenvolvimento web", sinonimos: ["ts"] },
  { slug: "react", nome: "React", area: "Desenvolvimento web", sinonimos: ["reactjs", "react.js", "next.js", "nextjs"] },
  { slug: "node", nome: "Node.js", area: "Desenvolvimento web", sinonimos: ["nodejs", "node js", "express"] },
  { slug: "api-rest", nome: "APIs REST", area: "Desenvolvimento web", sinonimos: ["api", "apis", "rest", "restful", "json"] },
  { slug: "git", nome: "Git e GitHub", area: "Ferramentas", sinonimos: ["git", "github", "gitlab", "controle de versao", "versionamento"] },
  { slug: "sql", nome: "SQL e bancos de dados", area: "Dados", sinonimos: ["sql", "mysql", "postgresql", "postgres", "sqlite", "banco de dados", "bancos de dados", "oracle", "sql server"] },
  { slug: "analise-dados", nome: "Análise de dados", area: "Dados", sinonimos: ["power bi", "excel avancado", "business intelligence", "bi", "tableau", "dashboards"] },
  { slug: "linux", nome: "Linux", area: "Infraestrutura", sinonimos: ["ubuntu", "debian", "shell script", "bash", "terminal linux"] },
  { slug: "redes", nome: "Redes de computadores", area: "Infraestrutura", sinonimos: ["redes", "tcp/ip", "tcp ip", "ccna", "roteamento", "switching", "dns", "dhcp", "lan", "vlan"] },
  { slug: "cloud", nome: "Computação em nuvem", area: "Infraestrutura", sinonimos: ["cloud", "aws", "azure", "google cloud", "gcp", "nuvem"] },
  { slug: "docker", nome: "Docker e contêineres", area: "Infraestrutura", sinonimos: ["docker", "conteiner", "conteineres", "containers", "kubernetes", "devops"] },
  { slug: "seguranca", nome: "Segurança da Informação", area: "Segurança", sinonimos: ["ciberseguranca", "cybersecurity", "seguranca cibernetica", "pentest", "ethical hacking", "hacking etico", "owasp", "criptografia", "soc", "iso 27001"] },
  { slug: "suporte", nome: "Suporte técnico", area: "Suporte", sinonimos: ["suporte", "help desk", "helpdesk", "service desk", "manutencao de computadores", "active directory", "windows server", "atendimento ao usuario"] },
  { slug: "testes", nome: "Testes de software", area: "Qualidade", sinonimos: ["testes", "qa", "qualidade de software", "teste automatizado", "testes automatizados", "selenium", "cypress", "jest"] },
  { slug: "ageis", nome: "Metodologias ágeis", area: "Gestão", sinonimos: ["metodos ageis", "scrum", "kanban", "agil", "agile", "sprint"] },
  { slug: "ingles", nome: "Inglês técnico", area: "Idiomas", sinonimos: ["ingles", "english", "leitura em ingles"] },
];
