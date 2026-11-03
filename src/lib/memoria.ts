/**
 * Guarda por alguns minutos o resultado de leituras pesadas que quase nunca mudam (lista de cidades, áreas, catálogo de
 * cursos), para não consultar o banco a cada visita. Importa na internet: no banco online, cada leitura conta no limite do
 * plano gratuito. No computador de quem está desenvolvendo (ttl = 0), nada é guardado e a tela mostra sempre o dado novo.
 */
export function memorizar<T>(ttlMs: number): (chave: string, buscar: () => Promise<T>) => Promise<T> {
  const guardado = new Map<string, { valor: T; expiraEm: number }>();
  return async (chave, buscar) => {
    if (ttlMs <= 0) return buscar();
    const agora = Date.now();
    const existente = guardado.get(chave);
    if (existente && existente.expiraEm > agora) return existente.valor;
    const valor = await buscar();
    guardado.set(chave, { valor, expiraEm: agora + ttlMs });
    return valor;
  };
}

/** Quanto tempo as leituras pesadas ficam guardadas: 10 minutos na internet, nada ao desenvolver. */
export const TEMPO_DA_MEMORIA_MS = process.env.NODE_ENV === "production" ? 10 * 60_000 : 0;
