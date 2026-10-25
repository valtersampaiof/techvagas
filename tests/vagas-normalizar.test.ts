import { describe, expect, it } from "vitest";
import { HABILIDADES } from "@/lib/dados/habilidades";
import { anosDeExperiencia, detectarContrato, detectarModalidade, detectarTipo, escolherArea, extrairRequisitos, niveisExtrasDoTitulo, normalizarVaga, pareceDeTI } from "@/lib/vagas/normalizar";
import { espacarFrases, htmlParaTexto, markdownParaTexto, truncar, urlSegura } from "@/lib/vagas/texto";
import type { VagaExterna } from "@/lib/vagas/tipos";

const vaga = (extra: Partial<VagaExterna>): VagaExterna => ({
  origem: "teste",
  idExterno: "1",
  titulo: "Desenvolvedor Júnior",
  empresa: "Empresa",
  cidade: "São Paulo, SP",
  descricao: "Trabalho com Python e SQL.",
  link: "https://exemplo.com/vaga/1",
  publicadaEm: null,
  ...extra,
});

describe("texto", () => {
  it("etiquetas dentro da frase não criam espaço antes da pontuação", () => {
    expect(htmlParaTexto("<p>Usamos <strong>SQL</strong>, <em>Python</em>. Veja <a href=\"https://x.com\">aqui</a>.</p>")).toBe(
      "Usamos SQL, Python. Veja aqui.",
    );
    expect(htmlParaTexto("<p>Linha um</p><p>Linha dois</p>")).toBe("Linha um\nLinha dois");
  });

  it("converte HTML em texto simples e decodifica entidades", () => {
    expect(htmlParaTexto("<p>Vaga &amp; est&#225;gio</p><ul><li>Python</li><li>SQL</li></ul><script>x()</script>")).toBe(
      "Vaga & estágio\n• Python\n• SQL",
    );
  });

  it("limpa Markdown de issues", () => {
    const t = markdownParaTexto("## Requisitos\n- **Python**\n- [SQL](https://x.com)\n![img](https://x.com/a.png)\n<!-- comentário -->");
    expect(t).toContain("Requisitos");
    expect(t).toContain("• Python");
    expect(t).toContain("• SQL");
    expect(t).not.toMatch(/https|\*\*|comentário|img/);
  });

  it("separa frases coladas sem quebrar nomes de tecnologias", () => {
    expect(espacarFrases("diversidade é fundamental.Nessa oportunidade, você fará parte.Buscamos alguém")).toBe(
      "diversidade é fundamental. Nessa oportunidade, você fará parte. Buscamos alguém",
    );
    const intactos = "Experiência com ASP.NET, Asp.NET, Node.js, Vue.js, JavaScript, TypeScript, GitHub, C#.NET e v1.0Beta";
    expect(espacarFrases(intactos)).toBe(intactos);
  });

  it("só aceita links http(s)", () => {
    expect(urlSegura("https://exemplo.com/a")).toBe("https://exemplo.com/a");
    expect(urlSegura("javascript:alert(1)")).toBeNull();
    expect(urlSegura("data:text/html,<b>")).toBeNull();
    expect(urlSegura("não é url")).toBeNull();
    expect(urlSegura(undefined)).toBeNull();
  });

  it("trunca sem cortar palavra no meio", () => {
    expect(truncar("uma frase bem comprida aqui", 14)).toBe("uma frase bem…");
    expect(truncar("curta", 14)).toBe("curta");
  });
});

