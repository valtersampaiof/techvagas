import { describe, expect, it } from "vitest";
import type { CursoCandidato } from "@/lib/compatibilidade";
import { alcanceDoCurso, ehHabilidadePrincipal, ensinaDeVerdade, filtrarCursos, idiomaDoCurso, ordenarCursos } from "@/lib/filtrar-cursos";

const c = (id: number, extra: Partial<CursoCandidato> = {}): CursoCandidato => ({
  id,
  titulo: `Curso ${id}`,
  instituicao: "Escola",
  link: "https://exemplo.com/x",
  gratuito: true,
  preco: "",
  cargaHoraria: 10,
  nivel: "iniciante",
  certificado: false,
  descricao: "",
  habilidades: [{ slug: "python", nivelEnsinado: "iniciante" }],
  ...extra,
});
const ids = (l: CursoCandidato[]) => l.map((x) => x.id);

describe("idiomaDoCurso", () => {
  const base = { titulo: "", instituicao: "", link: "https://exemplo.com", descricao: "" };

  it("'Em inglês' na descrição indica inglês", () => {
    expect(idiomaDoCurso({ ...base, titulo: "Curso de algoritmos", descricao: "Curso clássico. Em inglês, com legendas." })).toBe("en");
  });
  it("mencionar português indica português, mesmo com título em inglês", () => {
    expect(idiomaDoCurso({ ...base, titulo: "Machine Learning Crash Course", descricao: "Introdução, com versão em português." })).toBe("pt");
  });
  it("endereço /pt-br/ e instituições brasileiras indicam português", () => {
    expect(idiomaDoCurso({ ...base, titulo: "Azure Fundamentals", link: "https://learn.microsoft.com/pt-br/x" })).toBe("pt");
    expect(idiomaDoCurso({ ...base, titulo: "Python Basics", instituicao: "Alura" })).toBe("pt");
    expect(idiomaDoCurso({ ...base, titulo: "Python Basics", instituicao: "Curso em Vídeo" })).toBe("pt");
  });
  it("título em português indica português", () => {
    expect(idiomaDoCurso({ ...base, titulo: "Fundamentos de Redes" })).toBe("pt");
  });
  it("sem nenhum sinal, é inglês", () => {
    expect(idiomaDoCurso({ ...base, titulo: "Introduction to Algorithms", instituicao: "MIT" })).toBe("en");
  });
  it("HackerRank e DataCamp são em inglês mesmo com 'de' no título", () => {
    expect(idiomaDoCurso({ ...base, titulo: "Certificações de habilidades", instituicao: "HackerRank" })).toBe("en");
    expect(idiomaDoCurso({ ...base, titulo: "Cursos de dados", instituicao: "DataCamp" })).toBe("en");
  });
  it("na Coursera, o título traduzido só vale para Google e USP", () => {
    expect(idiomaDoCurso({ ...base, titulo: "Certificado Profissional de Desenvolvedor Front-End", instituicao: "Meta (Coursera)" })).toBe("en");
    expect(idiomaDoCurso({ ...base, titulo: "Certificado Profissional Google de Análise de Dados", instituicao: "Google (Coursera)" })).toBe("pt");
    expect(idiomaDoCurso({ ...base, titulo: "Introdução à Ciência da Computação", instituicao: "USP (Coursera)" })).toBe("pt");
  });
  it("cursos da Cisco são em português, menos os de inglês", () => {
    expect(idiomaDoCurso({ ...base, titulo: "Networking Essentials", instituicao: "Cisco Networking Academy" })).toBe("pt");
    expect(idiomaDoCurso({ ...base, titulo: "English for IT 1", instituicao: "Cisco Networking Academy" })).toBe("en");
  });
});

