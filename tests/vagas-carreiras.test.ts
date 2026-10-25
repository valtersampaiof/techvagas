import { afterEach, describe, expect, it, vi } from "vitest";
import { HABILIDADES } from "@/lib/dados/habilidades";
import {
  converterAshby,
  converterGreenhouse,
  converterLever,
  ehDeTecnologia,
  ehNoBrasil,
  fonteDaEmpresa,
  type Empresa,
} from "@/lib/vagas/fontes/carreiras";
import { normalizarVaga } from "@/lib/vagas/normalizar";
import { rotuloDaOrigem } from "@/lib/rotulos";

// Amostras no formato descrito na documentação de cada API (Greenhouse Job Board API, Lever Postings API e
// Ashby Job Postings API). Testam a CONVERSÃO e as regras de filtro, não a conexão com a internet.

const stone: Empresa = { plataforma: "greenhouse", id: "stone", nome: "Stone" };
const ciandt: Empresa = { plataforma: "lever", id: "ciandt", nome: "CI&T", soTecnologia: true };
const nubank: Empresa = { plataforma: "ashby", id: "nubank", nome: "Nubank" };

describe("ehNoBrasil", () => {
  it("aceita o que cita o Brasil ou um lugar brasileiro", () => {
    expect(ehNoBrasil("São Paulo, SP")).toBe(true);
    expect(ehNoBrasil("Híbrido, São Paulo")).toBe(true);
    expect(ehNoBrasil("São Paulo, Brazil")).toBe(true);
    expect(ehNoBrasil("Poços de Caldas/MG | Pocos De Caldas, Minas Gerais, Brasil")).toBe(true);
    expect(ehNoBrasil("Brasil; São Paulo, São Paulo, Brazil")).toBe(true);
  });

  it("aceita quando só diz a modalidade, porque as empresas da lista são brasileiras", () => {
    for (const local of ["Remoto", "Remote", "Híbrido", "Remoto - Híbrido", "", "LATAM"]) expect(ehNoBrasil(local), local).toBe(true);
  });

  it("recusa qualquer outro lugar", () => {
    for (const local of ["Mexico City, Mexico City, Mexico", "Buenos Aires, Argentina", "Palo Alto", "Remote - US", "Bogotá, Colombia"]) {
      expect(ehNoBrasil(local), local).toBe(false);
    }
  });
});

describe("ehDeTecnologia", () => {
  it("passa cargo de TI, setor de tecnologia ou empresa só de tecnologia; barra o resto", () => {
    expect(ehDeTecnologia({ titulo: "Engenheiro de Software Júnior" }, stone)).toBe(true);
    expect(ehDeTecnologia({ titulo: "Analista Júnior", setor: "Engenharia & Tecnologia" }, stone)).toBe(true);
    expect(ehDeTecnologia({ titulo: "Analista Júnior", setor: "TECHNOLOGY BRAZIL - 8453" }, stone)).toBe(true);
    expect(ehDeTecnologia({ titulo: "Analista de Operações Júnior", setor: "OPERAÇÕES" }, stone)).toBe(false);
    expect(ehDeTecnologia({ titulo: "Diretor(a) de Arte Júnior", setor: "MARKETING" }, stone)).toBe(false);
    expect(ehDeTecnologia({ titulo: "Estágio", setor: "Prod_Aura" }, ciandt)).toBe(true);
  });
});