describe("detectarTipo", () => {
  it.each([
    ["Estágio em Desenvolvimento", [], "", "estagio"],
    ["Estagiário de Dados", [], "", "estagio"],
    ["Software Engineering Intern", [], "", "estagio"],
    ["Programa de Trainee em TI", [], "", "trainee"],
    ["Desenvolvedor Backend Júnior", [], "", "junior"],
    ["Analista de Suporte Jr.", [], "", "junior"],
    ["Desenvolvedor Backend", ["Júnior"], "", "junior"],
    ["Desenvolvedor", ["Estágio"], "", "estagio"],
    ["Engenheiro de Software Pleno", [], "", "pleno"],
    ["Desenvolvedor Java Pl", [], "", "pleno"],
    ["Analista de Sistemas Semi-Sênior", [], "", "pleno"],
    ["Desenvolvedor Sênior", [], "", "senior"],
    ["Senior Software Engineer", [], "", "senior"],
    ["Desenvolvedor Backend Sr.", [], "", "senior"],
    ["Arquiteto de Soluções", [], "", "senior"],
    ["Especialista em Segurança da Informação", [], "", "senior"],
    ["Tech Lead Java", [], "", "lideranca"],
    ["Gerente de Infraestrutura de TI", [], "", "lideranca"],
    ["Coordenador de Desenvolvimento", [], "", "lideranca"],
    ["Engineering Manager", [], "", "lideranca"],
  ])("%s %j -> %s", (titulo, rotulos, descricao, esperado) => {
    expect(detectarTipo(titulo as string, rotulos as string[], descricao as string)).toBe(esperado);
  });

  it("o título vale mais que as etiquetas da fonte (muitas fontes marcam Júnior e Pleno juntos)", () => {
    expect(detectarTipo("Engenheiro de Software Pleno", ["Júnior"])).toBe("pleno");
    expect(detectarTipo("Desenvolvedor Backend", ["Pleno"])).toBe("pleno");
  });

  it("com mais de um nível no cargo ('Júnior/Pleno'), vale o menor", () => {
    expect(detectarTipo("Desenvolvedor Júnior/Pleno", [])).toBe("junior");
    expect(detectarTipo("Analista Pleno ou Sênior", [])).toBe("pleno");
  });

  it("'PL/SQL' não é pleno e 'SR 1067' é código de vaga, não sênior", () => {
    expect(detectarTipo("Desenvolvedor PL/SQL", [])).toBe("indefinido");
    expect(detectarTipo("Analista de Suporte Cloud SR 1067", [])).toBe("indefinido");
  });

  it("numeração romana no fim do cargo indica o nível: I júnior, II pleno, III sênior", () => {
    expect(detectarTipo("Analista de Sistemas I", [])).toBe("junior");
    expect(detectarTipo("Engenheiro de Dados II", [])).toBe("pleno");
    expect(detectarTipo("Desenvolvedor Backend III", [])).toBe("senior");
    expect(detectarTipo("Analista de Sistemas II (Remoto)", [])).toBe("pleno");
    expect(detectarTipo("Hering | Desenvolvedor(a) Full Stack I (Blumenau/SC)", [])).toBe("junior");
    expect(detectarTipo("Analista de Dados III | Investimentos", [])).toBe("senior");
    // "Júnior" escrito vence o número
    expect(detectarTipo("Software Engineer .NET II (Junior)", [])).toBe("junior");
    // sem cargo de profissional, o número não conta
    expect(detectarTipo("Programa Fase II", [])).toBe("indefinido");
  });

  it("sem nível no cargo, os anos de experiência do texto decidem", () => {
    expect(detectarTipo("Desenvolvedor Backend", [], "Experiência de 5 anos com Java.")).toBe("senior");
    expect(detectarTipo("Desenvolvedor Backend", [], "Pelo menos 3 anos de experiência com Java.")).toBe("pleno");
    expect(detectarTipo("Desenvolvedor Backend", [], "1 ano de experiência com Java.")).toBe("junior");
    expect(detectarTipo("Desenvolvedor Backend", [], "Não é necessário ter experiência prévia.")).toBe("junior");
    expect(detectarTipo("Desenvolvedor Backend", [], "3+ years of experience with Java")).toBe("pleno");
    expect(detectarTipo("Desenvolvedor Backend", [], "Você sabe Java e SQL.")).toBe("indefinido");
  });
});

describe("niveisExtrasDoTitulo", () => {
  it("'Pleno/Sênior' é pleno, mas também aceita sênior", () => {
    expect(detectarTipo("Desenvolvedor Java Pleno/Sênior")).toBe("pleno");
    expect(niveisExtrasDoTitulo("Desenvolvedor Java Pleno/Sênior", "pleno")).toBe(",senior,");
    expect(niveisExtrasDoTitulo("Desenvolvedor FullStack Júnior/Pleno/Sênior", "junior")).toBe(",pleno,senior,");
    expect(niveisExtrasDoTitulo("Dev PL/SR Backend", "pleno")).toBe(",senior,");
  });
  it("cargo de um nível só (ou 'semi-sênior') não ganha nível extra", () => {
    expect(niveisExtrasDoTitulo("Desenvolvedor Pleno", "pleno")).toBe("");
    expect(niveisExtrasDoTitulo("Desenvolvedor Semi-Sênior", "pleno")).toBe("");
    expect(niveisExtrasDoTitulo("Desenvolvedor Sênior", "senior")).toBe("");
  });
  it("'Tech Leader' e 'Liderança' são liderança", () => {
    expect(detectarTipo("Tech Leader de Engenharia")).toBe("lideranca");
    expect(detectarTipo("Liderança de Design de Produtos")).toBe("lideranca");
  });
});

