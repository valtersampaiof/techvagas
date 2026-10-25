import { normalizar } from "./extrair-habilidades";

/** Salário ou bolsa em reais POR MÊS. */
export type Salario = {
  min: number;
  /** Vazio em "a partir de R$ X". */
  max: number | null;
  /** "fonte": a fonte informou o valor num campo próprio. "texto": identificamos no texto do anúncio. */
  origem: "fonte" | "texto";
};

// Faixa plausível para um salário/bolsa MENSAL de quem está começando. Fora dela, o valor quase certamente é
// erro (hora, ano, centavos) ou outra coisa (valor de empresa, de apólice...), e é melhor não mostrar nada.
const MENSAL_MINIMO = 300;
const MENSAL_MAXIMO = 30_000;
const plausivel = (v: number) => Number.isFinite(v) && v >= MENSAL_MINIMO && v <= MENSAL_MAXIMO;

/** "1.800,00" → 1800; "1800" → 1800; "1.800" → 1800; "3,4" → 3.4; o que não for número → null. */
export function numeroBrasileiro(texto: string): number | null {
  const t = texto.trim();
  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(t)) return Number(t.replace(/\./g, "").replace(",", "."));
  if (/^\d+(,\d{1,2})?$/.test(t)) return Number(t.replace(",", "."));
  return null;
}

const VALOR = String.raw`R\$\s*(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:,\d{1,2})?)`;
// Sem \b no começo de propósito: a Gupy entrega o texto com palavras coladas ("adicionaisBolsa auxílio"). O código
// abaixo aceita a palavra colada só se ela começar com maiúscula, para não pegar o meio de outras palavras.
const PALAVRA_DE_SALARIO = /(bolsa(?:[- ]aux[ií]lio)?|sal[aá]rios?|remunera[cç][aã]o|pr[oó]-?labore)\b/gi;
// O mesmo "R$" aparece em benefícios; ao chegar numa destas palavras, o que vem depois não é o salário.
const PALAVRA_DE_BENEFICIO =
  /\b(vale|refei[cç][aã]o|alimenta[cç][aã]o|transporte|benef[ií]cios?|plano|seguro|assist[eê]ncia|gympass|wellhub|kit|ajuda de custo|b[oô]nus|plr|participa[cç][aã]o|aux[ií]lio[- ](creche|educa[cç][aã]o|home|sa[uú]de|transporte|alimenta)|carga hor[aá]ria|hor[aá]rio|informa[cç][oõ]es adicionais)\b/i;
const JANELA_APOS_PALAVRA = 220;
const MAX_VALORES = 4;

type Unidade = "mes" | "ano" | "hora";

/** Lê a unidade logo depois de um valor ("/mês", "por hora", "anual"). Sem indicação, é mensal. */
function unidadeApos(texto: string, fim: number): Unidade {
  const depois = normalizar(texto.slice(fim, fim + 16));
  if (/^\s*(\/|por |a |p\/)\s*(h\b|hora)/.test(depois)) return "hora";
  if (/^\s*(\/|por |a )\s*ano|^\s*anua/.test(depois) || /^\s*(brutos? )?anua/.test(depois)) return "ano";
  return "mes";
}

function paraMensal(valor: number, unidade: Unidade): number | null {
  if (unidade === "hora") return null;
  return unidade === "ano" ? Math.round(valor / 12) : valor;
}

function resumir(valores: number[], aPartirDe: boolean): Salario | null {
  const bons = valores.filter(plausivel);
  if (bons.length === 0) return null;
  const min = Math.min(...bons);
  const max = Math.max(...bons);
  return { min, max: aPartirDe ? null : max, origem: "texto" };
}

/**
 * Procura bolsa/salário no texto de um anúncio. Só vale o valor que vem logo depois de "bolsa", "salário"
 * ou "remuneração" (e antes de qualquer benefício como vale-refeição), ou o que vem seguido de "de bolsa".
 * Várias faixas ("1º ano... 2º ano...", "20h... 30h...") viram um intervalo.
 */
