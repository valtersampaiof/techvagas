import { describe, expect, it } from "vitest";
import { escritoEmEspanhol } from "@/lib/vagas/idioma";

describe("escritoEmEspanhol", () => {
  it("reconhece anúncios em espanhol", () => {
    expect(escritoEmEspanhol("Desarrollador Back End Cloud")).toBe(true);
    expect(escritoEmEspanhol("Buscamos un analista con experiencia y conocimientos en SQL. Ofrecemos beneficios.")).toBe(true);
    expect(escritoEmEspanhol("Trabajo remoto, con un equipo de ingeniería. Más de 3 años de experiencia.")).toBe(true);
  });

  it("deixa passar português e inglês, inclusive anúncios curtos", () => {
    expect(escritoEmEspanhol("Você vai atuar com desenvolvimento de software e terá benefícios.")).toBe(false);
    expect(escritoEmEspanhol("Desenvolvedor Python | Vaga 100% remota")).toBe(false);
    expect(escritoEmEspanhol("Senior software engineer working on cloud infrastructure with AWS")).toBe(false);
    expect(escritoEmEspanhol("")).toBe(false);
  });

  it("texto em português que cita 'desarrollo' ou 'experiencia' em meio a várias frases em português continua português", () => {
    expect(escritoEmEspanhol("Você tem experiência com testes? Nossa equipe está crescendo, são várias atividades e benefícios. Mande sua experiencia.")).toBe(false);
  });
});