describe("filtrarCursos", () => {
  const lista = [
    c(1, { titulo: "Python do zero", instituicao: "Alura", gratuito: false, certificado: true, cargaHoraria: 60, descricao: "Aprenda lógica" }),
    c(2, { titulo: "Algoritmos", instituicao: "Curso em Vídeo", certificado: true, cargaHoraria: 8 }),
    c(3, { titulo: "Redes", nivel: "intermediario", cargaHoraria: 30, habilidades: [{ slug: "redes", nivelEnsinado: "avancado" }] }),
    c(4, { titulo: "Linux", cargaHoraria: 12, habilidades: [{ slug: "linux", nivelEnsinado: "intermediario" }, { slug: "redes", nivelEnsinado: "iniciante" }] }),
  ];

  it("sem filtro devolve tudo", () => {
    expect(ids(filtrarCursos(lista, {}))).toEqual([1, 2, 3, 4]);
  });

  it("busca por texto ignora acentos e maiúsculas e exige todas as palavras", () => {
    expect(ids(filtrarCursos(lista, { q: "ALGORITMOS" }))).toEqual([2]);
    expect(ids(filtrarCursos(lista, { q: "logica" }))).toEqual([1]); // acha "lógica" na descrição
    expect(ids(filtrarCursos(lista, { q: "alura python" }))).toEqual([1]);
    expect(ids(filtrarCursos(lista, { q: "alura linux" }))).toEqual([]);
    expect(ids(filtrarCursos(lista, { q: "curso em video" }))).toEqual([2]); // título ou instituição
  });

  it("preço, certificado e nível de entrada", () => {
    expect(ids(filtrarCursos(lista, { preco: "gratuito" }))).toEqual([2, 3, 4]);
    expect(ids(filtrarCursos(lista, { preco: "pago" }))).toEqual([1]);
    expect(ids(filtrarCursos(lista, { certificado: "1" }))).toEqual([1, 2]);
    expect(ids(filtrarCursos(lista, { nivel: "intermediario" }))).toEqual([3]);
  });

  it("habilidade: não traz curso que só cita a habilidade de passagem", () => {
    // O curso de Linux (4) toca em redes só no nível iniciante, como assunto secundário.
    expect(ids(filtrarCursos(lista, { habilidade: "redes" }))).toEqual([3]);
    expect(ids(filtrarCursos(lista, { habilidade: "linux" }))).toEqual([4]);
  });

  it("habilidade secundária vale quando o curso leva até o nível intermediário", () => {
    const curso = c(9, { habilidades: [{ slug: "docker", nivelEnsinado: "intermediario" }, { slug: "linux", nivelEnsinado: "intermediario" }] });
    expect(ids(filtrarCursos([curso], { habilidade: "linux" }))).toEqual([9]);
  });

  it("habilidade usa a marcação de principal quando ela existe", () => {
    const curso = c(9, { habilidades: [{ slug: "git", nivelEnsinado: "iniciante", principal: false }, { slug: "ingles", nivelEnsinado: "iniciante", principal: true }] });
    expect(ehHabilidadePrincipal(curso, "ingles")).toBe(true);
    expect(ehHabilidadePrincipal(curso, "git")).toBe(false);
    expect(ensinaDeVerdade(curso, "git")).toBe(false);
  });

  it("busca: 'java' não traz 'javascript' e 'sql' não traz 'mysql'", () => {
    const cursos = [c(1, { titulo: "JavaScript moderno" }), c(2, { titulo: "Java para iniciantes" }), c(3, { titulo: "MySQL na prática" }), c(4, { titulo: "SQL básico" })];
    expect(ids(filtrarCursos(cursos, { q: "java" }))).toEqual([2]);
    expect(ids(filtrarCursos(cursos, { q: "sql" }))).toEqual([4]);
    expect(ids(filtrarCursos(cursos, { q: "javascript" }))).toEqual([1]);
  });

  it("busca: frases de idioma e certificado das descrições não contam como assunto", () => {
    const cursos = [
      c(1, { titulo: "Kubernetes na prática", descricao: "Orquestração de contêineres. Em inglês, com legendas em português. Sem certificado." }),
      c(2, { titulo: "Inglês para Tecnologia", descricao: "Vocabulário técnico." }),
    ];
    expect(ids(filtrarCursos(cursos, { q: "inglês" }))).toEqual([2]);
    expect(ids(filtrarCursos(cursos, { q: "certificado" }))).toEqual([]);
  });

  it("'chega até' considera a habilidade escolhida, não as outras", () => {
    // Linux (4) chega ao intermediário em Linux, mas só ao iniciante em Redes.
    expect(ids(filtrarCursos(lista, { alcance: "intermediario", habilidade: "redes" }))).toEqual([3]);
    expect(ids(filtrarCursos(lista, { alcance: "intermediario", habilidade: "linux" }))).toEqual([4]);
    // Sem habilidade escolhida, vale o maior nível do curso.
    expect(ids(filtrarCursos(lista, { alcance: "intermediario" }))).toEqual([3, 4]);
    expect(ids(filtrarCursos(lista, { alcance: "avancado" }))).toEqual([3]);
  });

  it("duração", () => {
    expect(ids(filtrarCursos(lista, { duracao: "curto" }))).toEqual([2]);
    expect(ids(filtrarCursos(lista, { duracao: "medio" }))).toEqual([3, 4]);
    expect(ids(filtrarCursos(lista, { duracao: "longo" }))).toEqual([1]);
  });

  it("idioma", () => {
    // 1 (Alura) e 2 (Curso em Vídeo) têm sinais de português; 3 e 4 não têm nenhum.
    expect(ids(filtrarCursos(lista, { idioma: "pt" }))).toEqual([1, 2]);
    expect(ids(filtrarCursos(lista, { idioma: "en" }))).toEqual([3, 4]);
  });

  it("combina filtros (E)", () => {
    expect(ids(filtrarCursos(lista, { preco: "gratuito", certificado: "1", duracao: "curto" }))).toEqual([2]);
    expect(ids(filtrarCursos(lista, { preco: "pago", duracao: "curto" }))).toEqual([]);
  });

  it("valores desconhecidos não filtram nada", () => {
    expect(ids(filtrarCursos(lista, { duracao: "inexistente", preco: "xyz" }))).toEqual([1, 2, 3, 4]);
  });
});

