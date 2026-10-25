const ENTIDADES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
};

export function decodificarEntidades(s: string): string {
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
    // Etiquetas dentro da frase não separam palavras: <strong>SQL</strong>. vira "SQL." (sem espaço antes do ponto).
    .replace(/<\/?(strong|b|em|i|u|span|a|font|mark|small|sub|sup|code)(\s[^>]*)?>/gi, "")
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

/**
 * Algumas fontes (a Gupy, por exemplo) entregam o texto com as frases coladas: "objetivo.Nessa oportunidade".
 * Separa só o caso seguro: letra minúscula + pontuação + palavra que começa com maiúscula e segue com
 * minúsculas. Não mexe em "ASP.NET", "Node.js" nem em "JavaScript". Use apenas no texto EXIBIDO,
 * nunca antes de procurar habilidades.
 */
export function espacarFrases(texto: string): string {
  return texto.replace(/([a-zà-ú\)])([.!?;:])([A-ZÀ-Ú][a-zà-ú])/g, "$1$2 $3");
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

/** Cadastro permanente de currículos, não uma vaga aberta de verdade. */
const BANCO_DE_TALENTOS = /\b(banco de talentos|cadastro (de )?reserva|banco de curr[ií]culos?|talent pool|talent community)\b/i;

export function ehBancoDeTalentos(titulo: string): boolean {
  return BANCO_DE_TALENTOS.test(titulo);
}

const textoCurto = (html: string) => htmlParaTexto(html).replace(/\s+/g, " ").trim();

/**
 * Como `htmlParaTexto`, mas guarda a estrutura do anúncio em marcas simples: título vira "## Título" (tags h1 a h6 e
 * parágrafos curtos só em negrito) e item de lista vira "• item". Quem organiza o texto depois (`organizarDescricao`)
 * entende essas marcas.
 */
export function htmlParaTextoEstruturado(html: string): string {
  const t = html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi, (_, c: string) => `\n\n## ${textoCurto(c)}\n`)
    .replace(/<(p|div)[^>]*>\s*(?:<br\s*\/?>\s*)*<(strong|b)[^>]*>([\s\S]*?)<\/\2>\s*(?:<br\s*\/?>\s*)*<\/\1>/gi, (inteiro, _bloco, _negrito, c: string) => {
      const titulo = textoCurto(c);
      return titulo.length > 0 && titulo.length <= 90 ? `\n\n## ${titulo}\n` : inteiro;
    })
    .replace(/<li[^>]*>/gi, "\n• ")
    .replace(/<\/li>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|ul|ol|table|tr|section|article|blockquote)>/gi, "\n\n");
  return htmlParaTexto(t);
}

/** Markdown (anúncios do GitHub) para texto com as mesmas marcas de `htmlParaTextoEstruturado`. */
export function markdownParaTextoEstruturado(md: string): string {
  const t = md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/^#{1,6}\s*(.+)$/gm, "\n\n## $1\n")
    .replace(/^\s*(?:\*\*|__)([^*_\n]{2,80}?):?(?:\*\*|__):?\s*$/gm, "\n\n## $1\n")
    .replace(/^\s*[-*+]\s+/gm, "• ")
    .replace(/^\s*\d+[.)]\s+/gm, "• ")
    .replace(/(\*\*|__|\*|_|`)/g, "");
  return htmlParaTexto(t);
}
