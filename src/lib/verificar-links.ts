export type SituacaoDoLink = "ok" | "quebrado" | "bloqueado" | "erro";

/**
 * Classifica a resposta de um link:
 *  - ok: abriu (2xx, ou redirecionou);
 *  - quebrado: a página não existe mais (404, 410) ou o endereço não existe;
 *  - bloqueado: o site recusa programas automáticos (401, 403, 429...), então não dá para saber: confira na mão;
 *  - erro: falha passageira (tempo esgotado, 5xx).
 */
export function classificarResposta(resposta: { status: number } | { falha: string }): SituacaoDoLink {
  if ("falha" in resposta) return /ENOTFOUND|EAI_AGAIN|ERR_NAME_NOT_RESOLVED|certificate|CERT_/i.test(resposta.falha) ? "quebrado" : "erro";
  const { status } = resposta;
  if (status >= 200 && status < 400) return "ok";
  if (status === 404 || status === 410) return "quebrado";
  if ([401, 403, 405, 406, 429, 451, 999].includes(status)) return "bloqueado";
  return "erro";
}

/** Roda `tarefa` sobre a lista com no máximo `limite` ao mesmo tempo, mantendo a ordem do resultado. */
export async function emParalelo<T, R>(itens: T[], limite: number, tarefa: (item: T) => Promise<R>): Promise<R[]> {
  const resultados = new Array<R>(itens.length);
  let proximo = 0;
  async function trabalhador() {
    while (proximo < itens.length) {
      const i = proximo++;
      resultados[i] = await tarefa(itens[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limite, itens.length) }, trabalhador));
  return resultados;
}
