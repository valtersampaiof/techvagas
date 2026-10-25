import { describe, expect, it } from "vitest";
import { ajustarRegime, contratosDoFiltro, NIVEIS_DO_REGIME } from "@/lib/tipos-de-vaga";

describe("regime de contratação vem antes do nível", () => {
  it("estágio é um regime e não tem nível", () => {
    expect(NIVEIS_DO_REGIME.estagio).toEqual([]);
    expect(contratosDoFiltro("estagio")).toEqual(["estagio"]);
    expect(ajustarRegime("estagio", "senior")).toEqual({ contrato: "estagio", tipo: "" });
  });

  it("CLT vai de trainee a liderança; PJ não tem trainee", () => {
    expect(NIVEIS_DO_REGIME.clt).toContain("trainee");
    expect(NIVEIS_DO_REGIME.pj).not.toContain("trainee");
    expect(NIVEIS_DO_REGIME.pj).toEqual(["junior", "pleno", "senior", "lideranca", "indefinido"]);
    expect(ajustarRegime("pj", "trainee")).toEqual({ contrato: "pj", tipo: "" });
    expect(ajustarRegime("clt", "trainee")).toEqual({ contrato: "clt", tipo: "trainee" });
    expect(ajustarRegime("pj", "pleno")).toEqual({ contrato: "pj", tipo: "pleno" });
  });

  it("o nível antigo 'estagio' (links e alertas antigos) vira o regime estágio", () => {
    expect(ajustarRegime("", "estagio")).toEqual({ contrato: "estagio", tipo: "" });
  });

  it("sem regime vale qualquer nível, e valores desconhecidos são ignorados", () => {
    expect(ajustarRegime("", "senior")).toEqual({ contrato: "", tipo: "senior" });
    expect(ajustarRegime("xyz", "abc")).toEqual({ contrato: "", tipo: "" });
  });
});
