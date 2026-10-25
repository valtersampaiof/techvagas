import { describe, expect, it } from "vitest";
import { formatarPublicacao, formatarReais, formatarSalario } from "@/lib/formatar";

describe("formatarReais", () => {
  it("usa ponto de milhar e sem centavos", () => {
    expect(formatarReais(1500)).toBe("R$ 1.500");
    expect(formatarReais(800)).toBe("R$ 800");
    expect(formatarReais(12345)).toBe("R$ 12.345");
  });
});

describe("formatarSalario", () => {
  it("faixa, valor único, 'a partir de' e sem valor", () => {
    expect(formatarSalario({ salarioMin: 1500, salarioMax: 1900 })).toBe("R$ 1.500 a R$ 1.900 por mês");
    expect(formatarSalario({ salarioMin: 1800, salarioMax: 1800 })).toBe("R$ 1.800 por mês");
    expect(formatarSalario({ salarioMin: 1000, salarioMax: null })).toBe("a partir de R$ 1.000 por mês");
    expect(formatarSalario({ salarioMin: null, salarioMax: null })).toBeNull();
  });
});

describe("formatarPublicacao", () => {
  const agora = new Date("2026-10-25T12:00:00Z");
  const h = (dias: number) => new Date(agora.getTime() - dias * 24 * 60 * 60 * 1000);

  it("hoje, ontem, dias e semanas", () => {
    expect(formatarPublicacao(h(0), agora)).toBe("hoje");
    expect(formatarPublicacao(new Date(agora.getTime() - 3 * 3600 * 1000), agora)).toBe("hoje");
    expect(formatarPublicacao(h(1), agora)).toBe("ontem");
    expect(formatarPublicacao(h(5), agora)).toBe("há 5 dias");
    expect(formatarPublicacao(h(13), agora)).toBe("há 13 dias");
    expect(formatarPublicacao(h(14), agora)).toBe("há 2 semanas");
    expect(formatarPublicacao(h(30), agora)).toBe("há 4 semanas");
  });
  it("muito antiga mostra a data; futura vira hoje; sem data é null", () => {
    expect(formatarPublicacao(h(200), agora)).toMatch(/^em \d{2}\/\d{2}\/\d{4}$/);
    expect(formatarPublicacao(new Date(agora.getTime() + 5 * 3600 * 1000), agora)).toBe("hoje");
    expect(formatarPublicacao(null, agora)).toBeNull();
  });
});
