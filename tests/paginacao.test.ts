import { describe, expect, it } from "vitest";
import { janelaDePaginas, numeroDaPagina, paginar } from "@/lib/paginacao";

describe("numeroDaPagina", () => {
  it("aceita números válidos e cai para 1 no resto", () => {
    expect(numeroDaPagina("3")).toBe(3);
    for (const v of [undefined, "", "abc", "0", "-2", "NaN"]) expect(numeroDaPagina(v as string | undefined), String(v)).toBe(1);
    expect(numeroDaPagina("2.7")).toBe(2);
  });
});

describe("paginar", () => {
  const lista = Array.from({ length: 50 }, (_, i) => i + 1);

  it("divide em páginas", () => {
    const p = paginar(lista, 2, 24);
    expect(p).toMatchObject({ atual: 2, totalPaginas: 3, total: 50 });
    expect(p.itens[0]).toBe(25);
    expect(p.itens).toHaveLength(24);
    expect(paginar(lista, 3, 24).itens).toHaveLength(2);
  });

  it("ajusta páginas fora do limite em vez de devolver vazio", () => {
    expect(paginar(lista, 99, 24).atual).toBe(3);
    expect(paginar(lista, 0, 24).atual).toBe(1);
    expect(paginar(lista, -5, 24).atual).toBe(1);
  });

  it("lista vazia tem 1 página e nenhum item", () => {
    expect(paginar([], 1)).toEqual({ itens: [], atual: 1, totalPaginas: 1, total: 0 });
  });

  it("lista que cabe numa página só", () => {
    expect(paginar([1, 2, 3], 1, 24)).toMatchObject({ totalPaginas: 1, itens: [1, 2, 3] });
  });
});

describe("janelaDePaginas", () => {
  it("mostra tudo quando são poucas", () => {
    expect(janelaDePaginas(1, 3)).toEqual([1, 2, 3]);
    expect(janelaDePaginas(2, 1)).toEqual([1]);
  });
  it("usa reticências em listas longas", () => {
    expect(janelaDePaginas(1, 12)).toEqual([1, 2, "…", 12]);
    expect(janelaDePaginas(6, 12)).toEqual([1, "…", 5, 6, 7, "…", 12]);
    expect(janelaDePaginas(12, 12)).toEqual([1, "…", 11, 12]);
  });
  it("não coloca reticências entre números seguidos", () => {
    expect(janelaDePaginas(3, 5)).toEqual([1, 2, 3, 4, 5]);
  });
});
