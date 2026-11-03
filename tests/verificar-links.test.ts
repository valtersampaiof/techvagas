import { describe, expect, it } from "vitest";
import { classificarResposta, emParalelo } from "@/lib/verificar-links";

describe("classificarResposta", () => {
  it("abre, redireciona, não existe, bloqueia robôs ou falhou", () => {
    expect(classificarResposta({ status: 200 })).toBe("ok");
    expect(classificarResposta({ status: 301 })).toBe("ok");
    expect(classificarResposta({ status: 404 })).toBe("quebrado");
    expect(classificarResposta({ status: 410 })).toBe("quebrado");
    expect(classificarResposta({ status: 403 })).toBe("bloqueado");
    expect(classificarResposta({ status: 429 })).toBe("bloqueado");
    expect(classificarResposta({ status: 503 })).toBe("erro");
  });

  it("endereço que não existe é quebrado; tempo esgotado é só falha passageira", () => {
    expect(classificarResposta({ falha: "fetch failed getaddrinfo ENOTFOUND exemplo.invalido" })).toBe("quebrado");
    expect(classificarResposta({ falha: "The operation was aborted due to timeout" })).toBe("erro");
  });
});

describe("emParalelo", () => {
  it("mantém a ordem e respeita o limite de tarefas ao mesmo tempo", async () => {
    let ativas = 0;
    let maximo = 0;
    const r = await emParalelo([1, 2, 3, 4, 5, 6], 2, async (n) => {
      ativas++;
      maximo = Math.max(maximo, ativas);
      await new Promise((ok) => setTimeout(ok, 5));
      ativas--;
      return n * 10;
    });
    expect(r).toEqual([10, 20, 30, 40, 50, 60]);
    expect(maximo).toBeLessThanOrEqual(2);
  });

  it("lista vazia não trava", async () => {
    expect(await emParalelo([], 4, async (x: number) => x)).toEqual([]);
  });
});
