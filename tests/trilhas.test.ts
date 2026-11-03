import { describe, expect, it } from "vitest";
import type { CursoCandidato } from "@/lib/compatibilidade";
import { CURSOS } from "@/lib/dados/cursos";
import { HABILIDADES } from "@/lib/dados/habilidades";
import { TRILHAS } from "@/lib/dados/trilhas";
import { habilidadesGanhasComCurso } from "@/lib/conclusao";
import { cursosDoPasso, montarTrilha } from "@/lib/trilhas";

const catalogo: CursoCandidato[] = CURSOS.map((c, i) => ({
  id: i + 1,
  titulo: c.titulo,
  instituicao: c.instituicao,
  link: c.link,
  gratuito: c.gratuito,
  preco: c.preco,
  cargaHoraria: c.cargaHoraria,
  nivel: c.nivel,
  certificado: c.certificado,
  descricao: c.descricao,
  habilidades: c.habilidades.map(([slug, nivelEnsinado], j) => ({ slug, nivelEnsinado, principal: j === 0 })),
}));

describe("catálogo de trilhas", () => {
  it("só cita habilidades que existem, sem repetir habilidade na mesma trilha", () => {
    const slugs = new Set(HABILIDADES.map((h) => h.slug));
    for (const t of TRILHAS) {
      expect(t.passos.length, t.slug).toBeGreaterThanOrEqual(4);
      const vistos = new Set<string>();
      for (const p of t.passos) {
        expect(slugs.has(p.habilidade), `${t.slug}: ${p.habilidade}`).toBe(true);
        expect(vistos.has(p.habilidade), `${t.slug}: ${p.habilidade} repetida`).toBe(false);
        vistos.add(p.habilidade);
      }
    }
    expect(new Set(TRILHAS.map((t) => t.slug)).size).toBe(TRILHAS.length);
  });

  it("todo passo tem pelo menos um curso, e o primeiro de cada passo começa do básico ou é o melhor disponível", () => {
    for (const t of TRILHAS) {
      for (const p of t.passos) {
        const cursos = cursosDoPasso(p, catalogo);
        expect(cursos.length, `${t.slug}/${p.habilidade}`).toBeGreaterThanOrEqual(1);
        expect(cursos.length).toBeLessThanOrEqual(2);
        expect(new Set(cursos.map((c) => c.id)).size).toBe(cursos.length);
      }
    }
  });
});

describe("montarTrilha", () => {
  const trilha = TRILHAS.find((t) => t.slug === "dados")!;

  it("sem perfil nem cursos concluídos, nada está feito e o próximo é o primeiro", () => {
    const m = montarTrilha(trilha, catalogo);
    expect(m.concluidos).toBe(0);
    expect(m.proximo).toBe(0);
  });

  it("habilidade que o perfil já tem no nível da meta conta como feita", () => {
    const m = montarTrilha(trilha, catalogo, new Map([["logica", "iniciante"], ["sql", "avancado"]]));
    expect(m.passos[0]).toMatchObject({ concluido: true, motivoDaConclusao: "perfil" });
    expect(m.passos[1]).toMatchObject({ concluido: true, motivoDaConclusao: "perfil" });
    expect(m.proximo).toBe(2);
  });

  it("nível abaixo da meta não conta", () => {
    const m = montarTrilha(trilha, catalogo, new Map([["sql", "iniciante"]]));
    expect(m.passos[1].concluido).toBe(false);
  });

  it("passo cujos cursos foram todos concluídos conta como feito", () => {
    const sql = montarTrilha(trilha, catalogo).passos[1];
    const m = montarTrilha(trilha, catalogo, new Map(), new Set(sql.cursos.map((c) => c.id)));
    expect(m.passos[1]).toMatchObject({ concluido: true, motivoDaConclusao: "cursos" });
  });

  it("trilha toda feita não tem próximo passo", () => {
    const perfil = new Map(trilha.passos.map((p) => [p.habilidade, "avancado"]));
    const m = montarTrilha(trilha, catalogo, perfil);
    expect(m.concluidos).toBe(trilha.passos.length);
    expect(m.proximo).toBeNull();
  });
});

describe("habilidadesGanhasComCurso", () => {
  const curso = { habilidades: [{ slug: "sql", nivelEnsinado: "intermediario" }, { slug: "redes", nivelEnsinado: "iniciante" }, { slug: "python", nivelEnsinado: "intermediario" }] };

  it("soma ao perfil o que o curso ensina de verdade, e ignora citação de passagem", () => {
    const g = habilidadesGanhasComCurso(curso, new Map());
    expect(g.map((x) => x.slug)).toEqual(["sql", "python"]); // "redes" só em nível iniciante, e não é a principal
    expect(g[0]).toEqual({ slug: "sql", nivel: "intermediario", antes: null });
  });

  it("sobe de nível quem tinha menos, e nunca diminui", () => {
    const g = habilidadesGanhasComCurso(curso, new Map([["sql", "iniciante"], ["python", "avancado"]]));
    expect(g).toEqual([{ slug: "sql", nivel: "intermediario", antes: "iniciante" }]);
  });

  it("curso de uma habilidade só, em nível iniciante, conta (ela é a principal)", () => {
    expect(habilidadesGanhasComCurso({ habilidades: [{ slug: "git", nivelEnsinado: "iniciante" }] }, new Map()).map((x) => x.slug)).toEqual(["git"]);
  });
});
