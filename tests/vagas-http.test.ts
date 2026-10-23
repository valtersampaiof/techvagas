import { afterEach, describe, expect, it, vi } from "vitest";
import { pedirJson, buscarPorTermos } from "@/lib/vagas/http";

afterEach(() => vi.unstubAllGlobals());

const responder = (corpo: string, status = 200) =>
  vi.stubGlobal("fetch", vi.fn(async () => new Response(corpo, { status })));

describe("pedirJson", () => {
  it("devolve o JSON da resposta", async () => {
    responder('{"ok":true}');
    expect(await pedirJson("https://exemplo.com/api")).toEqual({ ok: true });
  });

  it("explica o erro quando a chave é recusada ou o limite estoura", async () => {
    responder("{}", 401);
    await expect(pedirJson("https://exemplo.com/api")).rejects.toThrow(/HTTP 401.*\.env/);
    responder("{}", 429);
    await expect(pedirJson("https://exemplo.com/api")).rejects.toThrow(/HTTP 429.*limite/);
  });

  it("explica o erro quando a fonte responde com uma página HTML em vez de dados", async () => {
    responder("<!DOCTYPE html><title>Just a moment...</title>");
    await expect(pedirJson("https://jooble.org/api/x")).rejects.toThrow(/jooble\.org não devolveu dados.*bloqueando/);
  });
});

describe("buscarPorTermos", () => {
  it("junta os resultados e tolera falha de alguns termos", async () => {
    const r = await buscarPorTermos(["a", "b", "c"], async (t) => {
      if (t === "b") throw new Error("falhou");
      return [t];
    });
    expect(r).toEqual(["a", "c"]);
  });

  it("só lança o erro se todos os termos falharem", async () => {
    await expect(buscarPorTermos(["a", "b"], async () => Promise.reject(new Error("fora do ar")))).rejects.toThrow("fora do ar");
  });
});
