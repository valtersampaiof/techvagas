import { describe, expect, it } from "vitest";
import {
  calcularCompatibilidade,
  recomendarCursos,
  type CursoCandidato,
  type Requisito,
} from "@/lib/compatibilidade";

const req = (slug: string, nivelMinimo = "iniciante", obrigatorio = true): Requisito => ({
  slug,
  nome: slug,
  nivelMinimo,
  obrigatorio,
});

const curso = (id: number, extra: Partial<CursoCandidato>): CursoCandidato => ({
  id,
  titulo: `Curso ${id}`,
  instituicao: "X",
  link: "https://exemplo.com",
  gratuito: true,
  preco: "",
  cargaHoraria: 10,
  nivel: "iniciante",
  certificado: false,
  descricao: "",
  habilidades: [],
  ...extra,
});

describe("calcularCompatibilidade", () => {
  it("dá 100% quando todos os requisitos são atendidos", () => {
    const r = calcularCompatibilidade(
      [req("python"), req("sql", "iniciante")],
      [{ slug: "python", nivel: "intermediario" }, { slug: "sql", nivel: "iniciante" }],
    );
    expect(r.percentual).toBe(100);
    expect(r.lacunas).toHaveLength(0);
  });

  it("aponta a habilidade que falta", () => {
    const r = calcularCompatibilidade(
      [req("python"), req("seguranca")],
      [{ slug: "python", nivel: "iniciante" }],
    );
    expect(r.percentual).toBe(50);
    expect(r.lacunas.map((l) => [l.slug, l.situacao])).toEqual([["seguranca", "ausente"]]);
  });

  it("dá crédito parcial para nível abaixo do pedido", () => {
    const r = calcularCompatibilidade(
      [req("redes", "avancado")],
      [{ slug: "redes", nivel: "iniciante" }],
    );
    expect(r.percentual).toBe(50);
    expect(r.lacunas[0]).toMatchObject({ situacao: "nivel_abaixo", nivelAtual: "iniciante" });
  });

  it("requisito obrigatório pesa mais que o desejável", () => {
    const so_obrigatorio = calcularCompatibilidade(
      [req("a", "iniciante", true), req("b", "iniciante", false)],
      [{ slug: "a", nivel: "iniciante" }],
    );
    const so_desejavel = calcularCompatibilidade(
      [req("a", "iniciante", true), req("b", "iniciante", false)],
      [{ slug: "b", nivel: "iniciante" }],
    );
    expect(so_obrigatorio.percentual).toBe(75);
    expect(so_desejavel.percentual).toBe(25);
  });

  it("sem nenhuma habilidade dá 0%, e vaga sem requisitos dá 100%", () => {
    expect(calcularCompatibilidade([req("python")], []).percentual).toBe(0);
    expect(calcularCompatibilidade([], []).percentual).toBe(100);
  });

  it("lista as lacunas obrigatórias antes das desejáveis", () => {
    const r = calcularCompatibilidade([req("a", "iniciante", false), req("b", "iniciante", true)], []);
    expect(r.lacunas.map((l) => l.slug)).toEqual(["b", "a"]);
  });
});