describe("converterGreenhouse", () => {
  const json = {
    jobs: [
      {
        id: 8040000003,
        title: " SOFTWARE ENGINEER .NET II (Junior) ",
        absolute_url: "https://job-boards.greenhouse.io/stone/jobs/8040000003",
        first_published: "2026-10-22T09:30:06-04:00",
        updated_at: "2026-10-23T09:30:06-04:00",
        location: { name: "Remoto" },
        departments: [{ name: "Engenharia & Tecnologia" }],
        // O conteúdo vem com as etiquetas "escapadas", como a API entrega de verdade.
        content: "&lt;h2&gt;Requisitos&lt;/h2&gt;&lt;ul&gt;&lt;li&gt;C# e SQL&lt;/li&gt;&lt;li&gt;Git&lt;/li&gt;&lt;/ul&gt;",
      },
      { id: 2, title: "Ejecutivo", absolute_url: "https://job-boards.greenhouse.io/stone/jobs/2", location: { name: "Mexico City, Mexico" } },
      { id: 3, title: "Vaga com golpe", absolute_url: "javascript:alert(1)", location: { name: "São Paulo" } },
      { title: "Sem id", absolute_url: "https://x.com", location: { name: "São Paulo" } },
      { id: 5, title: "Vaga com prazo vencido", absolute_url: "https://x.com/5", location: { name: "São Paulo" }, application_deadline: "2026-01-01T00:00:00Z" },
    ],
  };

  it("converte, tira as etiquetas do texto e descarta fora do Brasil, sem link seguro, sem id e vencidas", () => {
    const r = converterGreenhouse(json, stone, new Date("2026-10-25T00:00:00Z"));
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({
      origem: "carreira:greenhouse:stone",
      idExterno: "8040000003",
      titulo: "SOFTWARE ENGINEER .NET II (Junior)",
      empresa: "Stone",
      cidade: "",
      modalidade: "remoto",
      setor: "Engenharia & Tecnologia",
      link: "https://job-boards.greenhouse.io/stone/jobs/8040000003",
    });
    expect(r[0].descricao).toContain("C# e SQL");
    expect(r[0].descricao).not.toMatch(/[<>]/);
    expect(r[0].publicadaEm).toEqual(new Date("2026-10-22T13:30:06Z"));
  });

  it("a vaga convertida passa pela triagem comum e vira vaga júnior de programação", () => {
    const [v] = converterGreenhouse(json, stone, new Date("2026-10-25T00:00:00Z"));
    const n = normalizarVaga(v, HABILIDADES);
    expect(n).toMatchObject({ tipo: "junior", modalidade: "remoto", area: "Programação" });
    expect(n!.requisitos.map((r) => r.slug)).toEqual(expect.arrayContaining(["sql", "git"]));
  });

  it("escolhe o lugar brasileiro quando a vaga tem vários", () => {
    const [v] = converterGreenhouse(
      { jobs: [{ id: 1, title: "Dev Júnior", absolute_url: "https://x.com/1", location: { name: "Mexico City, Mexico; São Paulo, São Paulo, Brazil" } }] },
      stone,
    );
    expect(v.cidade).toBe("São Paulo, São Paulo, Brazil");
  });

  it("tira a modalidade do nome da cidade ('Híbrido, São Paulo' é a cidade São Paulo, em modo híbrido)", () => {
    const [v] = converterGreenhouse({ jobs: [{ id: 1, title: "Dev Júnior", absolute_url: "https://x.com/1", location: { name: "Híbrido, São Paulo" } }] }, stone);
    expect(v).toMatchObject({ cidade: "São Paulo", modalidade: "hibrido" });
    const [remoto] = converterGreenhouse({ jobs: [{ id: 2, title: "Dev Júnior", absolute_url: "https://x.com/2", location: { name: "Remoto" } }] }, stone);
    expect(remoto).toMatchObject({ cidade: "", modalidade: "remoto" });
  });

  it("não quebra com resposta inesperada", () => {
    expect(converterGreenhouse(null, stone)).toEqual([]);
    expect(converterGreenhouse({ jobs: "x" }, stone)).toEqual([]);
  });
});

describe("converterLever", () => {
  const json = [
    {
      id: "4a84bde1",
      text: "[Job-32142] Developer Fullstack Jr ( Java + Angular )",
      hostedUrl: "https://jobs.lever.co/ciandt/4a84bde1",
      createdAt: 1790779378271,
      country: "BR",
      workplaceType: "remote",
      descriptionPlain: "Atuar com Java e Angular.",
      additionalPlain: "Inglês é um diferencial.",
      lists: [{ text: "Requisitos", content: "<li>Java</li><li>SQL</li>" }],
      categories: { location: "Brazil", commitment: "Intern", department: "Centelha", team: "Prod_Aura" },
    },
    { id: "x2", text: "Data Product Manager, Colombia", hostedUrl: "https://jobs.lever.co/ciandt/x2", country: "CO", categories: { location: "Colombia" } },
    { id: "x3", text: "Sem país definido, em São Paulo", hostedUrl: "https://jobs.lever.co/ciandt/x3", categories: { location: "São Paulo, SP" } },
  ];

  it("converte, tira o código interno do título e usa o país para decidir se é no Brasil", () => {
    const r = converterLever(json, ciandt);
    expect(r.map((v) => v.idExterno)).toEqual(["4a84bde1", "x3"]);
    expect(r[0]).toMatchObject({
      origem: "carreira:lever:ciandt",
      titulo: "Developer Fullstack Jr ( Java + Angular )",
      empresa: "CI&T",
      cidade: "Brazil",
      modalidade: "remoto",
      rotulos: ["Intern"],
      setor: "Centelha · Prod_Aura",
    });
    expect(r[0].publicadaEm).toEqual(new Date(1790779378271));
    expect(r[0].descricao).toContain("Atuar com Java e Angular.");
    expect(r[0].descricao).toContain("Java");
    expect(r[0].descricao).toContain("diferencial");
  });

  it("o tipo de contrato 'Intern' marca a vaga como estágio mesmo sem a palavra no título", () => {
    const [v] = converterLever(json, ciandt);
    expect(normalizarVaga({ ...v, titulo: "Desenvolvedor Backend" }, HABILIDADES)).toMatchObject({ tipo: "estagio" });
  });

  it("não quebra com resposta inesperada", () => {
    expect(converterLever({ jobs: [] }, ciandt)).toEqual([]);
  });
});