describe("alcanceDoCurso", () => {
  it("devolve o maior nível, geral ou da habilidade", () => {
    const curso = c(1, { habilidades: [{ slug: "a", nivelEnsinado: "avancado" }, { slug: "b", nivelEnsinado: "iniciante" }] });
    expect(alcanceDoCurso(curso)).toBe(3);
    expect(alcanceDoCurso(curso, "b")).toBe(1);
    expect(alcanceDoCurso(curso, "inexistente")).toBe(0);
  });
});

describe("ordenarCursos", () => {
  const lista = [
    c(1, { titulo: "B", gratuito: false, certificado: true, cargaHoraria: 5 }),
    c(2, { titulo: "A", gratuito: true, certificado: false, cargaHoraria: 50 }),
    c(3, { titulo: "C", gratuito: true, certificado: true, cargaHoraria: 30 }),
    c(4, { titulo: "D", gratuito: true, certificado: true, cargaHoraria: 10 }),
  ];
  it("relevância: gratuitos com certificado, depois gratuitos, depois pagos; empate em ordem alfabética", () => {
    expect(ids(ordenarCursos(lista))).toEqual([3, 4, 2, 1]);
  });
  it("relevância: em empate, os cursos em português vêm primeiro", () => {
    const mista = [
      c(1, { titulo: "A course", certificado: true }), // sem sinais de português → inglês
      c(2, { titulo: "Curso de Python", certificado: true }), // português
      c(3, { titulo: "B course", certificado: true, instituicao: "Alura" }), // instituição brasileira
    ];
    expect(ids(ordenarCursos(mista))).toEqual([3, 2, 1]);
  });
  it("relevância com habilidade escolhida: os cursos feitos para ensiná-la vêm antes", () => {
    const cursos = [
      c(1, { titulo: "A", gratuito: true, certificado: true, habilidades: [{ slug: "docker", nivelEnsinado: "iniciante" }, { slug: "linux", nivelEnsinado: "intermediario" }] }),
      c(2, { titulo: "B", gratuito: false, habilidades: [{ slug: "linux", nivelEnsinado: "intermediario" }] }),
    ];
    expect(ids(ordenarCursos(cursos, undefined, "linux"))).toEqual([2, 1]);
    expect(ids(ordenarCursos(cursos))).toEqual([1, 2]);
  });
  it("menor e maior carga horária", () => {
    expect(ids(ordenarCursos(lista, "menor"))).toEqual([1, 4, 3, 2]);
    expect(ids(ordenarCursos(lista, "maior"))).toEqual([2, 3, 4, 1]);
  });
  it("alfabética, com acentos do português", () => {
    expect(ids(ordenarCursos([c(1, { titulo: "Árvores" }), c(2, { titulo: "Bancos" }), c(3, { titulo: "Algoritmos" })], "az"))).toEqual([3, 1, 2]);
  });
  it("não altera a lista original", () => {
    const copia = [...lista];
    ordenarCursos(lista, "maior");
    expect(lista).toEqual(copia);
  });
});
