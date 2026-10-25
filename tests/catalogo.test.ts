import { describe, expect, it } from "vitest";
import { CURSOS } from "@/lib/dados/cursos";
import { CURSOS_GESTAO } from "@/lib/dados/cursos-gestao";
import { CURSOS_PLENO_SENIOR, ETIQUETAS_EXTRAS } from "@/lib/dados/cursos-pleno-senior";
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
  it("tem pelo menos 400 cursos", () => {
    expect(CURSOS.length).toBeGreaterThanOrEqual(400);
  });

  it("cada etiqueta extra aponta para um curso que existe (se um curso for renomeado, o teste avisa)", () => {
    const chaves = new Set(CURSOS.map((c) => `${c.instituicao}|${c.titulo}`));
    for (const chave of Object.keys(ETIQUETAS_EXTRAS)) expect(chaves.has(chave), `curso não encontrado: ${chave}`).toBe(true);
  });

  it("as etiquetas extras entram no curso, e as principais ficam em primeiro", () => {
    const cka = CURSOS.find((c) => c.titulo === "Certified Kubernetes Administrator (CKA)")!;
    expect(cka.habilidades[0]).toEqual(["kubernetes", "avancado"]);
    expect(cka.habilidades.length).toBeGreaterThan(1);
    const ms900 = CURSOS.find((c) => c.titulo === "Fundamentos do Microsoft 365 (MS-900)")!;
    expect(ms900.habilidades.at(-1)).toEqual(["windows", "iniciante"]);
    // quem já tinha a habilidade não ganha duplicata
    for (const c of CURSOS) expect(new Set(c.habilidades.map(([s]) => s)).size, c.titulo).toBe(c.habilidades.length);
  });

  it("os arquivos novos só têm cursos novos (nenhum repete título de outro arquivo)", () => {
    const novos = [...CURSOS_PLENO_SENIOR, ...CURSOS_GESTAO];
    const todos = new Map<string, number>();
    for (const c of CURSOS) todos.set(`${c.instituicao}|${c.titulo}`, (todos.get(`${c.instituicao}|${c.titulo}`) ?? 0) + 1);
    for (const c of novos) expect(todos.get(`${c.instituicao}|${c.titulo}`), c.titulo).toBe(1);
  });

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

  // O melhor material gratuito destas habilidades é a documentação oficial (ou emite só emblema digital), sem certificado.
  const SEM_GRATUITO_COM_CERTIFICADO = new Set(["typescript", "ruby", "angular", "vue", "erp"]);

  it("toda habilidade tem curso gratuito COM certificado", () => {
    for (const h of HABILIDADES.filter((x) => !SEM_GRATUITO_COM_CERTIFICADO.has(x.slug))) {
      const ok = CURSOS.some((c) => c.gratuito && c.certificado && c.habilidades.some(([s]) => s === h.slug));
      expect(ok, `${h.slug} sem gratuito com certificado`).toBe(true);
    }
  });
});

describe("cobertura por nível (o que alimenta o mini quadro de cursos nas vagas)", () => {
  const ordem = { iniciante: 1, intermediario: 2, avancado: 3 } as const;
  const alcance = (c: (typeof CURSOS)[number], slug: string) =>
    Math.max(0, ...c.habilidades.filter(([s]) => s === slug).map(([, n]) => ordem[n]));

  it("toda habilidade tem pelo menos 3 cursos gratuitos", () => {
    for (const h of HABILIDADES) {
      const n = CURSOS.filter((c) => c.gratuito && alcance(c, h.slug) > 0).length;
      expect(n, `${h.slug}: só ${n} gratuitos`).toBeGreaterThanOrEqual(3);
    }
  });

  it("toda habilidade tem pelo menos 2 cursos gratuitos que chegam ao intermediário", () => {
    for (const h of HABILIDADES) {
      const n = CURSOS.filter((c) => c.gratuito && alcance(c, h.slug) >= 2).length;
      expect(n, `${h.slug}: só ${n} gratuitos até o intermediário`).toBeGreaterThanOrEqual(2);
    }
  });

  it("toda habilidade tem pelo menos 1 curso que chega ao avançado", () => {
    for (const h of HABILIDADES) {
      const n = CURSOS.filter((c) => alcance(c, h.slug) >= 3).length;
      expect(n, `${h.slug}: nenhum curso avançado`).toBeGreaterThanOrEqual(1);
    }
  });

  it("toda habilidade tem pelo menos 1 curso pago que chega ao intermediário", () => {
    for (const h of HABILIDADES) {
      const n = CURSOS.filter((c) => !c.gratuito && alcance(c, h.slug) >= 2).length;
      expect(n, `${h.slug}: nenhum pago até o intermediário`).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("vagas de exemplo", () => {
  it("só pedem habilidades que existem", () => {
    for (const v of VAGAS) for (const [slug] of v.requisitos) expect(slugs.has(slug), `${v.titulo}: ${slug}`).toBe(true);
  });
});
