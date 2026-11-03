import http from "node:http";
import type { AddressInfo } from "node:net";
import { randomBytes } from "node:crypto";
import Database from "libsql";

/**
 * Um "Turso de mentirinha" para os testes: fala o mesmo protocolo que o Turso usa (Hrana sobre HTTP, versão 2) e guarda os
 * dados num arquivo SQLite local. Serve para testar o caminho que o site usa na internet (o cliente "web" do libSQL,
 * o token de acesso, as transações do Prisma) sem precisar de uma conta nem de rede.
 *
 * Cada "baton" (código de sessão) é uma conexão própria com o arquivo, como num servidor de verdade: uma transação aberta
 * continua entre uma chamada HTTP e a seguinte.
 */

type Valor = { type: "null" } | { type: "integer"; value: string } | { type: "float"; value: number } | { type: "text"; value: string } | { type: "blob"; base64: string };
type Comando = { sql?: string; sql_id?: number; args?: Valor[]; named_args?: unknown[]; want_rows?: boolean };
type Condicao = { type: "ok" | "error"; step: number } | { type: "not"; cond: Condicao } | { type: "and" | "or"; conds: Condicao[] } | { type: "is_autocommit" };
type Erro = { message: string; code?: string };
type ResultadoDoComando = { cols: { name: string; decltype: string | null }[]; rows: Valor[][]; affected_row_count: number; last_insert_rowid: string | null };

const abrirArquivo = (arquivo: string) => new Database(arquivo);
type Banco = ReturnType<typeof abrirArquivo>;
type Sessao = { banco: Banco; sqls: Map<number, string> };

function lerValor(v: Valor): unknown {
  if (v.type === "null") return null;
  if (v.type === "integer") return BigInt(v.value);
  if (v.type === "float") return v.value;
  if (v.type === "text") return v.value;
  return Buffer.from(v.base64, "base64");
}

function escreverValor(v: unknown): Valor {
  if (v === null || v === undefined) return { type: "null" };
  if (typeof v === "bigint") return { type: "integer", value: v.toString() };
  if (typeof v === "number") return { type: "float", value: v };
  if (typeof v === "string") return { type: "text", value: v };
  if (v instanceof Uint8Array) return { type: "blob", base64: Buffer.from(v).toString("base64") };
  throw new Error(`valor não suportado: ${typeof v}`);
}

function comoErro(e: unknown): Erro {
  const erro = e as { message?: string; code?: string };
  return { message: erro.message ?? String(e), code: erro.code ?? "SQLITE_ERROR" };
}

function executar(s: Sessao, comando: Comando): ResultadoDoComando {
  const sql = comando.sql ?? s.sqls.get(comando.sql_id ?? -1);
  if (!sql) throw Object.assign(new Error("comando sem SQL"), { code: "HRANA_PROTOCOL" });
  const args = (comando.args ?? []).map(lerValor);
  const stmt = s.banco.prepare(sql);
  if (stmt.reader) {
    stmt.safeIntegers(true);
    stmt.raw(true);
    const rows = stmt.all(...args) as unknown[][];
    return {
      cols: stmt.columns().map((c: { name: string; type?: string | null }) => ({ name: c.name, decltype: c.type ?? null })),
      rows: rows.map((linha) => linha.map(escreverValor)),
      affected_row_count: 0,
      last_insert_rowid: null,
    };
  }
  const info = stmt.run(...args);
  return { cols: [], rows: [], affected_row_count: info.changes, last_insert_rowid: String(info.lastInsertRowid) };
}

function avaliar(c: Condicao, s: Sessao, resultados: (ResultadoDoComando | null)[], erros: (Erro | null)[]): boolean {
  if (c.type === "ok") return resultados[c.step] != null;
  if (c.type === "error") return erros[c.step] != null;
  if (c.type === "not") return !avaliar(c.cond, s, resultados, erros);
  if (c.type === "and") return c.conds.every((x) => avaliar(x, s, resultados, erros));
  if (c.type === "or") return c.conds.some((x) => avaliar(x, s, resultados, erros));
  return !s.banco.inTransaction;
}

type Pedido = { type: string; stmt?: Comando; batch?: { steps: { condition?: Condicao; stmt: Comando }[] }; sql?: string; sql_id?: number };

