import { execFileSync } from "node:child_process";
import { createClient as criarClienteLocal } from "@libsql/client";
import { createClient as criarClienteWeb } from "@libsql/client/web";
import { planejarMudancas, type TabelasExistentes } from "../src/lib/preparar-banco";

/**
 * Prepara o banco online (Turso): cria as tabelas e colunas que faltam. Pode ser rodado quantas vezes quiser.
 * Usa `TURSO_DATABASE_URL` e `TURSO_AUTH_TOKEN` (ou `--url=file:...`, para testar com um arquivo no computador).
 */
async function main() {
  const urlDoArgumento = process.argv.find((a) => a.startsWith("--url="))?.slice(6);
  const url = urlDoArgumento ?? process.env.TURSO_DATABASE_URL?.trim();
  if (!url) throw new Error("Defina TURSO_DATABASE_URL (o endereço do banco no Turso) para preparar o banco online.");

  const sql = execFileSync("npx", ["prisma", "migrate", "diff", "--from-empty", "--to-schema-datamodel", "prisma/schema.prisma", "--script"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  });

  // Para o Turso usa o MESMO caminho do site (HTTP, o cliente "web"); só arquivo local (testes) usa o cliente comum.
  const config = { url, authToken: process.env.TURSO_AUTH_TOKEN?.trim() || undefined };
  const cliente = url.startsWith("file:") ? criarClienteLocal(config) : criarClienteWeb(config);
  try {
    const tabelas = (await cliente.execute("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")).rows.map((r) => String(r.name));
    const existentes: TabelasExistentes = new Map();
    for (const t of tabelas) {
      const colunas = (await cliente.execute(`PRAGMA table_info("${t}")`)).rows.map((r) => String(r.name));
      existentes.set(t, new Set(colunas));
    }

    const plano = planejarMudancas(sql, existentes);
    for (const comando of plano) {
      await cliente.execute(comando);
      console.log(`✔ ${comando.split("\n")[0].slice(0, 90)}`);
    }
    console.log(plano.length === 0 ? "O banco já está atualizado." : `\n${plano.length} mudança(s) aplicada(s).`);
  } finally {
    cliente.close();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
