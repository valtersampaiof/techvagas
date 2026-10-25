import { describe, expect, it } from "vitest";
import { extrairSalarioDoTexto, lerCampoDeSalario, numeroBrasileiro, salarioDeCamposDaFonte } from "@/lib/salario";

describe("numeroBrasileiro", () => {
  it.each([
    ["1.800,00", 1800], ["1800", 1800], ["1.800", 1800], ["800,50", 800.5], ["1.462,13", 1462.13], ["3,4", 3.4], ["1060,00", 1060],
  ])("%s → %s", (texto, esperado) => expect(numeroBrasileiro(texto)).toBe(esperado));
  it("o que não é número vira null", () => {
    for (const t of ["", "abc", "1.5", "1,234,5"]) expect(numeroBrasileiro(t), t).toBeNull();
  });
});

// Os trechos abaixo foram copiados de anúncios reais da Gupy (outubro/2026).
describe("extrairSalarioDoTexto (anúncios reais)", () => {
  const faixa = (min: number, max: number | null) => ({ min, max, origem: "texto" });

  it("bolsa por semestre vira um intervalo", () => {
    expect(
      extrairSalarioDoTexto("Bolsa auxílio (conforme semestre):3º e 4º semestre: R$ 1.600,00/mês5º e 6º semestre: R$ 1.800,00/mês7º semestre: R$ 2.000,00/mêsInformações adicionaisBenefícios:🍽️ Vale refeição: R$ 660,00"),
    ).toEqual(faixa(1600, 2000));
  });

  it("valor único depois de 'Bolsa Auxílio:'", () => {
    expect(extrairSalarioDoTexto("Informações de contratação:Bolsa Auxílio: R$ 1.000,00.Carga Horária: 4 horas diárias")).toEqual(faixa(1000, 1000));
    expect(extrairSalarioDoTexto("Bolsa auxílio: R$ 1.462,13Para equilibrar trabalho e vida")).toEqual(faixa(1462.13, 1462.13));
  });

  it("'Bolsa Auxílio e Benefícios:' (título) e depois a linha com o valor", () => {
    expect(extrairSalarioDoTexto("Bolsa Auxílio e Benefícios:Bolsa Auxílio - R$ 2.000,00;Vale Refeição;Vale Transporte;")).toEqual(faixa(2000, 2000));
  });

  it("um valor por ano de estágio", () => {
    expect(extrairSalarioDoTexto("Bolsa auxílio: R$ 1.500,00 no primeiro ano.R$ 1.900,00 no segundo ano.Vale-transporte")).toEqual(faixa(1500, 1900));
  });

  it("'de R$' colado, sem espaço", () => {
    expect(extrairSalarioDoTexto("Informações adicionaisBolsa auxílio de R$1.600,00.Dia livre de aniversário")).toEqual(faixa(1600, 1600));
    expect(extrairSalarioDoTexto("💲Bolsa de R$1.190,00;🚋 Vale Transporte")).toEqual(faixa(1190, 1190));
  });

  it("palavra colada no texto anterior ('adicionaisBolsa') vale; no meio de outra palavra, não", () => {
    expect(extrairSalarioDoTexto("Informações adicionaisBolsa auxílio: R$ 1.500,00 no primeiro ano")).toEqual(faixa(1500, 1500));
    expect(extrairSalarioDoTexto("Procure a mochilabolsa de R$ 1.500,00 na loja")).toBeNull();
  });

  it("salário, e o vale-refeição depois não entra", () => {
    expect(extrairSalarioDoTexto("Benefícios:Salário: R$1.800,00Kit Natal;Vale transporte;Refeitório")).toEqual(faixa(1800, 1800));
    expect(extrairSalarioDoTexto("Salários e benefíciosSalário: R$ 3.781,75Vale alimentação (R$ 1.000,00)Plano de saúde")).toEqual(faixa(3781.75, 3781.75));
  });

  it("'a partir de' deixa o máximo em aberto", () => {
    expect(extrairSalarioDoTexto("Salário: a partir de R$ 1.000,00  Sobre a empresa")).toEqual(faixa(1000, null));
    expect(extrairSalarioDoTexto("Salário: a partir de R$ 2.617,00  Sobre a vaga")).toEqual(faixa(2617, null));
  });

  it("variações de bolsa por carga horária viram intervalo", () => {
    expect(extrairSalarioDoTexto("Bolsa no valor de R$ 800,00 (20h) ou R$ 1200,00 (30h);Possibilidade de crescimento")).toEqual(faixa(800, 1200));
  });

  it("bolsa seguida de vale-alimentação: fica só a bolsa", () => {
    expect(extrairSalarioDoTexto("Bolsa-auxílio: R$ 1.200,00Vale-alimentação: R$ 200,00Vale-transporte")).toEqual(faixa(1200, 1200));
  });

  it("valor antes da palavra", () => {
    expect(extrairSalarioDoTexto("Você recebe R$ 1.500,00 de bolsa e mais benefícios")).toEqual(faixa(1500, 1500));
  });

  it("NÃO confunde benefícios com salário", () => {
    for (const t of [
      "Benefícios:🍽️ Vale refeição ou alimentação: R$ 660,00🚌 Vale transporte",
      "Vale-Refeição/Alimentação (R$ 617,40 - Alelo)Vale-Transporte",
      "Vale alimentação e refeição R$ 368,19  Plano de saúde Unimed",
      "Ajuda de custo: R$ 1.000 para alimentação e transporte",
      "Vale Refeição: R$30,00 por dia útil;Seguro de Vida Unimed",
      "Seguro de vida - (R$ 50.000,00 a apólice)",
      "Cartão de Benefícios Swile - R$1060,00 mensais para usar com alimentação",
      "mais de R$ 3,4 trilhões transacionados ao ano",
      "Benefício Alimentação: R$ 48,00 por dia, com desconto de apenas R$ 1,00 por mês",
    ]) {
      expect(extrairSalarioDoTexto(t), t).toBeNull();
    }
  });

  it("valor por hora ou fora da faixa plausível é ignorado", () => {
    expect(extrairSalarioDoTexto("Salário: R$ 25,00 por hora")).toBeNull();
    expect(extrairSalarioDoTexto("Bolsa: R$ 25/hora")).toBeNull();
    expect(extrairSalarioDoTexto("Salário: R$ 120.000,00")).toBeNull();
    expect(extrairSalarioDoTexto("Bolsa: R$ 50,00")).toBeNull();
  });

  it("valor anual vira mensal", () => {
    expect(extrairSalarioDoTexto("Remuneração: R$ 36.000,00 por ano")).toEqual(faixa(3000, 3000));
  });

  it("texto sem valor ou vazio", () => {
    expect(extrairSalarioDoTexto("Bolsa auxílio a combinar")).toBeNull();
    expect(extrairSalarioDoTexto("")).toBeNull();
    expect(extrairSalarioDoTexto("Estamos contratando!")).toBeNull();
  });
});