describe("anosDeExperiencia", () => {
  it.each([
    ["Experiência mínima de 4 anos em desenvolvimento", 4],
    ["Ter 5+ anos de experiência com Java", 5],
    ["De 3 a 5 anos de experiência", 3],
    ["Experiência com Python por pelo menos 2 anos", 2],
    ["5 years of professional experience", 5],
    ["Experience: 7+ years in software engineering", 7],
    ["Sem experiência prévia", 0],
    ["Conhecimento em Java", null],
    ["Há 30 anos no mercado, a empresa oferece experiência", null],
  ])("%s -> %s", (texto, esperado) => {
    expect(anosDeExperiencia(texto)).toBe(esperado);
  });

  it("vale o maior número entre os trechos", () => {
    expect(anosDeExperiencia("2 anos de experiência com Python e 6 anos de experiência com Java")).toBe(6);
  });
});

describe("detectarContrato", () => {
  const c = (descricao: string, extra: { titulo?: string; contrato?: "clt" | "pj" } = {}, tipo: "junior" | "estagio" = "junior") =>
    detectarContrato({ titulo: "Desenvolvedor", descricao, rotulos: [], ...extra }, tipo);

  it("lê CLT e PJ do anúncio, inclusive quando aceita os dois", () => {
    expect(c("Contratação CLT com benefícios.")).toBe("clt");
    expect(c("Regime de contratação: PJ.")).toBe("pj");
    expect(c("Modelo de contratação: Pessoa Jurídica")).toBe("pj");
    expect(c("Contratação CLT ou PJ, a combinar.")).toBe("clt_pj");
    expect(c("Vaga efetiva, carteira assinada.")).toBe("clt");
  });

  it("sem menção, fica vazio, em vez de chutar", () => {
    expect(c("Trabalho com Python.")).toBe("");
    expect(c("A CNPJ da empresa é aberta ao público.")).toBe("");
  });

  it("estágio é estágio; o que a fonte informa tem prioridade", () => {
    expect(c("Bolsa de R$ 1.500", {}, "estagio")).toBe("estagio");
    expect(c("Contratação CLT.", { contrato: "pj" })).toBe("pj");
  });

  it("trainee é CLT mesmo quando o anúncio não diz, mas PJ escrito vale", () => {
    expect(detectarContrato({ titulo: "Programa de Trainee", descricao: "Python", rotulos: [] }, "trainee")).toBe("clt");
    expect(detectarContrato({ titulo: "Trainee", descricao: "Contratação PJ", rotulos: [] }, "trainee")).toBe("pj");
  });

  it("estágio nunca é CLT, mesmo que a fonte tenha marcado assim", () => {
    expect(c("Bolsa de R$ 1.500", { contrato: "clt" }, "estagio")).toBe("estagio");
  });
});

describe("pareceDeTI (cargos de todos os níveis)", () => {
  it.each([
    "Engenheiro de Software Sênior", "Senior Backend Engineer", "Arquiteto de Soluções Cloud", "Tech Lead Java", "Engenheiro DevOps Pleno",
    "SRE - Site Reliability Engineer", "Analista de Infraestrutura Pleno", "Administrador de Banco de Dados (DBA)", "DBA Oracle",
    "Cientista de Dados Sênior", "Engenheiro de Dados", "Analista de BI", "Analista de Segurança da Informação", "Pentester",
    "Scrum Master", "Product Owner", "Gerente de TI", "Coordenador de Infraestrutura de TI", "CTO", "Analista de Redes",
    "Administrador de Redes", "Analista SAP ABAP", "Consultor SAP FI", "Desenvolvedor Mobile Flutter", "Full Stack Developer",
    "Engenheiro de Qualidade de Software", "QA Automation Engineer", "UX Designer", "Machine Learning Engineer", "Analista de NOC",
    "Gerente de Engenharia de Software", "Analista de Sistemas Pleno", "Platform Engineer", "Cloud Engineer", "Software Architect",
  ])("%s é de TI", (titulo) => {
    expect(pareceDeTI(titulo)).toBe(true);
  });

  it.each([
    "Gerente de Contas", "Business Developer", "Sales Development Representative", "Analista de Redes Sociais", "Engenheiro Civil",
    "Engenheiro de Produção", "Coordenador de Logística", "Diretor Comercial", "Analista de Infraestrutura Viária", "Product Developer Têxtil",
    "Desenvolvedor de Negócios", "Analista Financeiro Pleno", "Head de Vendas", "Gerente de Marketing", "Analista de Qualidade Industrial",
  ])("%s não é de TI", (titulo) => {
    expect(pareceDeTI(titulo)).toBe(false);
  });
});

