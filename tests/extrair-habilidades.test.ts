import { describe, expect, it } from "vitest";
import { extrairHabilidades, normalizar } from "@/lib/extrair-habilidades";
import { HABILIDADES } from "@/lib/dados/habilidades";

describe("extrairHabilidades", () => {
  it("encontra habilidades pelo nome", () => {
    const r = extrairHabilidades("Conhecimentos: Python, SQL e Git", HABILIDADES);
    expect(r).toEqual(expect.arrayContaining(["python", "sql", "git"]));
  });

  it("entende sinônimos e ignora acentos e maiúsculas", () => {
    const r = extrairHabilidades("Experiência com PostgreSQL, GitHub e Segurança da Informação", HABILIDADES);
    expect(r).toEqual(expect.arrayContaining(["sql", "git", "seguranca"]));
  });

  it("não confunde Java com JavaScript", () => {
    const r = extrairHabilidades("Projetos em JavaScript e React", HABILIDADES);
    expect(r).toContain("javascript");
    expect(r).toContain("react");
    expect(r).not.toContain("java");
  });

  it("reconhece C# e .NET", () => {
    expect(extrairHabilidades("Desenvolvimento em C# com .NET", HABILIDADES)).toContain("csharp");
  });

  it("não cria falso positivo com siglas dentro de outras palavras", () => {
    const r = extrairHabilidades("Participei de projetos e eventos de tecnologia", HABILIDADES);
    expect(r).not.toContain("typescript");
    expect(r).not.toContain("javascript");
  });

  it("devolve lista vazia para texto sem habilidades", () => {
    expect(extrairHabilidades("Gosto de música e futebol", HABILIDADES)).toEqual([]);
    expect(extrairHabilidades("", HABILIDADES)).toEqual([]);
  });
});

describe("normalizar", () => {
  it("tira acentos e deixa em minúsculas", () => {
    expect(normalizar("Computação  Ágil")).toBe("computacao agil");
  });
});

describe("expressões que enganam", () => {
  it("'redes sociais' não é Redes de computadores", () => {
    expect(extrairHabilidades("Gestão de redes sociais e conteúdo", HABILIDADES)).not.toContain("redes");
  });
  it("mas 'redes' sozinha, de computadores, continua valendo", () => {
    expect(extrairHabilidades("Habilidades: redes, redes sociais", HABILIDADES)).toContain("redes");
  });
});
