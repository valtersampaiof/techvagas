import { describe, expect, it } from "vitest";
import { CURSOS } from "@/lib/dados/cursos";
import { HABILIDADES } from "@/lib/dados/habilidades";
import { VAGAS } from "@/lib/dados/vagas";
import { ehNivel } from "@/lib/niveis";

const slugs = new Set(HABILIDADES.map((h) => h.slug));

describe("catálogo de habilidades", () => {
  it("não repete identificadores", () => {
    expect(slugs.size).toBe(HABILIDADES.length);
  });
});

describe("catálogo de cursos", () => {
  it("só cita habilidades que existem, com níveis válidos e sem repetir habilidade no mesmo curso", () => {
    for (const c of CURSOS) {
      expect(c.habilidades.length, c.titulo).toBeGreaterThan(0);
      const vistas = new Set<string>();
      for (const [slug, nivel] of c.habilidades) {
        expect(slugs.has(slug), `${c.titulo}: habilidade ${slug}`).toBe(true);
        expect(ehNivel(nivel), `${c.titulo}: nível ${nivel}`).toBe(true);
        expect(vistas.has(slug), `${c.titulo}: ${slug} repetida`).toBe(false);
        vistas.add(slug);
      }
      expect(ehNivel(c.nivel), `${c.titulo}: nível do curso`).toBe(true);
    }
  });

  it("tem links https válidos e não repete curso", () => {
    const chaves = new Set<string>();
    for (const c of CURSOS) {
      expect(new URL(c.link).protocol, c.titulo).toBe("https:");
      const chave = `${c.instituicao}|${c.titulo}`;
      expect(chaves.has(chave), `duplicado: ${chave}`).toBe(false);
      chaves.add(chave);
    }
  });

  it("curso gratuito tem preço descrito e carga horária positiva", () => {
    for (const c of CURSOS) {
      expect(c.preco.length, c.titulo).toBeGreaterThan(0);
      expect(c.cargaHoraria, c.titulo).toBeGreaterThan(0);
    }
  });

  it("toda habilidade tem ao menos um curso gratuito e um pago", () => {
    for (const h of HABILIDADES) {
      const doTema = CURSOS.filter((c) => c.habilidades.some(([s]) => s === h.slug));
      expect(doTema.some((c) => c.gratuito), `${h.slug} sem curso gratuito`).toBe(true);
      expect(doTema.some((c) => !c.gratuito), `${h.slug} sem curso pago`).toBe(true);
    }
  });

  // TypeScript: o material gratuito bom (documentação oficial) não emite certificado.
  const SEM_GRATUITO_COM_CERTIFICADO = new Set(["typescript"]);

  it("toda habilidade tem curso gratuito COM certificado", () => {
    for (const h of HABILIDADES.filter((x) => !SEM_GRATUITO_COM_CERTIFICADO.has(x.slug))) {
      const ok = CURSOS.some((c) => c.gratuito && c.certificado && c.habilidades.some(([s]) => s === h.slug));
      expect(ok, `${h.slug} sem gratuito com certificado`).toBe(true);
    }
  });
});

describe("vagas de exemplo", () => {
  it("só pedem habilidades que existem", () => {
    for (const v of VAGAS) for (const [slug] of v.requisitos) expect(slugs.has(slug), `${v.titulo}: ${slug}`).toBe(true);
  });
});
