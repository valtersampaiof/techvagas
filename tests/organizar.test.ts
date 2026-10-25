import { describe, expect, it } from "vitest";
import { lerDescricaoOrganizada, organizarDescricao, textoSimples, type IdDaSecao } from "@/lib/vagas/organizar";
import { htmlParaTextoEstruturado, markdownParaTextoEstruturado } from "@/lib/vagas/texto";

const secao = (o: ReturnType<typeof organizarDescricao>, id: IdDaSecao) => o.secoes.find((s) => s.id === id);

// Trechos de anúncios reais da Gupy: texto puro, sem etiquetas, com os títulos colados à frase seguinte.
const COMPRADOR =
  "Está preparado(a) para fazer parte de um time que faz a diferença? O Grupo Urca Energia é esse lugar.Se você quer contribuir, venha fazer parte do nosso time como Comprador Pleno." +
  "Responsabilidades e atribuiçõesGerenciar compras de MRP, EPIs, itens técnicos (mecânica, elétrica, automação) e equipamentos especiais;Emitir e acompanhar pedidos de compra, notas fiscais e contratos;" +
  "Abrir concorrências e negociar com fornecedores, analisando Curva ABC e relatórios comparativos;Monitorar estoques e criar relatórios do desempenho de indicadores da área." +
  "Requisitos e qualificaçõesFormação em Administração, Logística, Contabilidade, Economia ou áreas correlatas;Perfil analítico, organizado e com habilidade de negociação;\nConhecimento em gestão de contratos, avaliação de fornecedores e \nprocessos de aquisição.&nbsp;&nbsp;Capacidade analítica para avaliação de propostas.\n\nConhecimento intermediário em Excel.Informações adicionais\nVale Refeição/Alimentação:&nbsp;Valor fixo por mês em um cartão único;&nbsp;&nbsp;Plano de saúde e odontológico:&nbsp;cobertura nacional";

const DEV_JAVA =
  "Na Stefanini, acreditamos no poder da colaboração.Junte-se a nós e seja parte da mudança!\n\n" +
  "Responsabilidades e atribuiçõesDesenvolver e evoluir aplicações Backend utilizando Java e Spring Boot.Implementar APIs REST escaláveis, seguras e de alta disponibilidade.Colaborar com equipes de Arquitetura, DevOps e QA.\n\n" +
  "Requisitos e qualificaçõesRequisitos Obrigatórios:• Graduação completa em Tecnologia da Informação ou áreas correlatas.• Experiência sólida em desenvolvimento Backend utilizando Java.• Mínimo de 5 anos de experiência com APIs REST.• Inglês avançado para leitura e conversação.• Certificação AWS Certified Developer é desejável.\n\n" +
  "Informações adicionais🍛 Vale-alimentação🏥 Plano de saúde";

const ESTAGIO =
  "Requisitos e qualificações\n\nO que você precisa ter para juntar-se a nós?Estar cursando curso técnico ou graduação na área de Tecnologia da Informação;Conhecimentos básicos de informática;Perfil proativo, organizado\nO que aumenta suas chances?Noções básicas de redes;Experiência com atendimento e suporte de TI.Informações adicionais\n\n\nJornada de Trabalho:06h diárias;Segunda à sexta das 08h às 14h.\n\n\nModelo/Local de Trabalho:Presencial | Centro - Curitiba / PR.\n\nInformações adicionais\nNossos benefícios:Vale-transporte por dia trabalhado;\nDay Off no aniversário;Política de vestimenta alinhada ao ambiente corporativo";

describe("organizarDescricao: texto da Gupy com títulos colados", () => {
  const o = organizarDescricao(COMPRADOR);

  it("separa o título da frase seguinte e cria as seções", () => {
    expect(o.secoes.map((s) => s.id)).toEqual(["sobre", "responsabilidades", "requisitos", "outras"]);
    const todos = o.secoes.flatMap((s) => [...s.paragrafos, ...s.itens]).join(" | ");
    expect(todos).not.toMatch(/atribuições[A-Z]|qualificações[A-Z]|adicionais[A-Z]/);
  });

  it("cada atividade vira um item, sem quebrar no meio dos parênteses nem do texto", () => {
    expect(secao(o, "responsabilidades")!.itens).toEqual([
      "Gerenciar compras de MRP, EPIs, itens técnicos (mecânica, elétrica, automação) e equipamentos especiais",
      "Emitir e acompanhar pedidos de compra, notas fiscais e contratos",
      "Abrir concorrências e negociar com fornecedores, analisando Curva ABC e relatórios comparativos",
      "Monitorar estoques e criar relatórios do desempenho de indicadores da área",
    ]);
  });

  it("junta linhas quebradas no meio da frase e separa frases coladas", () => {
    const itens = secao(o, "requisitos")!.itens;
    expect(itens).toContain("Conhecimento em gestão de contratos, avaliação de fornecedores e processos de aquisição");
    expect(itens).toContain("Capacidade analítica para avaliação de propostas");
    expect(itens).toContain("Conhecimento intermediário em Excel");
  });

  it("lê a escolaridade e organiza as informações adicionais", () => {
    expect(o.fatos.escolaridade).toEqual(["Formação em Administração, Logística, Contabilidade, Economia ou áreas correlatas"]);
    expect(secao(o, "outras")!.titulo).toBe("Informações adicionais");
    expect(secao(o, "outras")!.itens[0]).toBe("Vale Refeição/Alimentação: Valor fixo por mês em um cartão único");
  });

  it("o resumo traz as atividades da vaga, não a propaganda da empresa", () => {
    expect(o.resumo).toMatch(/^Gerenciar compras de MRP/);
    expect(o.resumo).not.toMatch(/Está preparado/);
  });
});

