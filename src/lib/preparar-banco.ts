/**
 * Cria no banco online as tabelas que faltam e acrescenta as colunas novas, sem apagar nada.
 *
 * O Prisma sabe gerar o SQL completo do desenho das tabelas (`prisma migrate diff`), mas o comando `db push` não conversa com
 * o Turso. Então pegamos esse SQL e o ajustamos ao que já existe no banco: tabela que falta é criada; tabela que já existe
 * só ganha as colunas que ainda não tem; índices são criados "se não existirem".
 */

export type TabelasExistentes = Map<string, Set<string>>;

/** Separa o SQL gerado pelo Prisma em comandos. */
export function separarComandos(sql: string): string[] {
  return sql
    .split(/;\s*\n/)
    .map((c) =>
      c
        .split("\n")
        .filter((linha) => !linha.trim().startsWith("--"))
        .join("\n")
        .trim()
        .replace(/;$/, ""),
    )
    .filter(Boolean);
}

/** Colunas declaradas num `CREATE TABLE` (as linhas que começam com o nome entre aspas). */
function colunasDaTabela(comando: string): { nome: string; definicao: string }[] {
  const corpo = comando.slice(comando.indexOf("(") + 1, comando.lastIndexOf(")"));
  return corpo
    .split("\n")
    .map((l) => l.trim().replace(/,$/, ""))
    .filter((l) => l.startsWith('"'))
    .map((l) => ({ nome: l.match(/^"([^"]+)"/)![1], definicao: l }));
}

export function planejarMudancas(sql: string, existentes: TabelasExistentes): string[] {
  const plano: string[] = [];
  for (const comando of separarComandos(sql)) {
    const tabela = comando.match(/^CREATE TABLE "([^"]+)"/);
    if (tabela) {
      const colunas = existentes.get(tabela[1]);
      if (!colunas) {
        plano.push(comando);
        continue;
      }
      for (const c of colunasDaTabela(comando)) {
        if (!colunas.has(c.nome)) plano.push(`ALTER TABLE "${tabela[1]}" ADD COLUMN ${c.definicao}`);
      }
      continue;
    }
    const indice = comando.match(/^CREATE (UNIQUE )?INDEX "/);
    if (indice) {
      plano.push(comando.replace(/^CREATE (UNIQUE )?INDEX /, (_, unico: string | undefined) => `CREATE ${unico ?? ""}INDEX IF NOT EXISTS `));
      continue;
    }
    // Qualquer outro comando (não há outros no desenho atual) é ignorado de propósito: melhor não fazer do que fazer errado.
  }
  return plano;
}