describe("detectarModalidade", () => {
  it("usa a modalidade informada pela fonte", () => {
    expect(detectarModalidade(vaga({ modalidade: "remoto" }))).toBe("remoto");
  });
  it("reconhece remoto, híbrido e presencial pelo texto", () => {
    expect(detectarModalidade(vaga({ descricao: "Trabalho 100% home office" }))).toBe("remoto");
    expect(detectarModalidade(vaga({ descricao: "Modelo híbrido, 3 dias remotos" }))).toBe("hibrido");
    expect(detectarModalidade(vaga({ descricao: "Vaga presencial na Paulista" }))).toBe("presencial");
  });
  it("título que diz 'remoto' (em português ou inglês) vale mais que a modalidade da fonte", () => {
    expect(detectarModalidade(vaga({ titulo: "Analista de Testes SR (100% REMOTO)", modalidade: "presencial" }))).toBe("remoto");
    expect(detectarModalidade(vaga({ titulo: "React Developer Remote" }))).toBe("remoto");
    expect(detectarModalidade(vaga({ titulo: "Net Developer (Remote)", modalidade: "hibrido" }))).toBe("remoto");
  });
  it("'acesso remoto' e 'possibilidade de home office' no título não tornam a vaga remota", () => {
    expect(detectarModalidade(vaga({ titulo: "Analista de Redes (acesso remoto a servidores)", modalidade: "hibrido" }))).toBe("hibrido");
    expect(detectarModalidade(vaga({ titulo: "Suporte, possibilidade de home office após 90 dias", modalidade: "presencial" }))).toBe("presencial");
  });
});

describe("extrairRequisitos", () => {
  it("separa obrigatórios de desejáveis pelo trecho de diferenciais", () => {
    const r = extrairRequisitos(
      "Desenvolvedor Júnior",
      "Requisitos: Python e SQL.\nDiferenciais: Docker e AWS.",
      HABILIDADES,
    );
    const por = Object.fromEntries(r.map((x) => [x.slug, x.obrigatorio]));
    expect(por).toMatchObject({ python: true, sql: true, docker: false, cloud: false });
  });

  it("habilidade do título é obrigatória mesmo se citada depois como diferencial", () => {
    const r = extrairRequisitos("Dev React Júnior", "Diferenciais: React e Docker", HABILIDADES);
    const por = Object.fromEntries(r.map((x) => [x.slug, x.obrigatorio]));
    expect(por.react).toBe(true);
    expect(por.docker).toBe(false);
  });
});

describe("escolherArea: o cargo vale mais que a lista de tecnologias", () => {
  const muitaInfra = ["linux", "redes", "cloud", "docker", "kubernetes", "ci-cd", "terraform", "monitoramento", "python"];
  it("analista de segurança que cita infraestrutura continua sendo de Segurança", () => {
    expect(escolherArea(muitaInfra, HABILIDADES, "Analista de Segurança da Informação Sênior")).toBe("Segurança");
  });
  it("engenheiro de dados que cita infraestrutura continua sendo de Dados", () => {
    expect(escolherArea(["python", "sql", ...muitaInfra], HABILIDADES, "Engenheiro de Dados Senior")).toBe("Dados");
  });
  it("engenheiro de software que cita muita infraestrutura continua sendo de programação", () => {
    expect(escolherArea(["java", "api-rest", ...muitaInfra], HABILIDADES, "Engenheiro de Software Sr. (Java)")).toBe("Programação");
    expect(escolherArea(["react", "typescript", ...muitaInfra], HABILIDADES, "Desenvolvedor Front-end Pleno")).toBe("Desenvolvimento web");
  });
  it("sem cargo claro, vale a área das tecnologias", () => {
    expect(escolherArea(muitaInfra, HABILIDADES, "Especialista Sênior")).toBe("Infraestrutura");
  });
});

