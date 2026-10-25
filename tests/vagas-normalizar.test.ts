import { describe, expect, it } from "vitest";
import { HABILIDADES } from "@/lib/dados/habilidades";
import { detectarModalidade, detectarTipo, escolherArea, extrairRequisitos, normalizarVaga } from "@/lib/vagas/normalizar";
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
    ["Estágio em Desenvolvimento", [], "estagio"],
    ["Estagiário de Dados", [], "estagio"],
    ["Software Engineering Intern", [], "estagio"],
    ["Programa de Trainee em TI", [], "trainee"],
    ["Desenvolvedor Backend Júnior", [], "junior"],
    ["Analista de Suporte Jr.", [], "junior"],
    ["Desenvolvedor Backend", ["Júnior"], "junior"],
    ["Desenvolvedor", ["Estágio"], "estagio"],
  ])("%s -> %s", (titulo, rotulos, esperado) => {
    expect(detectarTipo(titulo as string, rotulos as string[])).toBe(esperado);
  });

  it.each([
    ["Desenvolvedor Sênior", []],
    ["Engenheiro de Software Pleno", ["Júnior"]],
    ["Tech Lead Java", []],
    ["Desenvolvedor Backend", ["Pleno"]],
    ["Desenvolvedor Backend", []],
  ])("descarta %s", (titulo, rotulos) => {
    expect(detectarTipo(titulo, rotulos)).toBeNull();
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

  it("descarta vaga que não é para iniciantes", () => {
    expect(normalizarVaga(vaga({ titulo: "Desenvolvedor Sênior" }), HABILIDADES)).toBeNull();
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