export function extrairSalarioDoTexto(texto: string): Salario | null {
  if (!texto) return null;

  for (const palavra of texto.matchAll(PALAVRA_DE_SALARIO)) {
    const anterior = texto[palavra.index! - 1];
    const colada = anterior !== undefined && /\p{L}/u.test(anterior);
    if (colada && palavra[0][0] === palavra[0][0].toLowerCase()) continue; // "mochilabolsa": meio de palavra
    const inicio = palavra.index! + palavra[0].length;
    const janela = texto.slice(inicio, inicio + JANELA_APOS_PALAVRA);
    const valores: number[] = [];
    let cursor = 0;
    let aPartirDe = false;
    let horaOuInvalido = false;

    for (const m of janela.matchAll(new RegExp(VALOR, "g"))) {
      const entre = janela.slice(cursor, m.index!);
      if (PALAVRA_DE_BENEFICIO.test(entre)) break;
      if (valores.length === 0) aPartirDe = /\b(a partir de|minimo de)\s*$/.test(normalizar(entre));

      const numero = numeroBrasileiro(m[1]);
      cursor = m.index! + m[0].length;
      if (numero === null) continue;
      const mensal = paraMensal(numero, unidadeApos(janela, cursor));
      if (mensal === null) {
        horaOuInvalido = true;
        break;
      }
      valores.push(mensal);
      if (valores.length === MAX_VALORES) break;
    }
    if (horaOuInvalido) continue;
    const resultado = resumir(valores, aPartirDe);
    if (resultado) return resultado;
  }

  // "R$ 1.500,00 de bolsa" / "R$ 1.800 de salário": o valor vem antes da palavra.
  const antes = new RegExp(`${VALOR}\\s*(?:/\\s*m[eê]s)?\\s*(?:de|em|a titulo de|a título de)?\\s*(?:bolsa(?:[- ]aux[ií]lio)?|sal[aá]rio)`, "i").exec(texto);
  if (antes) {
    const numero = numeroBrasileiro(antes[1]);
    if (numero !== null) {
      const mensal = paraMensal(numero, unidadeApos(texto, antes.index + antes[0].indexOf(antes[1]) + antes[1].length));
      if (mensal !== null) return resumir([mensal], false);
    }
  }
  return null;
}

/**
 * Para campos que já são só o valor ("R$ 2.000 - R$ 3.000 por mês"), como o `salary` do Jooble.
 * Dispensa a palavra "salário", mas continua descartando hora e valores implausíveis.
 */
export function lerCampoDeSalario(campo: string | null | undefined): Salario | null {
  if (!campo) return null;
  const valores: number[] = [];
  let unidade: Unidade = "mes";
  for (const m of campo.matchAll(new RegExp(VALOR, "g"))) {
    const numero = numeroBrasileiro(m[1]);
    if (numero !== null) valores.push(numero);
    unidade = unidadeApos(campo, m.index! + m[0].length) === "mes" ? unidade : unidadeApos(campo, m.index! + m[0].length);
  }
  if (/\b(hora|hour|\/h)\b/i.test(campo)) unidade = "hora";
  if (/\b(ano|year|anual|annual)\b/i.test(campo) && unidade === "mes") unidade = "ano";
  const mensais = valores.map((v) => paraMensal(v, unidade)).filter((v): v is number => v !== null);
  const r = resumir(mensais, false);
  return r ? { ...r, origem: "fonte" } : null;
}

/**
 * Para fontes com valores em campos próprios (Adzuna: mínimo e máximo, em geral ANUAIS). Converte para mensal e
 * descarta o que for implausível (ex.: "168", que provavelmente é valor por hora).
 */
export function salarioDeCamposDaFonte(
  min: number | null | undefined,
  max: number | null | undefined,
  periodo: "mes" | "ano",
): Salario | null {
  const valores = [min, max]
    .filter((n): n is number => typeof n === "number" && n > 0)
    .map((n) => (periodo === "ano" ? Math.round(n / 12) : Math.round(n)));
  const r = resumir(valores, false);
  return r ? { ...r, origem: "fonte" } : null;
}