describe("lerCampoDeSalario (campo só com o valor, ex.: Jooble)", () => {
  it("faixa mensal", () => {
    expect(lerCampoDeSalario("R$ 2.000 - R$ 3.000 por mês")).toEqual({ min: 2000, max: 3000, origem: "fonte" });
  });
  it("valor único", () => {
    expect(lerCampoDeSalario("R$ 1.800")).toEqual({ min: 1800, max: 1800, origem: "fonte" });
  });
  it("por hora e vazio são ignorados; por ano é dividido por 12", () => {
    expect(lerCampoDeSalario("R$ 20 por hora")).toBeNull();
    expect(lerCampoDeSalario("")).toBeNull();
    expect(lerCampoDeSalario(null)).toBeNull();
    expect(lerCampoDeSalario("R$ 48.000 por ano")).toEqual({ min: 4000, max: 4000, origem: "fonte" });
  });
});

describe("salarioDeCamposDaFonte (Adzuna: valores anuais)", () => {
  it("divide o valor anual por 12 (casos reais)", () => {
    expect(salarioDeCamposDaFonte(18000, 18000, "ano")).toEqual({ min: 1500, max: 1500, origem: "fonte" });
    expect(salarioDeCamposDaFonte(37200, 49200, "ano")).toEqual({ min: 3100, max: 4100, origem: "fonte" });
    expect(salarioDeCamposDaFonte(13740, 13752, "ano")).toEqual({ min: 1145, max: 1146, origem: "fonte" });
  });
  it("descarta valores implausíveis (o '168' do Sr. Full Stack) e falta de dados", () => {
    expect(salarioDeCamposDaFonte(168, 168, "ano")).toBeNull();
    expect(salarioDeCamposDaFonte(null, null, "ano")).toBeNull();
    expect(salarioDeCamposDaFonte(0, 0, "ano")).toBeNull();
    expect(salarioDeCamposDaFonte(undefined, 24000, "ano")).toEqual({ min: 2000, max: 2000, origem: "fonte" });
  });
  it("aceita valor já mensal", () => {
    expect(salarioDeCamposDaFonte(2500, 3000, "mes")).toEqual({ min: 2500, max: 3000, origem: "fonte" });
  });
});