describe("organizarDescricao: listas com marcador e rótulos dentro do texto", () => {
  const o = organizarDescricao(DEV_JAVA);

  it("reconhece itens com '•' colados uns nos outros", () => {
    expect(secao(o, "requisitos")!.itens).toEqual([
      "Graduação completa em Tecnologia da Informação ou áreas correlatas",
      "Experiência sólida em desenvolvimento Backend utilizando Java",
      "Mínimo de 5 anos de experiência com APIs REST",
      "Inglês avançado para leitura e conversação",
      "Certificação AWS Certified Developer é desejável",
    ]);
  });

  it("tira escolaridade, experiência, idiomas e certificações dos requisitos", () => {
    expect(o.fatos.escolaridade).toEqual(["Graduação completa em Tecnologia da Informação ou áreas correlatas"]);
    expect(o.fatos.experiencia).toEqual(expect.arrayContaining(["Mínimo de 5 anos de experiência com APIs REST"]));
    expect(o.fatos.idiomas).toEqual(["Inglês avançado para leitura e conversação"]);
    expect(o.fatos.certificacoes).toEqual(["Certificação AWS Certified Developer é desejável"]);
  });

  it("emojis no começo dos itens viram itens (benefícios) sem o emoji", () => {
    const todos = o.secoes.flatMap((s) => s.itens);
    expect(todos).toContain("Vale-alimentação");
    expect(todos).toContain("Plano de saúde");
    expect(todos.join(" ")).not.toMatch(/🍛|🏥/);
  });
});

describe("organizarDescricao: subtítulos", () => {
  const o = organizarDescricao(ESTAGIO);

  it("'O que aumenta suas chances?' abre os diferenciais e 'Nossos benefícios:' abre os benefícios", () => {
    expect(secao(o, "requisitos")!.itens).toEqual([
      "Estar cursando curso técnico ou graduação na área de Tecnologia da Informação",
      "Conhecimentos básicos de informática",
      "Perfil proativo, organizado",
    ]);
    expect(secao(o, "diferenciais")!.itens).toEqual(["Noções básicas de redes", "Experiência com atendimento e suporte de TI"]);
    expect(secao(o, "beneficios")!.itens).toEqual([
      "Vale-transporte por dia trabalhado",
      "Day Off no aniversário",
      "Política de vestimenta alinhada ao ambiente corporativo",
    ]);
  });

  it("jornada e local ficam em informações adicionais, com o rótulo legível", () => {
    expect(secao(o, "outras")!.itens).toEqual([
      "Jornada de Trabalho: 06h diárias",
      "Segunda à sexta das 08h às 14h",
      "Modelo/Local de Trabalho: Presencial | Centro - Curitiba / PR",
    ]);
  });
});

