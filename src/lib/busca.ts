import { normalizar } from "./extrair-habilidades";

/**
 * Frases que as descrições repetem em quase todo curso ou vaga e que não dizem o ASSUNTO: o idioma do material
 * ("Em inglês"), o certificado ("sem certificado") e a versão ("com legendas"). Sem tirar isso, buscar "inglês" traz os
 * 270 cursos que são dados em inglês, e não os que ensinam inglês; buscar "certificado" traz os "sem certificado".
 * O texto já chega sem acento e em minúsculas.
 */
const RUIDO_DAS_DESCRICOES =
  /\b(em ingles|in english|em portugues|(tem )?versao em portugues|com legendas( em portugues)?|sem certificado( formal)?|com certificado( gratuito| de conclusao( gratuito)?)?|certificado e pago|certificado exige o plano pro)\b/g;

/** Texto pronto para a busca: sem acento, em minúsculas e sem as frases de ruído. */
export function textoParaBusca(...partes: string[]): string {
  return normalizar(partes.join(" ")).replace(RUIDO_DAS_DESCRICOES, " ");
}

export function palavrasDaBusca(consulta: string): string[] {
  return normalizar(consulta).split(/\s+/).filter(Boolean);
}

const escaparRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Todas as palavras da busca aparecem no texto? Palavra de até 4 letras ("java", "sql", "git", "c#") vale só inteira (com
 * plural ou número: "sqls", "python3"), para "java" não trazer "javascript" nem "ti" trazer "gestão"; palavra maior vale
 * no começo de uma palavra do texto ("segur" acha "segurança"). Antes valia qualquer pedaço do texto.
 */
export function correspondeABusca(textoNormalizado: string, palavras: string[]): boolean {
  return palavras.every((p) => {
    const antes = /^[a-z0-9]/.test(p) ? "(^|[^a-z0-9])" : "";
    const regex = p.length <= 4 ? new RegExp(`${antes}${escaparRegex(p)}(s|es|[0-9]+)?($|[^a-z0-9])`) : new RegExp(`${antes}${escaparRegex(p)}`);
    return regex.test(textoNormalizado);
  });
}
