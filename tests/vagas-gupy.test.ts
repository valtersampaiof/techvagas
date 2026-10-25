import { afterEach, describe, expect, it, vi } from "vitest";
import { buscarPaginas, converterGupy } from "@/lib/vagas/fontes/gupy";
import { normalizarVaga } from "@/lib/vagas/normalizar";
import { HABILIDADES } from "@/lib/dados/habilidades";

// Amostra no formato real devolvido por portal.gupy.io/api/job-search/jobs (campos conferidos em 23/10/2026).
const vaga = (extra: Record<string, unknown> = {}) => ({
  id: 12345,
  name: "Estágio de TI",
  description: "<p>Atuará com suporte de nível 1 e <strong>SQL</strong>.&nbsp;Diferenciais: Python.</p>",
  careerPageName: "Acme S.A.",
  type: "vacancy_type_internship",
  publishedDate: "2026-10-22T12:00:00.000Z",
  applicationDeadline: "2026-11-30T00:00:00.000Z",
  workplaceType: "hybrid",
  city: "Curitiba",
  state: "Paraná",
  jobUrl: "https://acme.gupy.io/job/abc123?jobBoardSource=gupy_portal",
  ...extra,
});

afterEach(() => vi.unstubAllGlobals());

describe("converterGupy: vagas de outros países", () => {
  const tipo = { type: "vacancy_type_effective" };
  it("descarta o que está em espanhol ou fica em cidade estrangeira, e mantém o resto", () => {
    const r = converterGupy({
      data: [
        vaga({ ...tipo, id: 1, name: "Desarrollador Back End Cloud", city: "", state: "", description: "<p>Buscamos un desarrollador con experiencia y conocimientos de AWS. Ofrecemos beneficios.</p>" }),
        vaga({ ...tipo, id: 2, name: "Chile - Hybrid Cloud Specialist", city: "Las Condes", state: "", description: "<p>Cloud engineer role working with AWS and Azure.</p>" }),
        vaga({ ...tipo, id: 3, name: "Engenheiro de Software", city: "Curitiba", state: "Paraná", description: "<p>Você vai atuar com Java. Nossa equipe é remota.</p>" }),
        vaga({ ...tipo, id: 4, name: "Desenvolvedor Python", city: "", state: "", description: "<p>Você atuará com Python em uma vaga 100% remota.</p>" }),
        vaga({ ...tipo, id: 5, name: "Cloud Engineer", city: "São Paulo", state: "", description: "<p>Work with AWS from our São Paulo office.</p>" }),
      ],
    });
    expect(r.map((v) => v.idExterno)).toEqual(["3", "4", "5"]);
  });
});

describe("converterGupy: tipo de contrato", () => {
  it("efetivo vira CLT, 'legal entity' vira PJ, e só os tipos de vaga de emprego entram", () => {
    const r = converterGupy({
      data: [
        vaga({ id: 1, type: "vacancy_type_effective" }),
        vaga({ id: 2, type: "vacancy_legal_entity" }),
        vaga({ id: 3, type: "vacancy_type_internship" }),
        vaga({ id: 4, type: "vacancy_type_trainee" }),
        vaga({ id: 5, type: "vacancy_type_temporary" }),
        vaga({ id: 6, type: "vacancy_type_talent_pool" }),
        vaga({ id: 7, type: "vacancy_type_apprentice" }),
        vaga({ id: 8, type: "vacancy_type_parter" }),
        vaga({ id: 9, type: undefined }),
      ],
    });
    expect(r.map((v) => [v.idExterno, v.contrato])).toEqual([["1", "clt"], ["2", "pj"], ["3", "estagio"], ["4", undefined], ["9", undefined]]);
  });

  it("a vaga efetiva de nível sênior chega ao site com nível, contrato e requisitos avançados", () => {
    const [v] = converterGupy({
      data: [vaga({ id: 10, name: "Engenheiro de Software Sênior", type: "vacancy_type_effective", description: "<p>Java e SQL. 6 anos de experiência.</p>" })],
    });
    const n = normalizarVaga(v, HABILIDADES)!;
    expect(n).toMatchObject({ tipo: "senior", contrato: "clt" });
    expect(n.requisitos.every((r) => r.nivelMinimo === "avancado")).toBe(true);
  });
});

