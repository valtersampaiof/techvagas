import { describe, expect, it } from "vitest";
import { COR_DA_ETAPA, ETAPAS, ROTULO_ETAPA, contarPorEtapa, ehEtapa } from "@/lib/candidaturas";

describe("candidaturas", () => {
  it("toda etapa tem nome e cor", () => {
    for (const e of ETAPAS) {
      expect(ROTULO_ETAPA[e].length, e).toBeGreaterThan(0);
      expect(COR_DA_ETAPA[e].length, e).toBeGreaterThan(0);
    }
    expect(ETAPAS[0]).toBe("salva");
  });

  it("só aceita etapas conhecidas", () => {
    expect(ehEtapa("entrevista")).toBe(true);
    expect(ehEtapa("")).toBe(false);
    expect(ehEtapa("qualquer")).toBe(false);
    expect(ehEtapa(undefined)).toBe(false);
  });

  it("conta por etapa, mostrando também as vazias e ignorando etapas desconhecidas", () => {
    const c = contarPorEtapa([{ etapa: "salva" }, { etapa: "salva" }, { etapa: "entrevista" }, { etapa: "velha" }]);
    expect(c.salva).toBe(2);
    expect(c.entrevista).toBe(1);
    expect(c.proposta).toBe(0);
    expect(Object.keys(c)).toEqual([...ETAPAS]);
  });
});
