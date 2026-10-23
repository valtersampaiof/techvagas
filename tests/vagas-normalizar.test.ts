import { describe, expect, it } from "vitest";
import { HABILIDADES } from "@/lib/dados/habilidades";
import { detectarModalidade, detectarTipo, escolherArea, extrairRequisitos, normalizarVaga } from "@/lib/vagas/normalizar";
import { htmlParaTexto, markdownParaTexto, truncar, urlSegura } from "@/lib/vagas/texto";
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

  it("não deixa passar vaga que só parece de TI pela palavra 'desenvolvedor'", () => {
    expect(normalizarVaga(vaga({ titulo: "Pessoa Desenvolvedor(a) de Negócios Júnior", descricao: "Vendas e prospecção." }), HABILIDADES)).toBeNull();
    expect(normalizarVaga(vaga({ titulo: "Estágio para Direito", descricao: "Rotinas jurídicas." }), HABILIDADES)).toBeNull();
    expect(normalizarVaga(vaga({ titulo: "Analista Contábil Jr", descricao: "Conciliações contábeis." }), HABILIDADES)).toBeNull();
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

  it("usa 'Brasil' quando a fonte não traz cidade e limita o tamanho da descrição", () => {
    const n = normalizarVaga(vaga({ cidade: "", descricao: "Python. " + "texto ".repeat(1000) }), HABILIDADES)!;
    expect(n.cidade).toBe("Brasil");
    expect(n.descricao.length).toBeLessThanOrEqual(1501);
  });
});
