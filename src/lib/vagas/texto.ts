const ENTIDADES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
};

function decodificarEntidades(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (inteiro, c: string) => {
    if (c[0] === "#") {
      const codigo = c[1].toLowerCase() === "x" ? parseInt(c.slice(2), 16) : parseInt(c.slice(1), 10);
      return Number.isFinite(codigo) && codigo > 0 && codigo < 0x110000 ? String.fromCodePoint(codigo) : "";
    }
    return ENTIDADES[c.toLowerCase()] ?? inteiro;
  });
}

function arrumarEspacos(s: string): string {
  return s
    .replace(/[ \t ]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function htmlParaTexto(html: string): string {
  const semBlocos = html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr)\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, " ");
  return arrumarEspacos(decodificarEntidades(semBlocos));
}

export function markdownParaTexto(md: string): string {
  const limpo = md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "• ")
    .replace(/(\*\*|__|\*|_|`)/g, "")
    .replace(/<!--[\s\S]*?-->/g, " ");
  return htmlParaTexto(limpo);
}

export function truncar(texto: string, limite: number): string {
  if (texto.length <= limite) return texto;
  return texto.slice(0, limite).replace(/\s+\S*$/, "") + "…";
}

/** Só aceita endereços http(s); evita guardar algo como `javascript:` vindo de fora. */
export function urlSegura(url: unknown): string | null {
  if (typeof url !== "string") return null;
  try {
    const u = new URL(url.trim());
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

export function textoOuVazio(valor: unknown): string {
  return typeof valor === "string" ? valor.trim() : "";
}

export function dataOuNull(valor: unknown): Date | null {
  if (typeof valor !== "string" && typeof valor !== "number") return null;
  const d = new Date(valor);
  return Number.isNaN(d.getTime()) ? null : d;
}