describe("organizarDescricao: cuidados", () => {
  it("não quebra frase em abreviatura, nome de tecnologia nem número com ponto", () => {
    const o = organizarDescricao("## Requisitos\n• Experiência com Node.JS e ASP.NET\n• Atuar com a Acme S.A. e a Sr. Silva Ltda. em projetos\n• Versão 3.5 do framework");
    expect(secao(o, "requisitos")!.itens).toEqual([
      "Experiência com Node.JS e ASP.NET",
      "Atuar com a Acme S.A. e a Sr. Silva Ltda. em projetos",
      "Versão 3.5 do framework",
    ]);
  });

  it("não quebra nomes como JavaScript, GitHub e PowerPoint", () => {
    const o = organizarDescricao("Requisitos: Domínio de JavaScript, TypeScript, GitHub e PowerPoint.");
    expect(secao(o, "requisitos")!.itens).toEqual(["Domínio de JavaScript, TypeScript, GitHub e PowerPoint"]);
  });

  it("emoji no fim de uma frase não engole o título da seção seguinte", () => {
    const o = organizarDescricao("Somos uma empresa incrível 🚀Nosso time é diverso 🧡\n\nResponsabilidades e atribuiçõesDesenvolver APIs;Escrever testes.Requisitos e qualificaçõesInglês avançado");
    expect(o.secoes.map((s) => s.id)).toEqual(["sobre", "responsabilidades", "requisitos"]);
    expect(o.secoes.flatMap((s) => [...s.itens, ...s.paragrafos]).join("|")).not.toMatch(/##/);
    expect(secao(o, "responsabilidades")!.itens).toEqual(["Desenvolver APIs", "Escrever testes"]);
  });

  it("palavra minúscula colada em maiúscula vira duas linhas ('neste timeEvolução')", () => {
    const o = organizarDescricao("## Responsabilidades\nSeus desafios neste timeEvolução da Plataforma: construir a base");
    expect(secao(o, "responsabilidades")!.itens).toEqual(["Seus desafios neste time", "Evolução da Plataforma: construir a base"]);
  });

  it("texto sem títulos vira parágrafos legíveis; texto vazio não gera seções", () => {
    const longo = "Estamos buscando uma pessoa para o time. ".repeat(30);
    const o = organizarDescricao(longo);
    expect(o.secoes.map((s) => s.id)).toEqual(["sobre"]);
    expect(o.secoes[0].paragrafos.length).toBeGreaterThan(1);
    expect(organizarDescricao("").secoes).toEqual([]);
    expect(organizarDescricao("   \n\n  ").secoes).toEqual([]);
  });

  it("benefícios com palavras como 'curso' e 'certificado' não viram exigência", () => {
    const o = organizarDescricao("## Requisitos\n• Ensino médio completo\n\n## Benefícios\n• Auxílio educação e certificado de cursos\n• Desconto em idiomas");
    expect(o.fatos.certificacoes).toEqual([]);
    expect(o.fatos.idiomas).toEqual([]);
    expect(o.fatos.escolaridade).toEqual(["Ensino médio completo"]);
  });

  it("identifica vaga afirmativa", () => {
    expect(organizarDescricao("Vaga exclusiva para pessoas com deficiência. Requisitos: Ensino médio.").fatos.afirmativa).toMatch(/exclusiva para pessoas com deficiência/i);
    expect(organizarDescricao("Requisitos: Ensino médio.").fatos.afirmativa).toBe("");
  });

  it("título vazio e sinais soltos ('##', '-') não viram itens", () => {
    const o = organizarDescricao("## Requisitos\n• Python\n##\n• -\n• ##\n## Diferenciais\n• SQL");
    expect(secao(o, "requisitos")!.itens).toEqual(["Python"]);
    expect(secao(o, "diferenciais")!.itens).toEqual(["SQL"]);
  });

  it("etiquetas internas de recrutador ('#LI-Hybrid') somem do texto", () => {
    const o = organizarDescricao("Junte-se a nós e seja parte da mudança!#LI-HYBRID##LI-SM1");
    expect(o.secoes[0].paragrafos).toEqual(["Junte-se a nós e seja parte da mudança!"]);
  });

  it("o texto simples tira as marcas", () => {
    expect(textoSimples("## Requisitos\n• Python\n• SQL")).toBe("Requisitos\nPython\nSQL");
  });
});

describe("organizarDescricao: HTML e Markdown das outras fontes", () => {
  it("HTML da Greenhouse: títulos h2 e negrito viram seções, li vira item", () => {
    const html =
      "<h2><strong>Sobre a Stone:</strong></h2><p>Somos uma empresa de tecnologia.</p><p><strong>Responsabilidades:</strong></p><ul><li>Desenvolver APIs em C#</li><li>Escrever testes</li></ul>" +
      "<h3>Requisitos</h3><ul><li>Graduação em Ciência da Computação ou áreas afins</li><li>Inglês intermediário</li></ul><p><strong>Benefícios</strong></p><ul><li>Plano de saúde</li></ul>";
    const o = organizarDescricao(htmlParaTextoEstruturado(html));
    expect(o.secoes.map((s) => s.id)).toEqual(["sobre", "responsabilidades", "requisitos", "beneficios"]);
    expect(secao(o, "responsabilidades")!.itens).toEqual(["Desenvolver APIs em C#", "Escrever testes"]);
    expect(o.fatos.escolaridade).toEqual(["Graduação em Ciência da Computação ou áreas afins"]);
    expect(o.fatos.idiomas).toEqual(["Inglês intermediário"]);
  });

  it("Markdown do GitHub", () => {
    const o = organizarDescricao(markdownParaTextoEstruturado("## Requisitos\n- **Python**\n- [SQL](https://x.com)\n\n**Benefícios:**\n1. VR\n2. VA"));
    expect(secao(o, "requisitos")!.itens).toEqual(["Python", "SQL"]);
    expect(secao(o, "beneficios")!.itens).toEqual(["VR", "VA"]);
  });
});

describe("lerDescricaoOrganizada", () => {
  it("lê o JSON guardado e recusa o que está vazio ou fora do formato", () => {
    const o = organizarDescricao("## Requisitos\n• Python");
    expect(lerDescricaoOrganizada(JSON.stringify(o))).toEqual(o);
    for (const ruim of ["", "não é json", "{}", '{"secoes":"x","fatos":{}}', "null", undefined, null]) expect(lerDescricaoOrganizada(ruim as string)).toBeNull();
  });
});
