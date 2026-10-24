import { describe, expect, it } from "vitest";
import { ehDaRegiao, interpretarLocal, nomeDoEstado } from "@/lib/localizacao";

describe("interpretarLocal (formatos reais da Gupy e da Adzuna)", () => {
  it.each([
    ["Curitiba, Paraná", "Curitiba", "PR"],
    ["São Paulo, Estado de São Paulo", "São Paulo", "SP"],
    ["Rio de Janeiro, Estado do Rio de Janeiro", "Rio de Janeiro", "RJ"],
    ["São José dos Campos, Estado de São Paulo", "São José dos Campos", "SP"],
    ["Brasilia, Distrito Federal", "Brasília", "DF"],
    ["Porto Alegre, Rio Grande do Sul", "Porto Alegre", "RS"],
    ["Belo Horizonte, MG", "Belo Horizonte", "MG"],
    ["Recife/PE", "Recife", "PE"],
    ["Campina Grande - PB", "Campina Grande", "PB"],
    ["Campo Grande, Mato Grosso do Sul, Brasil", "Campo Grande", "MS"],
  ])("%s → %s (%s)", (texto, cidade, uf) => {
    expect(interpretarLocal(texto)).toMatchObject({ cidade, uf });
  });

  it("bairro + capital, sem estado, fica com a capital", () => {
    expect(interpretarLocal("Renascença, Belo Horizonte")).toEqual({ cidade: "Belo Horizonte", uf: "MG", chave: "belo horizonte" });
    expect(interpretarLocal("Macaxeira, Recife")).toMatchObject({ cidade: "Recife", uf: "PE" });
  });

  it("bairro + cidade + estado fica com a cidade", () => {
    expect(interpretarLocal("Renascença, Belo Horizonte, Minas Gerais")).toMatchObject({ cidade: "Belo Horizonte", uf: "MG" });
  });

  it("gera a chave sem acento e em minúsculas", () => {
    expect(interpretarLocal("São Luís, Maranhão").chave).toBe("sao luis");
    expect(interpretarLocal("Brasilia, Distrito Federal").chave).toBe("brasilia");
  });

  it("só o nome do estado dá estado, sem cidade", () => {
    expect(interpretarLocal("Paraná")).toEqual({ cidade: "", uf: "PR", chave: "" });
    expect(interpretarLocal("Estado de São Paulo")).toEqual({ cidade: "", uf: "SP", chave: "" });
  });

  it("'Brasil', vaga remota, 'Zona Norte' e vazio não dizem onde é", () => {
    const vazio = { cidade: "", uf: "", chave: "" };
    for (const t of ["Brasil", "Brazil", "", "   ", "Remoto (Worldwide)", "remoto", "Jardim Peri, Zona Norte", "Vila Pirajussara, Zona Sul"]) {
      expect(interpretarLocal(t), JSON.stringify(t)).toEqual(vazio);
    }
  });

  it("sigla só vale em maiúsculas (evita 'Pe', 'se' virarem estado)", () => {
    expect(interpretarLocal("Fazenda, se").uf).toBe("");
    expect(interpretarLocal("Fazenda, SE").uf).toBe("SE");
  });

  it("cidade desconhecida sem estado é mantida", () => {
    expect(interpretarLocal("Araranguá")).toMatchObject({ cidade: "Araranguá", uf: "" });
  });

  it("nomeDoEstado traduz a sigla", () => {
    expect(nomeDoEstado("PA")).toBe("Pará");
    expect(nomeDoEstado("XX")).toBe("XX");
  });
});

describe("ehDaRegiao", () => {
  const recife = { uf: "PE", cidadeNome: "Recife" };
  const remota = { uf: "", cidadeNome: "" };

  it("sem estado nem cidade, toda vaga serve", () => {
    expect(ehDaRegiao(recife)).toBe(true);
    expect(ehDaRegiao(remota)).toBe(true);
  });
  it("estado", () => {
    expect(ehDaRegiao(recife, "PE")).toBe(true);
    expect(ehDaRegiao(recife, "SP")).toBe(false);
    expect(ehDaRegiao(remota, "PE")).toBe(false);
  });
  it("cidade, sem acento e sem diferenciar maiúsculas, com parte do nome", () => {
    expect(ehDaRegiao({ uf: "SP", cidadeNome: "São Paulo" }, undefined, "sao paulo")).toBe(true);
    expect(ehDaRegiao({ uf: "SP", cidadeNome: "São Paulo" }, undefined, "SÃO")).toBe(true);
    expect(ehDaRegiao(recife, undefined, "olinda")).toBe(false);
    expect(ehDaRegiao(remota, undefined, "recife")).toBe(false);
  });
  it("estado e cidade juntos", () => {
    expect(ehDaRegiao(recife, "PE", "recife")).toBe(true);
    expect(ehDaRegiao(recife, "SP", "recife")).toBe(false);
  });
});