describe("converterGupy", () => {
  it("converte os campos da vaga", () => {
    const [v] = converterGupy({ data: [vaga()], pagination: { total: 1 } });
    expect(v).toMatchObject({
      origem: "gupy",
      idExterno: "12345",
      titulo: "Estágio de TI",
      empresa: "Acme S.A.",
      cidade: "Curitiba, Paraná",
      modalidade: "hibrido",
      rotulos: ["Estágio"],
    });
    expect(v.descricao).toBe("Atuará com suporte de nível 1 e SQL. Diferenciais: Python.");
    expect(v.link).toContain("acme.gupy.io/job/abc123");
    expect(v.publicadaEm).toEqual(new Date("2026-10-22T12:00:00.000Z"));
  });

  it("mapeia modalidade e tipo trainee", () => {
    const r = converterGupy({
      data: [
        vaga({ id: 1, workplaceType: "remote", type: "vacancy_type_trainee" }),
        vaga({ id: 2, workplaceType: "on-site", type: "vacancy_type_effective" }),
        vaga({ id: 3, workplaceType: "outro" }),
      ],
    });
    expect(r.map((v) => v.modalidade)).toEqual(["remoto", "presencial", undefined]);
    expect(r.map((v) => v.rotulos)).toEqual([["Trainee"], [], ["Estágio"]]);
  });

  it("ignora banco de talentos, link inseguro e vaga sem id ou título", () => {
    const r = converterGupy({
      data: [
        vaga({ id: 1, type: "vacancy_type_talent_pool" }),
        vaga({ id: 2, jobUrl: "javascript:alert(1)" }),
        vaga({ id: undefined }),
        vaga({ id: 4, name: "  " }),
        vaga({ id: 5 }),
      ],
    });
    expect(r.map((v) => v.idExterno)).toEqual(["5"]);
  });

  describe("vagas que provavelmente não estão abertas", () => {
    const hoje = new Date("2026-10-23T12:00:00Z");
    const ids = (itens: Record<string, unknown>[]) => converterGupy({ data: itens }, hoje).map((v) => v.idExterno);

    it("ignora prazo de inscrição vencido", () => {
      expect(ids([vaga({ id: 1, applicationDeadline: "2026-10-01T00:00:00.000Z" }), vaga({ id: 2 })])).toEqual(["2"]);
    });

    it("ignora banco de talentos e cadastro reserva", () => {
      expect(
        ids([
          vaga({ id: 1, name: "Banco de Talentos - TI - Estágios e Efetivos" }),
          vaga({ id: 2, name: "[BANCO DE TALENTOS] Desenvolvedor(a) Júnior" }),
          vaga({ id: 3, name: "Cadastro de reserva - Estágio TI" }),
          vaga({ id: 4, name: "Estágio em TI" }),
        ]),
      ).toEqual(["4"]);
    });

    it("sem prazo, só vale se for recente (até 180 dias)", () => {
      expect(
        ids([
          vaga({ id: 1, applicationDeadline: undefined, publishedDate: "2026-09-01T00:00:00.000Z" }),
          vaga({ id: 2, applicationDeadline: undefined, publishedDate: "2024-02-01T00:00:00.000Z" }),
          vaga({ id: 3, applicationDeadline: null, publishedDate: "2023-06-14T00:00:00.000Z" }),
        ]),
      ).toEqual(["1"]);
    });

    it("com prazo futuro, vale mesmo se foi publicada há muito tempo", () => {
      expect(ids([vaga({ id: 1, publishedDate: "2025-01-01T00:00:00.000Z" })])).toEqual(["1"]);
    });
  });

  it("aguenta cidade vazia e resposta inesperada", () => {
    expect(converterGupy({ data: [vaga({ city: "", state: "" })] })[0].cidade).toBe("");
    expect(converterGupy(null)).toEqual([]);
    expect(converterGupy({ erro: "x" })).toEqual([]);
    expect(converterGupy({ data: "texto" })).toEqual([]);
  });

  it("uma vaga de estágio de TI vira vaga do site com requisitos lidos da descrição completa", () => {
    const [v] = converterGupy({ data: [vaga()] });
    const n = normalizarVaga(v, HABILIDADES)!;
    expect(n.tipo).toBe("estagio");
    expect(n.modalidade).toBe("hibrido");
    const por = Object.fromEntries(n.requisitos.map((r) => [r.slug, r.obrigatorio]));
    expect(por).toMatchObject({ suporte: true, sql: true, python: false });
  });
});

describe("buscarPaginas", () => {
  const urls: URL[] = [];
  function simular(itensPorPagina: number[]) {
    urls.length = 0;
    let chamada = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        urls.push(new URL(url));
        const n = itensPorPagina[chamada++] ?? 0;
        const data = Array.from({ length: n }, (_, i) => vaga({ id: chamada * 1000 + i }));
        return Response.json({ data, pagination: { total: 100 } });
      }),
    );
  }

  it("pede a segunda página só quando a primeira veio cheia, e para no máximo de páginas", async () => {
    simular([50, 50, 50]);
    const r = await buscarPaginas({ termo: "ti", tipo: "vacancy_type_internship" });
    expect(urls.map((u) => u.searchParams.get("offset"))).toEqual(["0", "50"]);
    expect(r).toHaveLength(100);
  }, 20_000);

  it("não pede mais páginas quando acabaram os resultados", async () => {
    simular([12]);
    const r = await buscarPaginas({ termo: "ti" });
    expect(urls).toHaveLength(1);
    expect(r).toHaveLength(12);
  });

  it("envia termo, tipo e ordenação por data", async () => {
    simular([0]);
    await buscarPaginas({ termo: "segurança da informação", tipo: "vacancy_type_trainee" });
    const p = urls[0].searchParams;
    expect(urls[0].host).toBe("portal.gupy.io");
    expect(p.get("jobName")).toBe("segurança da informação");
    expect(p.get("type")).toBe("vacancy_type_trainee");
    expect(p.get("sortBy")).toBe("publishedDate");
    expect(p.get("sortOrder")).toBe("desc");
    expect(p.get("limit")).toBe("50");
  });

  it("sem tipo, não manda o filtro", async () => {
    simular([0]);
    await buscarPaginas({ termo: "desenvolvedor júnior" });
    expect(urls[0].searchParams.has("type")).toBe(false);
  });
});
