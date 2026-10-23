import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { jooble } from "@/lib/vagas/fontes/jooble";

const vagaJooble = { id: 1, title: "Estágio em TI", location: "São Paulo", snippet: "Python", link: "https://jooble.org/desc/1", company: "Acme" };

beforeEach(() => {
  process.env.JOOBLE_API_KEY = "chave-de-teste";
  delete process.env.JOOBLE_HOST;
});
afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.JOOBLE_API_KEY;
  delete process.env.JOOBLE_HOST;
});

type Chamada = { host: string; corpo: { keywords: string; location: string } };
const chamadas: Chamada[] = [];

function simular(resposta: () => Response) {
  chamadas.length = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      chamadas.push({ host: new URL(url).host, corpo: JSON.parse(String(init.body)) });
      return resposta();
    }),
  );
}

describe("Jooble", () => {
  it("fica indisponível sem chave", () => {
    delete process.env.JOOBLE_API_KEY;
    expect(jooble.indisponivel()).toMatch(/JOOBLE_API_KEY/);
  });

  it("chama jooble.org com location 'Brazil' (com 'Brasil' a API devolve zero vagas)", async () => {
    simular(() => Response.json({ jobs: [vagaJooble] }));
    const vagas = await jooble.buscar();
    expect(vagas.length).toBeGreaterThan(0);
    expect(new Set(chamadas.map((c) => c.host))).toEqual(new Set(["jooble.org"]));
    expect(chamadas.every((c) => c.corpo.location === "Brazil")).toBe(true);
  }, 20_000);

  it("respeita JOOBLE_HOST quando definido", async () => {
    process.env.JOOBLE_HOST = "us.jooble.org";
    simular(() => Response.json({ jobs: [vagaJooble] }));
    await jooble.buscar();
    expect(new Set(chamadas.map((c) => c.host))).toEqual(new Set(["us.jooble.org"]));
  }, 20_000);

  it("falha de verdade quando a API recusa a chave em todas as buscas", async () => {
    simular(() => new Response("{}", { status: 403 }));
    await expect(jooble.buscar()).rejects.toThrow(/HTTP 403/);
  }, 20_000);
});
