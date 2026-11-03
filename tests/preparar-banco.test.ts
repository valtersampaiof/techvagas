import { describe, expect, it } from "vitest";
import { planejarMudancas, separarComandos } from "@/lib/preparar-banco";

const SQL = `-- CreateTable
CREATE TABLE "Usuario" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "cidade" TEXT NOT NULL DEFAULT ''
);

-- CreateTable
CREATE TABLE "Alerta" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "usuarioId" INTEGER NOT NULL,
    CONSTRAINT "Alerta_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE INDEX "Alerta_usuarioId_idx" ON "Alerta"("usuarioId");
`;

describe("separarComandos", () => {
  it("divide o SQL do Prisma em comandos e ignora os comentários", () => {
    const comandos = separarComandos(SQL);
    expect(comandos).toHaveLength(4);
    expect(comandos[0].startsWith('CREATE TABLE "Usuario"')).toBe(true);
    expect(comandos.every((c) => !c.includes("-- CreateTable"))).toBe(true);
  });
});

describe("planejarMudancas", () => {
  it("banco vazio: cria tudo, e os índices só se não existirem", () => {
    const plano = planejarMudancas(SQL, new Map());
    expect(plano).toHaveLength(4);
    expect(plano[0]).toContain('CREATE TABLE "Usuario"');
    expect(plano[2]).toBe('CREATE UNIQUE INDEX IF NOT EXISTS "Usuario_email_key" ON "Usuario"("email")');
    expect(plano[3]).toBe('CREATE INDEX IF NOT EXISTS "Alerta_usuarioId_idx" ON "Alerta"("usuarioId")');
  });

  it("tabela que já existe só ganha as colunas que faltam", () => {
    const existentes = new Map([
      ["Usuario", new Set(["id", "email"])],
      ["Alerta", new Set(["id", "usuarioId"])],
    ]);
    const plano = planejarMudancas(SQL, existentes);
    expect(plano).toContain(`ALTER TABLE "Usuario" ADD COLUMN "cidade" TEXT NOT NULL DEFAULT ''`);
    expect(plano.filter((c) => c.startsWith("CREATE TABLE"))).toEqual([]);
    expect(plano.filter((c) => c.startsWith("ALTER"))).toHaveLength(1);
  });

  it("banco já atualizado: só os índices (que são 'se não existirem')", () => {
    const existentes = new Map([
      ["Usuario", new Set(["id", "email", "cidade"])],
      ["Alerta", new Set(["id", "usuarioId"])],
    ]);
    const plano = planejarMudancas(SQL, existentes);
    expect(plano.every((c) => c.includes("IF NOT EXISTS"))).toBe(true);
  });
});
