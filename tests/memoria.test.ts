import { describe, expect, it } from "vitest";
import { memorizar } from "@/lib/memoria";

describe("memorizar", () => {
  it("com tempo, guarda o resultado e só busca de novo depois que vence", async () => {
    let chamadas = 0;
    const lembrar = memorizar<number>(50);
    const buscar = async () => ++chamadas;
    expect(await lembrar("a", buscar)).toBe(1);
    expect(await lembrar("a", buscar)).toBe(1);
    expect(await lembrar("b", buscar)).toBe(2); // outra chave: busca própria
    await new Promise((r) => setTimeout(r, 70));
    expect(await lembrar("a", buscar)).toBe(3);
  });

  it("com tempo zero, nunca guarda (é o que acontece ao desenvolver)", async () => {
    let chamadas = 0;
    const lembrar = memorizar<number>(0);
    await lembrar("a", async () => ++chamadas);
    await lembrar("a", async () => ++chamadas);
    expect(chamadas).toBe(2);
  });
});
