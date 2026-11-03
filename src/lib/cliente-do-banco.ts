import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql/web";

/**
 * Cria o cliente do banco de dados.
 *
 *  - No computador (sem `TURSO_DATABASE_URL`): usa o arquivo SQLite de `DATABASE_URL`.
 *  - Na internet (com `TURSO_DATABASE_URL`): usa o Turso, um banco SQLite online e gratuito. Ele é o mesmo tipo de banco,
 *    só que fica num servidor; por isso o resto do código não muda.
 */
export function criarClienteDoBanco(): PrismaClient {
  const url = process.env.TURSO_DATABASE_URL?.trim();
  if (!url) return new PrismaClient();
  const adaptador = new PrismaLibSQL({ url, authToken: process.env.TURSO_AUTH_TOKEN?.trim() || undefined });
  return new PrismaClient({ adapter: adaptador });
}
