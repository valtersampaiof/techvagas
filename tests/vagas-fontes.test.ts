import { describe, expect, it } from "vitest";
import { converterAdzuna } from "@/lib/vagas/fontes/adzuna";
import { converterIssues, interpretarTitulo } from "@/lib/vagas/fontes/github";
import { converterJooble } from "@/lib/vagas/fontes/jooble";
import { converterRemotive } from "@/lib/vagas/fontes/remotive";

// Amostras no formato descrito na documentação de cada API. Testam a CONVERSÃO,
// não a conexão com a internet.

describe("converterAdzuna", () => {
  it("converte resultados e descarta os sem link seguro", () => {
    const r = converterAdzuna({
      results: [
        {
          id: 123,
          title: "Estágio em <strong>TI</strong>",
          description: "Python &amp; SQL…",
          redirect_url: "https://www.adzuna.com.br/land/ad/123",
          created: "2026-10-20T10:00:00Z",
          company: { display_name: "Acme" },
          location: { display_name: "Recife, Pernambuco" },
        },
        { id: 124, title: "Vaga ruim", redirect_url: "javascript:alert(1)" },
        { title: "Sem id", redirect_url: "https://x.com" },
      ],
    });
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({
      origem: "adzuna",
      idExterno: "123",
      titulo: "Estágio em TI",
      empresa: "Acme",
      cidade: "Recife, Pernambuco",
      descricao: "Python & SQL…",
    });
    expect(r[0].publicadaEm).toEqual(new Date("2026-10-20T10:00:00Z"));
  });

  it("não quebra com resposta inesperada", () => {
    expect(converterAdzuna(null)).toEqual([]);
    expect(converterAdzuna({ erro: "x" })).toEqual([]);
    expect(converterAdzuna({ results: "texto" })).toEqual([]);
  });
});

describe("converterJooble", () => {
  it("converte e usa o link como identificador quando não há id", () => {
    const r = converterJooble({
      totalCount: 1,
      jobs: [{ title: "Desenvolvedor Júnior", location: "Curitiba", snippet: "Java", link: "https://jooble.org/desc/1", company: "Beta" }],
    });
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ origem: "jooble", idExterno: "https://jooble.org/desc/1", empresa: "Beta", cidade: "Curitiba" });
  });

  it("não quebra com resposta inesperada", () => {
    expect(converterJooble(undefined)).toEqual([]);
    expect(converterJooble({})).toEqual([]);
  });
});

describe("converterRemotive", () => {
  it("só mantém vagas abertas a quem mora no Brasil", () => {
    const base = { url: "https://remotive.com/remote-jobs/1", company_name: "Gama", description: "<p>React</p>" };
    const r = converterRemotive({
      jobs: [
        { ...base, id: 1, title: "Junior Dev", candidate_required_location: "Worldwide" },
        { ...base, id: 2, title: "Junior Dev", candidate_required_location: "USA Only" },
        { ...base, id: 3, title: "Junior Dev", candidate_required_location: "Brazil" },
        { ...base, id: 4, title: "Junior Dev", candidate_required_location: "LATAM" },
      ],
    });
    expect(r.map((v) => v.idExterno)).toEqual(["1", "3", "4"]);
    expect(r[0]).toMatchObject({ origem: "remotive", modalidade: "remoto", descricao: "React" });
  });
});

describe("GitHub: issues de comunidades", () => {
  it("interpreta [Cidade] Cargo @ Empresa", () => {
    expect(interpretarTitulo("[São Paulo] Desenvolvedor Júnior @ Acme")).toEqual({
      cidade: "São Paulo",
      titulo: "Desenvolvedor Júnior",
      empresa: "Acme",
    });
    expect(interpretarTitulo("Dev Backend Júnior")).toEqual({ cidade: "", titulo: "Dev Backend Júnior", empresa: "" });
  });

  it("converte issues, ignora pull requests e lê as etiquetas", () => {
    const r = converterIssues(
      [
        {
          number: 7,
          title: "[Remoto] Dev Frontend @ Acme",
          html_url: "https://github.com/frontendbr/vagas/issues/7",
          body: "## Requisitos\n- **React**\n- JavaScript",
          created_at: "2026-10-01T00:00:00Z",
          labels: [{ name: "Júnior" }, { name: "Remoto" }],
        },
        { number: 8, title: "PR", html_url: "https://github.com/frontendbr/vagas/pull/8", pull_request: {} },
      ],
      "frontendbr/vagas",
    );
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({
      origem: "github",
      idExterno: "frontendbr/vagas#7",
      empresa: "Acme",
      cidade: "Remoto",
      rotulos: ["Júnior", "Remoto"],
    });
    expect(r[0].descricao).toContain("React");
  });

  it("não quebra se o repositório devolver erro em vez de lista", () => {
    expect(converterIssues({ message: "Not Found" }, "x/y")).toEqual([]);
  });
});
