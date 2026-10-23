import type { HabilidadeBase } from "./dados/habilidades";

/** Minúsculas, sem acento, só letras/números e alguns símbolos úteis (c#, .net, node.js). */
export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9#+./\s-]/g, " ")
    .replace(/\s+/g, " ");
}

function escaparRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Procura o termo como palavra inteira. Evita que "java" case dentro de
 * "javascript" ou "ts" dentro de "projetos".
 */
function contemTermo(textoNormalizado: string, termo: string): boolean {
  const t = escaparRegex(normalizar(termo).trim());
  if (!t) return false;
  return new RegExp(`(^|[^a-z0-9])${t}($|[^a-z0-9])`).test(textoNormalizado);
}

/** Termos curtos demais geram falso positivo; só valem se estiverem escritos em maiúsculas no original. */
const AMBIGUOS_CURTOS = new Set(["ts", "js", "bi", "qa", "soc", "lan"]);

export function extrairHabilidades(texto: string, catalogo: HabilidadeBase[]): string[] {
  const norm = normalizar(texto);
  const encontradas: string[] = [];

  for (const h of catalogo) {
    const termos = [h.nome, ...h.sinonimos];
    const achou = termos.some((termo) => {
      const n = normalizar(termo).trim();
      if (AMBIGUOS_CURTOS.has(n)) {
        return new RegExp(`(^|[^A-Za-z0-9])${n.toUpperCase()}($|[^A-Za-z0-9])`).test(texto);
      }
      return contemTermo(norm, termo);
    });
    if (achou) encontradas.push(h.slug);
  }
  return encontradas;
}