describe("escolherArea", () => {
  it("usa a área mais frequente e ignora as genéricas", () => {
    expect(escolherArea(["git", "python", "java", "ingles"], HABILIDADES)).toBe("Programação");
    expect(escolherArea(["redes", "linux", "ingles"], HABILIDADES)).toBe("Infraestrutura");
  });

  it("a habilidade do título pesa mais que as outras", () => {
    const slugs = ["redes", "linux", "seguranca"];
    expect(escolherArea(slugs, HABILIDADES)).toBe("Infraestrutura");
    expect(escolherArea(slugs, HABILIDADES, "Analista de Segurança da Informação Júnior")).toBe("Segurança");
  });
});

describe("normalizarVaga", () => {
  it("aceita vaga de iniciante com habilidades conhecidas", () => {
    const n = normalizarVaga(vaga({}), HABILIDADES)!;
    expect(n.tipo).toBe("junior");
    expect(n.requisitos.map((r) => r.slug).sort()).toEqual(["python", "sql"]);
    expect(n.requisitos.every((r) => r.nivelMinimo === "iniciante")).toBe(true);
  });

  it("aceita vagas de todos os níveis; o nível pedido de cada habilidade acompanha o nível da vaga", () => {
    const pleno = normalizarVaga(vaga({ titulo: "Desenvolvedor Pleno" }), HABILIDADES)!;
    expect(pleno.tipo).toBe("pleno");
    expect(pleno.requisitos.every((r) => r.nivelMinimo === "intermediario")).toBe(true);

    const senior = normalizarVaga(vaga({ titulo: "Desenvolvedor Sênior", descricao: "Python, SQL, Git e inglês." }), HABILIDADES)!;
    expect(senior.tipo).toBe("senior");
    const nivel = Object.fromEntries(senior.requisitos.map((r) => [r.slug, r.nivelMinimo]));
    expect(nivel).toMatchObject({ python: "avancado", sql: "avancado", git: "intermediario", ingles: "intermediario" });
  });

  it("vaga sem nível no cargo nem no texto fica como 'indefinido', com requisitos de iniciante", () => {
    const n = normalizarVaga(vaga({ titulo: "Desenvolvedor Python" }), HABILIDADES)!;
    expect(n.tipo).toBe("indefinido");
    expect(n.requisitos.every((r) => r.nivelMinimo === "iniciante")).toBe(true);
  });

  it("grava o contrato lido do anúncio", () => {
    expect(normalizarVaga(vaga({ descricao: "Python e SQL. Contratação PJ." }), HABILIDADES)!.contrato).toBe("pj");
    expect(normalizarVaga(vaga({ titulo: "Estágio em Dados", descricao: "Python e SQL." }), HABILIDADES)!.contrato).toBe("estagio");
    expect(normalizarVaga(vaga({ descricao: "Python e SQL." }), HABILIDADES)!.contrato).toBe("");
  });

  it("descarta banco de talentos e cadastro reserva, de qualquer fonte", () => {
    for (const titulo of ["[BANCO DE TALENTOS] Desenvolvedor(a) Júnior", "BANCO DE TALENTOS - Cientista de Dados Sr", "Exclusive Talent Pool - PcD", "Cadastro Reserva - Analista de Sistemas"]) {
      expect(normalizarVaga(vaga({ titulo, descricao: "Python e SQL." }), HABILIDADES), titulo).toBeNull();
    }
  });

  it("quem COMPRA, vende ou recruta para a área de TI não trabalha com TI (ex.: 'Comprador Júnior - TI')", () => {
    const descricao = "Compras de hardware, periféricos, infraestrutura de TI, softwares e licenças. Redes, Linux e SQL.";
    for (const titulo of ["Comprador(a) Júnior - TI - Jd. Paulista (578012/578013)", "Analista de Compras de TI", "Vendedor de Soluções de TI", "Recrutadora de TI", "Analista de Marketing de Produto"]) {
      expect(normalizarVaga(vaga({ titulo, descricao }), HABILIDADES), titulo).toBeNull();
    }
    // quando a função é técnica, continua valendo, mesmo citando vendas ou compras
    for (const titulo of ["Analista de Dados de Vendas", "Desenvolvedor para o time de Compras", "Engenheiro de Software - Plataforma de Vendas"]) {
      expect(normalizarVaga(vaga({ titulo, descricao: "Python e SQL." }), HABILIDADES), titulo).not.toBeNull();
    }
  });

  it("'Desenvolvedor de Mercado', de Hardware ou de Negócios não é desenvolvedor de software", () => {
    for (const titulo of ["Desenvolvedor(a) de Mercado | Varejo 5G", "Desenvolvedor de Hardware", "Desenvolvedor(a) de Negócios", "Desenvolvedor de Canais"]) {
      expect(normalizarVaga(vaga({ titulo, descricao: "Prospecção de clientes e vendas." }), HABILIDADES), titulo).toBeNull();
    }
  });

  it("descarta vaga sem nenhuma habilidade reconhecida", () => {
    expect(normalizarVaga(vaga({ titulo: "Estágio em Marketing", descricao: "Redes sociais e design" }), HABILIDADES)).toBeNull();
  });

  it("mantém vaga claramente de TI mesmo sem tecnologias no texto, mas sem requisitos", () => {
    const n = normalizarVaga(
      vaga({ titulo: "Estágio em Tecnologia da Informação", descricao: "Cursos de Análise e desenvolvimento de sistemas. Horário a combinar." }),
      HABILIDADES,
    )!;
    expect(n.tipo).toBe("estagio");
    expect(n.requisitos).toEqual([]);
    expect(n.area).toBe("TI em geral");
  });

  it("reconhece 'Estágio em Dados' como TI, mas não 'Estágio em Dados Cadastrais' sem tecnologia no texto", () => {
    expect(normalizarVaga(vaga({ titulo: "Estágio em Dados", descricao: "Apoio ao time." }), HABILIDADES)).not.toBeNull();
    expect(normalizarVaga(vaga({ titulo: "Estágio em Dados Cadastrais", descricao: "Cadastro de clientes no sistema da empresa." }), HABILIDADES)).toBeNull();
  });

  it("não deixa passar vaga que só parece de TI pela palavra 'desenvolvedor'", () => {
    expect(normalizarVaga(vaga({ titulo: "Pessoa Desenvolvedor(a) de Negócios Júnior", descricao: "Vendas e prospecção." }), HABILIDADES)).toBeNull();
    expect(normalizarVaga(vaga({ titulo: "Estágio para Direito", descricao: "Rotinas jurídicas." }), HABILIDADES)).toBeNull();
    expect(normalizarVaga(vaga({ titulo: "Analista Contábil Jr", descricao: "Conciliações contábeis." }), HABILIDADES)).toBeNull();
  });

  it("rejeita vagas de outras áreas que só citam inglês, suporte ou Excel (casos reais da Gupy)", () => {
    const rejeitadas: [string, string][] = [
      ["Estágio em Vendas (Programação e Robótica)", "Atendimento a clientes, suporte aos alunos, pacote Office e inglês avançado."],
      ["Estágio em Engenharia - Programa de Estágio", "Suporte às áreas de produção. Excel e pacote Office."],
      ["Analista de Suporte Comercial Júnior", "Suporte ao time de vendas e atendimento ao cliente."],
      ["PROGRAMA SUMMER JOB 2027", "Inglês fluente. Experiência no exterior."],
      ["Programa de Estágio", "Apoio administrativo e suporte à gerência. Windows e Office."],
      ["Programa de Estágio 2026 | Indústria", "Programa para todas as áreas. Benefícios, inteligência artificial como diferencial da empresa e inglês."],
      ["Analista Suporte ao Cliente Júnior", "Atendimento a clientes da fintech, integrações via API e planilhas."],
    ];
    for (const [titulo, descricao] of rejeitadas) {
      expect(normalizarVaga(vaga({ titulo, descricao }), HABILIDADES), titulo).toBeNull();
    }
  });

  it("aceita vagas de TI cujo cargo não diz 'TI' (o texto traz tecnologia forte ou o cargo é de suporte)", () => {
    const aceitas: [string, string][] = [
      ["Técnico de Suporte Júnior", "Atendimento de chamados, Windows e redes."],
      ["Pessoa desenvolvedora Web Júnior", "Trabalhamos com React e Node."],
      ["Estágio em Engenharia de Dados", "Python, SQL e pipelines de dados."],
      ["Analista Júnior", "Você vai programar em Python e versionar com Git."],
    ];
    for (const [titulo, descricao] of aceitas) {
      expect(normalizarVaga(vaga({ titulo, descricao }), HABILIDADES), titulo).not.toBeNull();
    }
  });

  it("deduz habilidades básicas pelo cargo (front-end, back-end, analista de dados)", () => {
    const front = normalizarVaga(vaga({ titulo: "Desenvolvedor Front-end Júnior", descricao: "Time jovem e dinâmico." }), HABILIDADES)!;
    expect(front.requisitos.map((r) => r.slug).sort()).toEqual(["html-css", "javascript"]);
    expect(front.area).toBe("Desenvolvimento web");

    const dados = normalizarVaga(vaga({ titulo: "Analista de Dados Júnior", descricao: "Painéis para a diretoria." }), HABILIDADES)!;
    expect(dados.requisitos.map((r) => r.slug)).toContain("analise-dados");
    expect(dados.area).toBe("Dados");
  });

  it("a palavra 'suporte' solta (dar suporte à equipe) não vira a habilidade Suporte técnico", () => {
    const n = normalizarVaga(
      vaga({ titulo: "Estágio em Desenvolvimento de Software", descricao: "Dar suporte à equipe e participar das reuniões." }),
      HABILIDADES,
    )!;
    expect(n.requisitos.map((r) => r.slug)).not.toContain("suporte");
    expect(n.area).toBe("Programação");
  });

  it("'Analista de Suporte Júnior' continua sendo suporte", () => {
    const n = normalizarVaga(vaga({ titulo: "Analista de Suporte Júnior", descricao: "Atendimento de chamados." }), HABILIDADES)!;
    expect(n.requisitos.map((r) => r.slug)).toContain("suporte");
    expect(n.area).toBe("Suporte");
  });

  it("exibe a descrição com as frases separadas, mas lê as habilidades do texto original", () => {
    const n = normalizarVaga(
      vaga({ titulo: "Desenvolvedor Júnior", descricao: "Buscamos pessoas curiosas.Você usará Asp.NET e SQL no dia a dia." }),
      HABILIDADES,
    )!;
    expect(n.descricao).toBe("Buscamos pessoas curiosas. Você usará Asp.NET e SQL no dia a dia.");
    expect(n.requisitos.map((r) => r.slug)).toEqual(expect.arrayContaining(["csharp", "sql"]));
  });

  it("lê a bolsa do texto quando a fonte não informa o valor", () => {
    const n = normalizarVaga(vaga({ titulo: "Estágio em TI", descricao: "Python e SQL. Bolsa auxílio: R$ 1.500,00 no primeiro ano.R$ 1.900,00 no segundo ano.Vale-transporte" }), HABILIDADES)!;
    expect(n.salario).toEqual({ min: 1500, max: 1900, origem: "texto" });
  });

  it("o valor que a fonte informa tem prioridade sobre o texto", () => {
    const n = normalizarVaga(
      vaga({ titulo: "Estágio em TI", descricao: "Python. Bolsa auxílio: R$ 999,00", salario: { min: 1500, max: 1500, origem: "fonte" } }),
      HABILIDADES,
    )!;
    expect(n.salario).toEqual({ min: 1500, max: 1500, origem: "fonte" });
  });

  it("encontra a bolsa no FIM de uma descrição longa, antes de ela ser cortada", () => {
    const longa = "Python e SQL. " + "texto de apresentação da empresa. ".repeat(80) + "Informações adicionaisBolsa auxílio: R$ 1.800,00Vale refeição";
    expect(longa.length).toBeGreaterThan(1500);
    const n = normalizarVaga(vaga({ titulo: "Estágio em TI", descricao: longa }), HABILIDADES)!;
    expect(n.descricao.length).toBeLessThanOrEqual(1501);
    expect(n.salario).toEqual({ min: 1800, max: 1800, origem: "texto" });
  });

  it("sem valor no anúncio, o salário é nulo", () => {
    expect(normalizarVaga(vaga({ titulo: "Estágio em TI", descricao: "Python e SQL. Bolsa a combinar." }), HABILIDADES)!.salario).toBeNull();
  });

  it("usa 'Brasil' quando a fonte não traz cidade e limita o tamanho da descrição", () => {
    const n = normalizarVaga(vaga({ cidade: "", descricao: "Python. " + "texto ".repeat(1000) }), HABILIDADES)!;
    expect(n.cidade).toBe("Brasil");
    expect(n.descricao.length).toBeLessThanOrEqual(1501);
  });
});
