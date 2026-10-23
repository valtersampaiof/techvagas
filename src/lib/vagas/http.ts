const TEMPO_LIMITE_MS = 20_000;
const PAUSA_ENTRE_CHAMADAS_MS = 400;

export async function pedirJson(url: string, init: RequestInit = {}): Promise<unknown> {
  const resposta = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
    headers: { Accept: "application/json", "User-Agent": "techvagas (vagas para estudantes de TI)", ...init.headers },
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

export const pausa = () => new Promise<void>((r) => setTimeout(r, PAUSA_ENTRE_CHAMADAS_MS));

/**
 * Roda uma busca por termo e junta os resultados. Um termo que falha não derruba
 * os outros; só se TODOS falharem o erro sobe (a fonte inteira está com problema).
 */
export async function buscarPorTermos<T>(termos: string[], buscar: (termo: string) => Promise<T[]>): Promise<T[]> {
  const todos: T[] = [];
  let ultimoErro: unknown = null;
  let falhas = 0;
  for (const termo of termos) {
    try {
      todos.push(...(await buscar(termo)));
    } catch (e) {
      falhas++;
      ultimoErro = e;
    }
    await pausa();
  }
  if (falhas === termos.length && ultimoErro) throw ultimoErro;
  return todos;
}