describe("recomendarCursos", () => {
  const compat = calcularCompatibilidade([req("seguranca"), req("linux")], []);

  it("indica um curso gratuito e um pago para a lacuna", () => {
    const cursos = [
      curso(1, { gratuito: true, habilidades: [{ slug: "seguranca", nivelEnsinado: "iniciante" }] }),
      curso(2, { gratuito: false, certificado: true, habilidades: [{ slug: "seguranca", nivelEnsinado: "avancado" }] }),
    ];
    const rec = recomendarCursos(compat.lacunas, cursos);
    const seg = rec.porLacuna.find((p) => p.lacuna.slug === "seguranca")!;
    expect(seg.melhorGratuito?.id).toBe(1);
    expect(seg.melhorPago?.id).toBe(2);
  });

  it("ignora cursos que ensinam num nível abaixo do exigido", () => {
    const lacunas = calcularCompatibilidade([req("redes", "avancado")], []).lacunas;
    const rec = recomendarCursos(lacunas, [
      curso(1, { habilidades: [{ slug: "redes", nivelEnsinado: "iniciante" }] }),
    ]);
    expect(rec.porLacuna[0].melhorGratuito).toBeNull();
    expect(rec.porLacuna[0].melhorPago).toBeNull();
  });

  it("prefere o curso que cobre mais lacunas e destaca os mais úteis", () => {
    const cursos = [
      curso(1, { habilidades: [{ slug: "seguranca", nivelEnsinado: "iniciante" }] }),
      curso(2, {
        habilidades: [
          { slug: "seguranca", nivelEnsinado: "iniciante" },
          { slug: "linux", nivelEnsinado: "iniciante" },
        ],
      }),
    ];
    const rec = recomendarCursos(compat.lacunas, cursos);
    expect(rec.porLacuna[0].melhorGratuito?.id).toBe(2);
    expect(rec.maisUteis[0].curso.id).toBe(2);
    expect(rec.maisUteis[0].lacunasCobertas).toHaveLength(2);
  });

  it("não quebra sem lacunas", () => {
    expect(recomendarCursos([], [curso(1, {})])).toEqual({ porLacuna: [], maisUteis: [] });
  });
});

describe("recomendarCursos: adequação ao nível", () => {
  it("para iniciante, prefere o curso de entrada ao curso que já começa no intermediário", () => {
    const lacunas = calcularCompatibilidade([req("seguranca", "iniciante")], []).lacunas;
    const rec = recomendarCursos(lacunas, [
      curso(1, { gratuito: false, nivel: "intermediario", certificado: true, cargaHoraria: 80, habilidades: [{ slug: "seguranca", nivelEnsinado: "avancado" }] }),
      curso(2, { gratuito: false, nivel: "iniciante", certificado: true, cargaHoraria: 180, habilidades: [{ slug: "seguranca", nivelEnsinado: "avancado" }] }),
    ]);
    expect(rec.porLacuna[0].melhorPago?.id).toBe(2);
  });

  it("não deixa uma lacuna desejável decidir sozinha contra a adequação ao nível", () => {
    const lacunas = calcularCompatibilidade(
      [req("seguranca", "iniciante", true), req("ingles", "iniciante", false)],
      [],
    ).lacunas;
    const rec = recomendarCursos(lacunas, [
      curso(1, { gratuito: false, nivel: "intermediario", certificado: true, habilidades: [{ slug: "seguranca", nivelEnsinado: "avancado" }, { slug: "ingles", nivelEnsinado: "intermediario" }] }),
      curso(2, { gratuito: false, nivel: "iniciante", certificado: true, habilidades: [{ slug: "seguranca", nivelEnsinado: "avancado" }] }),
    ]);
    const seg = rec.porLacuna.find((p) => p.lacuna.slug === "seguranca")!;
    expect(seg.melhorPago?.id).toBe(2);
  });
});

describe("recomendarCursos: foco do curso", () => {
  it("prefere o curso dedicado à habilidade a um que apenas passa por ela", () => {
    const lacunas = calcularCompatibilidade([req("seguranca", "iniciante")], []).lacunas;
    const rec = recomendarCursos(lacunas, [
      curso(1, { gratuito: false, certificado: true, habilidades: [{ slug: "suporte", nivelEnsinado: "avancado", principal: true }, { slug: "seguranca", nivelEnsinado: "iniciante" }] }),
      curso(2, { gratuito: false, certificado: true, habilidades: [{ slug: "seguranca", nivelEnsinado: "avancado", principal: true }, { slug: "linux", nivelEnsinado: "intermediario" }] }),
    ]);
    expect(rec.porLacuna[0].melhorPago?.id).toBe(2);
  });
});