function responder(s: Sessao, p: Pedido): { response: Record<string, unknown>; fechar?: boolean } {
  switch (p.type) {
    case "execute":
      return { response: { type: "execute", result: executar(s, p.stmt!) } };
    case "batch": {
      const resultados: (ResultadoDoComando | null)[] = [];
      const erros: (Erro | null)[] = [];
      for (const passo of p.batch!.steps) {
        if (passo.condition && !avaliar(passo.condition, s, resultados, erros)) {
          resultados.push(null);
          erros.push(null);
          continue;
        }
        try {
          resultados.push(executar(s, passo.stmt));
          erros.push(null);
        } catch (e) {
          resultados.push(null);
          erros.push(comoErro(e));
        }
      }
      return { response: { type: "batch", result: { step_results: resultados, step_errors: erros } } };
    }
    case "sequence": {
      s.banco.exec(p.sql ?? s.sqls.get(p.sql_id ?? -1) ?? "");
      return { response: { type: "sequence" } };
    }
    case "store_sql":
      s.sqls.set(p.sql_id!, p.sql!);
      return { response: { type: "store_sql" } };
    case "close_sql":
      s.sqls.delete(p.sql_id!);
      return { response: { type: "close_sql" } };
    case "get_autocommit":
      return { response: { type: "get_autocommit", is_autocommit: !s.banco.inTransaction } };
    case "close":
      return { response: { type: "close" }, fechar: true };
    default:
      throw Object.assign(new Error(`pedido desconhecido: ${p.type}`), { code: "HRANA_PROTOCOL" });
  }
}

export type ServidorHrana = {
  /** Endereço para usar como TURSO_DATABASE_URL, ex.: http://127.0.0.1:50321 */
  url: string;
  /** Quantas chamadas HTTP já chegaram (para conferir que o caminho online foi mesmo usado). */
  chamadas: () => number;
  /** Chamadas recusadas por token errado. */
  recusadas: () => number;
  fechar: () => Promise<void>;
};

export async function iniciarServidorHrana(opcoes: { arquivo: string; token: string }): Promise<ServidorHrana> {
  const sessoes = new Map<string, Sessao>();
  let chamadas = 0;
  let recusadas = 0;

  const abrir = (): Sessao => {
    const banco = abrirArquivo(opcoes.arquivo);
    banco.exec("PRAGMA busy_timeout = 10000");
    return { banco, sqls: new Map() };
  };

  const servidor = http.createServer((req, res) => {
    const enviar = (status: number, corpo: unknown) => {
      res.writeHead(status, { "content-type": "application/json" });
      res.end(JSON.stringify(corpo));
    };
    chamadas++;
    if (req.headers.authorization !== `Bearer ${opcoes.token}`) {
      recusadas++;
      return enviar(401, { error: "token inválido" });
    }
    if (req.method === "GET") return enviar(200, {});
    if (req.method !== "POST" || !req.url?.endsWith("/v2/pipeline")) return enviar(404, { error: "não encontrado" });

    const partes: Buffer[] = [];
    req.on("data", (p) => partes.push(p));
    req.on("end", () => {
      try {
        const corpo = JSON.parse(Buffer.concat(partes).toString("utf8")) as { baton?: string | null; requests: Pedido[] };
        let baton = corpo.baton ?? null;
        let sessao = baton ? sessoes.get(baton) : undefined;
        if (baton && !sessao) return enviar(400, { error: "baton desconhecido" });
        if (!sessao) {
          sessao = abrir();
          baton = randomBytes(12).toString("hex");
          sessoes.set(baton, sessao);
        }

        let fechar = false;
        const results = corpo.requests.map((pedido) => {
          try {
            const r = responder(sessao!, pedido);
            fechar ||= !!r.fechar;
            return { type: "ok", response: r.response };
          } catch (e) {
            return { type: "error", error: comoErro(e) };
          }
        });
        if (fechar) {
          sessao.banco.close();
          sessoes.delete(baton!);
          baton = null;
        }
        enviar(200, { baton, base_url: null, results });
      } catch (e) {
        enviar(400, { error: (e as Error).message });
      }
    });
  });

  await new Promise<void>((ok) => servidor.listen(0, "127.0.0.1", ok));
  const { port } = servidor.address() as AddressInfo;

  return {
    url: `http://127.0.0.1:${port}`,
    chamadas: () => chamadas,
    recusadas: () => recusadas,
    fechar: async () => {
      for (const s of sessoes.values()) s.banco.close();
      sessoes.clear();
      await new Promise<void>((ok) => servidor.close(() => ok()));
    },
  };
}
