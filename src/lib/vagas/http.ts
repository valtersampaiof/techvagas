const TEMPO_LIMITE_MS = 20_000;
const PAUSA_ENTRE_CHAMADAS_MS = 400;

export async function pedirJson(url: string, init: RequestInit = {}): Promise<unknown> {
  const resposta = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
    headers: { Accept: "application/json", "User-Agent": "techvagas (vagas de TI e cursos)", ...init.headers },
  });
  if (!resposta.ok) {
    const dica =
      resposta.status === 401 || resposta.status === 403
        ? " (chave ou token recusado: confira o arquivo .env)"
        : resposta.status === 429
          ? " (limite de consultas atingido: tente de novo mais tarde)"
          : "";
    throw new Error(`HTTP ${resposta.status} em ${new URL(url).host}${dica}`);
  }
  const texto = await resposta.text();
  try {
    return JSON.parse(texto);
  } catch {
    // Acontece, por exemplo, quando o site responde com uma tela de verificação anti-robô.
    throw new Error(`${new URL(url).host} não devolveu dados (pode estar bloqueando acessos automáticos)`);
  }
}

export const pausa = (ms: number = PAUSA_ENTRE_CHAMADAS_MS) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Roda uma busca para cada item (um termo, ou um termo com filtros) e junta os resultados. Uma busca que
 * falha não derruba as outras; só se TODAS falharem o erro sobe (a fonte inteira está com problema).
 */
export async function buscarPorTermos<A, T>(itens: A[], buscar: (item: A) => Promise<T[]>, pausaMs: number = PAUSA_ENTRE_CHAMADAS_MS): Promise<T[]> {
  const todos: T[] = [];
  let ultimoErro: unknown = null;
  let falhas = 0;
  for (const item of itens) {
    try {
      todos.push(...(await buscar(item)));
    } catch (e) {
      falhas++;
      ultimoErro = e;
    }
    await pausa(pausaMs);
  }
  if (falhas === itens.length && ultimoErro) throw ultimoErro;
  return todos;
}
