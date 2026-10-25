export type HabilidadeBase = {
  slug: string;
  nome: string;
  area: string;
  /** Outras formas de escrever a habilidade em um currículo. */
  sinonimos: string[];
};

export const HABILIDADES: HabilidadeBase[] = [
  { slug: "logica", nome: "Lógica de programação", area: "Programação", sinonimos: ["algoritmos", "logica de programacao", "estrutura de dados", "estruturas de dados"] },
  { slug: "python", nome: "Python", area: "Programação", sinonimos: ["python3", "django", "flask", "pandas", "fastapi", "numpy"] },
  { slug: "php", nome: "PHP", area: "Programação", sinonimos: ["laravel", "wordpress", "symfony"] },
  { slug: "mobile", nome: "Desenvolvimento mobile", area: "Programação", sinonimos: ["android", "ios", "flutter", "react native", "kotlin", "swift", "aplicativos moveis", "app mobile", "dart"] },
  { slug: "ia-ml", nome: "Inteligência artificial e machine learning", area: "Dados", sinonimos: ["ia", "machine learning", "aprendizado de maquina", "inteligencia artificial", "deep learning", "ia generativa", "llm", "ciencia de dados", "data science", "tensorflow", "pytorch"] },
  { slug: "nosql", nome: "Bancos NoSQL", area: "Dados", sinonimos: ["nosql", "mongodb", "redis", "cassandra", "dynamodb", "firebase"] },
  { slug: "ux-design", nome: "UX e design de interfaces", area: "Design", sinonimos: ["ux", "ui", "ux/ui", "design de interface", "figma", "prototipagem", "experiencia do usuario", "user experience", "design thinking"] },
  { slug: "java", nome: "Java", area: "Programação", sinonimos: ["spring", "spring boot", "jvm", "j2ee", "jakarta ee", "quarkus", "micronaut", "hibernate", "maven", "gradle"] },
  { slug: "csharp", nome: "C#", area: "Programação", sinonimos: ["c sharp", ".net", "dotnet", "asp.net", "entity framework", "blazor", "wpf"] },
  { slug: "html-css", nome: "HTML e CSS", area: "Desenvolvimento web", sinonimos: ["html", "css", "html5", "css3", "tailwind", "bootstrap", "front-end", "front end", "frontend"] },
  { slug: "javascript", nome: "JavaScript", area: "Desenvolvimento web", sinonimos: ["js", "ecmascript", "es6", "front-end", "front end", "frontend", "full stack", "full-stack", "fullstack", "jquery"] },
  { slug: "typescript", nome: "TypeScript", area: "Desenvolvimento web", sinonimos: ["ts"] },
  { slug: "react", nome: "React", area: "Desenvolvimento web", sinonimos: ["reactjs", "react.js", "next.js", "nextjs", "redux"] },
  { slug: "node", nome: "Node.js", area: "Desenvolvimento web", sinonimos: ["nodejs", "node js", "express", "nestjs", "nest.js", "fastify"] },
  { slug: "api-rest", nome: "APIs REST", area: "Desenvolvimento web", sinonimos: ["api", "apis", "rest", "restful", "json", "back-end", "back end", "backend", "full stack", "full-stack", "fullstack", "graphql", "grpc", "openapi", "swagger", "soap", "webhooks"] },
  { slug: "git", nome: "Git e GitHub", area: "Ferramentas", sinonimos: ["git", "github", "gitlab", "controle de versao", "versionamento"] },
  { slug: "sql", nome: "SQL e bancos de dados", area: "Dados", sinonimos: ["sql", "mysql", "postgresql", "postgres", "sqlite", "banco de dados", "bancos de dados", "oracle", "sql server", "pl/sql", "plsql", "t-sql", "tsql", "mariadb"] },
  { slug: "analise-dados", nome: "Análise de dados", area: "Dados", sinonimos: ["analista de dados", "inteligencia de dados", "excel", "power bi", "excel avancado", "business intelligence", "bi", "tableau", "dashboards", "looker", "qlik", "metabase", "dax", "power query", "looker studio", "estatistica"] },
  { slug: "linux", nome: "Linux", area: "Infraestrutura", sinonimos: ["ubuntu", "debian", "shell script", "bash", "terminal linux"] },
  { slug: "redes", nome: "Redes de computadores", area: "Infraestrutura", sinonimos: ["redes", "tcp/ip", "tcp ip", "ccna", "roteamento", "switching", "dns", "dhcp", "lan", "vlan", "cisco", "mikrotik", "bgp", "ospf", "mpls", "sd-wan"] },
  { slug: "cloud", nome: "Computação em nuvem", area: "Infraestrutura", sinonimos: ["cloud", "aws", "azure", "google cloud", "gcp", "nuvem", "aws lambda", "ec2", "serverless", "cloud computing", "microsoft azure", "oci", "oracle cloud"] },
  { slug: "docker", nome: "Docker e contêineres", area: "Infraestrutura", sinonimos: ["docker", "conteiner", "conteineres", "containers"] },
  { slug: "seguranca", nome: "Segurança da Informação", area: "Segurança", sinonimos: ["ciberseguranca", "cybersecurity", "seguranca cibernetica", "pentest", "ethical hacking", "hacking etico", "owasp", "criptografia", "soc", "iso 27001", "appsec", "siem", "firewall", "vulnerabilidades", "zero trust", "iam", "grc", "devsecops"] },
  { slug: "suporte", nome: "Suporte técnico", area: "Suporte", sinonimos: ["suporte ti", "suporte de ti", "suporte de nivel 1", "suporte nivel 1", "suporte de nivel 2", "suporte nivel 2", "suporte de primeiro nivel", "suporte de segundo nivel", "suporte ao usuario", "suporte a usuarios", "suporte n1", "suporte n2", "analista de suporte", "help desk", "helpdesk", "service desk", "manutencao de computadores", "active directory", "windows server", "atendimento ao usuario", "pacote office", "microsoft office", "windows"] },
  { slug: "testes", nome: "Testes de software", area: "Qualidade", sinonimos: ["testes", "qa", "qualidade de software", "teste automatizado", "testes automatizados", "selenium", "cypress", "jest", "tdd", "bdd", "testes unitarios", "playwright", "appium", "robot framework", "junit", "pytest", "jmeter"] },
  { slug: "ageis", nome: "Metodologias ágeis", area: "Gestão", sinonimos: ["metodos ageis", "scrum", "kanban", "agil", "agile", "sprint"] },
  { slug: "ingles", nome: "Inglês técnico", area: "Idiomas", sinonimos: ["ingles", "english", "leitura em ingles"] },
  // ---------- Habilidades mais pedidas em vagas pleno e sênior ----------
  { slug: "kubernetes", nome: "Kubernetes", area: "Infraestrutura", sinonimos: ["k8s", "eks", "aks", "gke", "helm", "openshift", "orquestracao de conteineres", "orquestracao de containers"] },
  { slug: "ci-cd", nome: "CI/CD e DevOps", area: "Infraestrutura", sinonimos: ["ci/cd", "cicd", "ci cd", "devops", "pipeline de deploy", "integracao continua", "entrega continua", "jenkins", "github actions", "gitlab ci", "argocd", "argo cd", "azure devops", "devsecops", "gitops"] },
  { slug: "terraform", nome: "Infraestrutura como código (Terraform e Ansible)", area: "Infraestrutura", sinonimos: ["terraform", "ansible", "iac", "infraestrutura como codigo", "infrastructure as code", "cloudformation", "pulumi", "puppet", "opentofu"] },
  { slug: "monitoramento", nome: "Monitoramento e observabilidade", area: "Infraestrutura", sinonimos: ["observabilidade", "observability", "prometheus", "grafana", "datadog", "new relic", "zabbix", "nagios", "elk", "elastic stack", "splunk", "sre", "opentelemetry", "apm"] },
  { slug: "windows", nome: "Windows Server e Active Directory", area: "Infraestrutura", sinonimos: ["windows server", "active directory", "microsoft 365", "office 365", "exchange", "powershell", "intune", "group policy", "gpo", "hyper-v", "sccm", "azure ad", "entra id"] },
  { slug: "golang", nome: "Go (Golang)", area: "Programação", sinonimos: ["golang", "go lang", "linguagem go"] },
  { slug: "ruby", nome: "Ruby e Rails", area: "Programação", sinonimos: ["ruby on rails", "rails", "ruby"] },
  { slug: "cpp", nome: "C e C++", area: "Programação", sinonimos: ["c++", "cpp", "c/c++", "linguagem c"] },
  { slug: "angular", nome: "Angular", area: "Desenvolvimento web", sinonimos: ["angularjs", "angular.js", "rxjs", "ngrx"] },
  { slug: "vue", nome: "Vue.js", area: "Desenvolvimento web", sinonimos: ["vuejs", "vue js", "nuxt", "nuxt.js", "vuex", "pinia"] },
  { slug: "arquitetura", nome: "Arquitetura de software e microsserviços", area: "Arquitetura", sinonimos: ["microsservicos", "microservicos", "microservices", "microsservico", "arquitetura de software", "arquitetura de solucoes", "clean architecture", "ddd", "domain driven design", "design patterns", "padroes de projeto", "solid", "arquitetura hexagonal", "system design", "monolito"] },
  { slug: "mensageria", nome: "Mensageria e streaming de eventos", area: "Arquitetura", sinonimos: ["kafka", "rabbitmq", "sqs", "sns", "pub/sub", "pubsub", "mensageria", "event streaming", "event-driven", "arquitetura orientada a eventos", "activemq", "nats", "kinesis", "service bus"] },
  { slug: "engenharia-dados", nome: "Engenharia de dados e Big Data", area: "Dados", sinonimos: ["spark", "pyspark", "hadoop", "airflow", "etl", "elt", "data lake", "datalake", "data warehouse", "databricks", "dbt", "snowflake", "bigquery", "redshift", "pipeline de dados", "pipelines de dados", "big data", "data engineering", "engenharia de dados"] },
  { slug: "erp", nome: "ERP (SAP e Totvs Protheus)", area: "Sistemas corporativos", sinonimos: ["sap", "abap", "sap fi", "sap mm", "sap hana", "protheus", "totvs", "erp", "oracle ebs", "dynamics 365"] },
  { slug: "itil", nome: "ITIL e gestão de serviços de TI", area: "Gestão", sinonimos: ["itil", "itsm", "gestao de servicos de ti", "gestao de incidentes", "gestao de mudancas", "cobit", "governanca de ti", "servicenow"] },
  { slug: "gestao-projetos", nome: "Gestão de projetos", area: "Gestão", sinonimos: ["pmp", "pmbok", "gerenciamento de projetos", "gestao de projetos", "project management", "prince2", "pmo", "gerente de projetos", "project manager"] },
  { slug: "produto", nome: "Gestão de produto", area: "Produto", sinonimos: ["product owner", "product manager", "gerente de produto", "gestao de produto", "product management", "product discovery", "roadmap de produto"] },
  { slug: "lideranca", nome: "Liderança técnica e gestão de equipes", area: "Gestão", sinonimos: ["lideranca tecnica", "lideranca de equipes", "gestao de equipes", "tech lead", "lider tecnico", "engineering manager", "gestao de pessoas", "mentoria", "coordenacao de equipes", "team lead"] },
  { slug: "lgpd", nome: "LGPD e privacidade de dados", area: "Segurança", sinonimos: ["lgpd", "privacidade de dados", "protecao de dados", "gdpr", "dpo", "lei geral de protecao de dados"] },
];