describe("converterAshby", () => {
  const base = {
    id: "857cd146",
    title: "Estágio em Engenharia de Dados",
    jobUrl: "https://jobs.ashbyhq.com/nubank/857cd146",
    publishedAt: "2026-10-01T12:00:00.000+00:00",
    employmentType: "Intern",
    department: "Engineer",
    team: "Dados",
    isListed: true,
    isRemote: false,
    workplaceType: "Hybrid",
    descriptionPlain: "Python e SQL.",
  };

  it("aceita vaga no Brasil e recusa fora dele, inclusive 'Remote' com endereço em outro país", () => {
    const r = converterAshby(
      {
        jobs: [
          { ...base, location: "São Paulo", address: { postalAddress: { addressCountry: "Brazil" } } },
          { ...base, id: "b", location: "Palo Alto", address: { postalAddress: { addressCountry: "United States" } } },
          { ...base, id: "c", location: "Remote", address: { postalAddress: { addressCountry: "United States" } } },
          { ...base, id: "d", location: "Remote", address: { postalAddress: { addressCountry: "Brazil" } } },
          { ...base, id: "e", location: "Mexico City", secondaryLocations: [{ location: "São Paulo, SP" }] },
          { ...base, id: "f", location: "São Paulo", isListed: false },
        ],
      },
      nubank,
    );
    expect(r.map((v) => v.idExterno)).toEqual(["857cd146", "d", "e"]);
    expect(r[0]).toMatchObject({ origem: "carreira:ashby:nubank", empresa: "Nubank", cidade: "São Paulo", modalidade: "hibrido", rotulos: ["Intern"], setor: "Engineer · Dados" });
    expect(r[0].publicadaEm).toEqual(new Date("2026-10-01T12:00:00Z"));
  });
});

describe("fonteDaEmpresa", () => {
  afterEach(() => vi.unstubAllGlobals());
  const responder = (corpo: unknown, status = 200) =>
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(corpo), { status })));

  it("tem origem própria por empresa, rótulo com a plataforma e marca de lista completa", () => {
    const f = fonteDaEmpresa(stone);
    expect(f).toMatchObject({ origem: "carreira:greenhouse:stone", rotulo: "Stone (Greenhouse)", listaCompleta: true });
    expect(f.indisponivel()).toBeNull();
  });

  it("devolve só vagas de tecnologia", async () => {
    responder({
      jobs: [
        { id: 1, title: "Engenheiro de Software Júnior", absolute_url: "https://x.com/1", location: { name: "São Paulo" } },
        { id: 2, title: "Vendedor Júnior", absolute_url: "https://x.com/2", location: { name: "São Paulo" }, departments: [{ name: "Comercial" }] },
      ],
    });
    expect((await fonteDaEmpresa(stone).buscar()).map((v) => v.idExterno)).toEqual(["1"]);
  });

  it("empresa sem nenhuma vaga é um resultado válido (lista vazia)", async () => {
    responder({ jobs: [] });
    expect(await fonteDaEmpresa(stone).buscar()).toEqual([]);
  });

  it("resposta fora do formato é erro, não 'sem vagas'", async () => {
    responder({ mensagem: "manutenção" });
    await expect(fonteDaEmpresa(stone).buscar()).rejects.toThrow(/Stone: resposta inesperada/);
    responder({ jobs: [] });
    await expect(fonteDaEmpresa(ciandt).buscar()).rejects.toThrow(/CI&T: resposta inesperada/); // Lever responde com uma lista
  });

  it("erro de rede ou HTTP sobe como erro (e nada é apagado)", async () => {
    responder({}, 404);
    await expect(fonteDaEmpresa(stone).buscar()).rejects.toThrow(/HTTP 404/);
  });
});

describe("rotuloDaOrigem", () => {
  it("mostra 'Site da empresa' para vagas de páginas de carreiras e o nome da fonte para as outras", () => {
    expect(rotuloDaOrigem("carreira:greenhouse:stone")).toBe("Site da empresa");
    expect(rotuloDaOrigem("gupy")).toBe("Gupy");
    expect(rotuloDaOrigem("desconhecida")).toBe("desconhecida");
  });
});
