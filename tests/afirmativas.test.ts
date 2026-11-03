import { describe, expect, it } from "vitest";
import { detectarAfirmativas } from "@/lib/vagas/afirmativas";

describe("detectarAfirmativas", () => {
  it("lê o grupo no título", () => {
    expect(detectarAfirmativas("Analista de Sistemas Pleno | Vaga afirmativa para PcD´s", "")).toBe(",pcd,");
    expect(detectarAfirmativas("Engenheiro(a) de Dados - Vaga Exclusiva PcD", "")).toBe(",pcd,");
    expect(detectarAfirmativas("Operador de Data Center (Exclusivo para PCD) N1", "")).toBe(",pcd,");
    expect(detectarAfirmativas("Desenvolvedora Junior - Back End C# (Vaga Afirmativa para Mulheres)", "")).toBe(",mulheres,");
    expect(detectarAfirmativas("Engenheira de Software Sênior (Afirmativa para Mulheres)", "")).toBe(",mulheres,");
    expect(detectarAfirmativas("Desenvolvedora Backend (Exclusiva para Mulheres)", "")).toBe(",mulheres,");
    expect(detectarAfirmativas("Vaga afirmativa para pessoas pretas e pardas, LGBTQIA+ e PCD", "")).toBe(",pcd,negros,lgbt,");
  });

  it("lê a marca no começo do anúncio, quando ela fala DA VAGA", () => {
    expect(detectarAfirmativas("Analista de Suporte", "Esta é uma vaga afirmativa para pessoas negras. Responsabilidades...")).toBe(",negros,");
    expect(detectarAfirmativas("Dev", "Esta vaga também é destinada a pessoas com deficiência (PCD). Valorizamos a diversidade.")).toBe(",pcd,");
  });

  it("vaga que se diz afirmativa sem dizer para quem vira 'outra'", () => {
    expect(detectarAfirmativas("Pessoa Desenvolvedora (Vaga Afirmativa para Talentos Diversos)", "")).toBe(",outra,");
  });

  it("declarações gerais e benefícios não tornam a vaga afirmativa", () => {
    expect(detectarAfirmativas("Analista de Dados", "Todas as nossas oportunidades são abertas a pessoas com deficiência (PCD) e reabilitadas do INSS.")).toBe("");
    expect(detectarAfirmativas("Dev", "Todas as nossas vagas estão abertas para pessoas com deficiência. Responsabilidades...")).toBe("");
    expect(detectarAfirmativas("Dev", "Além das vagas afirmativas, todas as vagas da Stone também são destinadas a pessoas com deficiência.")).toBe("");
    expect(detectarAfirmativas("Administrador de Redes", "Infraestrutura de lazer: sala de jogos, espaço exclusivo para mulheres, quiosques.")).toBe("");
    expect(detectarAfirmativas("Desenvolvedor Java", "Buscamos pessoas para atuar com Java e Spring.")).toBe("");
  });

  it("só olha o começo do anúncio (mais adiante, é declaração de diversidade)", () => {
    const longo = "x ".repeat(600) + "vaga afirmativa para mulheres";
    expect(detectarAfirmativas("Dev", longo)).toBe("");
  });
});
