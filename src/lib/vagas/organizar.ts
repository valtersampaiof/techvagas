import { normalizar } from "../extrair-habilidades";
import { espacarFrases } from "./texto";

/**
 * Organiza o texto de um anúncio em seções legíveis (sobre a vaga, o que fazer, requisitos, diferenciais, benefícios...)
 * e tira dele os "fatos" que a pessoa procura primeiro: escolaridade, experiência, idiomas e certificações.
 *
 * O texto das fontes chega bagunçado. A Gupy, por exemplo, entrega um bloco só, sem etiquetas, com os títulos colados
 * na frase seguinte ("...atribuiçõesDesenvolver aplicações...") e os itens separados por ";" ou por "." sem espaço.
 * Esta função entende esse formato e também texto já marcado: linhas "## Título" são títulos e "• " abre um item.
 */
export type IdDaSecao = "sobre" | "responsabilidades" | "requisitos" | "comportamentais" | "diferenciais" | "beneficios" | "outras";

export type Secao = {
  id: IdDaSecao;
  /** Título para mostrar. Nas seções conhecidas é sempre o mesmo; nas "outras" é o do anúncio. */
  titulo: string;
  paragrafos: string[];
  itens: string[];
};

export type Fatos = {
  escolaridade: string[];
  experiencia: string[];
  idiomas: string[];
  certificacoes: string[];
  /** Ex.: "Vaga exclusiva para pessoas com deficiência". Vazio quando o anúncio não diz. */
  afirmativa: string;
};

export type DescricaoOrganizada = {
  secoes: Secao[];
  fatos: Fatos;
  /** Duas ou três frases curtas para o cartão da vaga: o que a pessoa vai fazer, não a propaganda da empresa. */
  resumo: string;
};

export const TITULO_DA_SECAO: Record<Exclude<IdDaSecao, "outras">, string> = {
  sobre: "Sobre a vaga e a empresa",
  responsabilidades: "O que você vai fazer",
  requisitos: "Requisitos",
  comportamentais: "Perfil comportamental",
  diferenciais: "Diferenciais",
  beneficios: "Benefícios",
};

const ORDEM: IdDaSecao[] = ["sobre", "responsabilidades", "requisitos", "comportamentais", "diferenciais", "beneficios", "outras"];
const COM_LISTA = new Set<IdDaSecao>(["responsabilidades", "requisitos", "comportamentais", "diferenciais", "beneficios"]);

// Cada categoria casa com o INÍCIO do título, já sem acento e em minúsculas.
const CATEGORIAS: { id: IdDaSecao; regex: RegExp }[] = [
  { id: "diferenciais", regex: /^(diferenciais?|desejaveis?|desejavel|opcionais?|sera (considerado )?(um )?diferencial|nice[ -]to[ -]have|bonus|o que aumenta (suas|as suas) chances|conhecimentos desejaveis|preferred|a plus|bonus points)\b/ },
  { id: "comportamentais", regex: /^(competencias comportamentais|perfil comportamental|soft skills|habilidades comportamentais|buscamos alguem|voce (e|sera) (uma pessoa|alguem))\b/ },
  { id: "responsabilidades", regex: /^(responsabilidades|atribuicoes|atividades|principais (atividades|responsabilidades)|o que (voce|vc) (vai|ira|fara|devera)|suas atividades|no dia a dia|como sera (o )?(seu )?dia a dia|quais (serao|sao) (as )?(suas )?(responsabilidades|atividades)|suas responsabilidades|what you.ll (do|be responsible)|what you will do|what you.ll be doing|you.ll be responsible|you will be responsible|key responsibilities|responsibilities|your role|day to day|sua missao|o que fara)\b/ },
  { id: "requisitos", regex: /^(requisitos|qualificacoes|pre[- ]?requisitos|o que (esperamos|buscamos|procuramos|precisamos|voce precisa)|perfil( da vaga| desejado)?$|conhecimentos|competencias tecnicas|habilidades tecnicas|requirements|required|qualifications|what you.ll bring|what you bring|what we.re looking for|what we are looking for|we are looking for|who you are|must[ -]have|obrigatorios|para essa oportunidade|o que voce precisa|perfil que buscamos)\b/ },
  { id: "beneficios", regex: /^(beneficios|nossos beneficios|o que oferecemos|oferecemos|pacote de beneficios|perks|benefits|what we offer|por aqui voce tera|o que voce (tera|recebe|ganha))\b/ },
  { id: "sobre", regex: /^(sobre (a|o|nos)\b|quem somos|descricao da vaga|a vaga$|a oportunidade|about|nossa cultura|nossa historia|nossos valores|o time (do|da|de)|nosso time|a empresa$)/ },
  { id: "outras", regex: /^(informacoes adicionais|outras informacoes|etapas do processo|processo seletivo|como funciona|local de trabalho|jornada|horario|modelo\/local|regime)\b/ },
];

/** Títulos fixos do modelo da Gupy: podem estar colados à frase seguinte, em qualquer ponto do texto. */
const TITULOS_DO_MODELO =
  /(Responsabilidades e atribui[çc][õo]es|Requisitos e qualifica[çc][õo]es|Informa[çc][õo]es adicionais|Responsabilidades y atribuciones|Requisitos y calificaciones)/g;

/** Títulos comuns, aceitos colados só depois de pontuação ou no começo da linha, e seguidos de ":" ou de letra maiúscula. */
const TITULOS_COMUNS =
  /(?:^|(?<=[.;:!?)\n]))\s*(Requisitos(?: (?:obrigat[óo]rios|t[ée]cnicos|necess[áa]rios|desej[áa]veis))?|Requisitos e conhecimentos|Principais (?:responsabilidades|atividades|atribui[çc][õo]es)|Responsabilidades|Atividades|Seu dia a dia|O que voc[êe] vai fazer|O que esperamos de voc[êe]|Perfil da vaga|Por aqui voc[êe] ter[áa]|O que voc[êe] ter[áa]|Atribui[çc][õo]es|Qualifica[çc][õo]es|Pr[ée]-requisitos|Diferenciais|Benef[íi]cios|Nossos benef[íi]cios|O que oferecemos|Sobre a vaga|Sobre a empresa|Sobre n[óo]s|Quem somos|Descri[çc][ãa]o da vaga|Compet[êe]ncias comportamentais|Perfil comportamental|Conhecimentos desej[áa]veis|Nice to have|Requirements|Responsibilities|Qualifications|Benefits)(?=\s*:|\s*\n|[A-ZÀ-Ú•])\s*:?/g;

// Sem \s: o emoji não pode engolir a quebra de linha (e com ela o título da seção que vem na linha seguinte).
const EMOJI = /[ ]*\p{Extended_Pictographic}\uFE0F?[ ]*/gu;

function categoriaDe(titulo: string): IdDaSecao | null {
  const t = normalizar(titulo).replace(/[:?.]+$/, "").trim();
  if (!t) return null;
  // "Nosso pacote de Remuneração e Benefícios", "Our benefits include": qualquer título curto que cite benefícios.
  if (t.length <= 70 && /\bbenefi/.test(t) && !/^(requisitos|responsabilidades)/.test(t)) return "beneficios";
  return CATEGORIAS.find((c) => c.regex.test(t))?.id ?? null;
}

/** Texto limpo, com um título por linha ("## Título") e um item por linha ("• item"). */
function prepararLinhas(bruto: string): string[] {
  let t = bruto
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/[   ​‌‍﻿]/g, " ")
    .replace(/#+LI-[A-Za-z0-9]+/g, " ") // etiquetas internas de recrutadores ("#LI-Hybrid")
    .replace(/\r\n?/g, "\n")
    .replace(/[\t ]+/g, " ");

  // "neste timeEvolução da Plataforma": palavra comum colada na seguinte. Só mexe em palavra que COMEÇA em minúscula, para
  // não quebrar nomes como "JavaScript", "GitHub" ou "iPhone".
  t = t.replace(/(^|[\s(\[])([a-zà-ú]{3,})(?=[A-ZÀ-Ú][a-zà-ú])/g, "$1$2\n");

  // "Wellhub (Gympass)Meu Pet Club": item colado ao seguinte depois de um parêntese.
  t = t.replace(/\)(?=[A-ZÀ-Ú][a-zà-ú]{2})/g, ")\n");

  t = t.replace(TITULOS_DO_MODELO, "\n\n## $1\n").replace(TITULOS_COMUNS, "\n\n## $1\n");
  // Marcadores de lista: "•", emojis e hífens no começo da linha ou depois de ponto e vírgula/ponto.
  t = t
    .replace(/(^|\n)[ ]*[●▪◦‣▶►➤✔☑·][ ]*/g, "\n• ")
    .replace(/[ ]*•[ ]*/g, "\n• ")
    .replace(EMOJI, "\n• ")
    .replace(/(^|\n)[ ]*[-–—*][ ]+(?=\S)/g, "\n• ")
    .replace(/(?<=[;.:])[ ]*-[ ]+(?=[A-ZÀ-Ú])/g, "\n• ");

  const linhas: string[] = [];
  for (const crua of t.split("\n")) {
    // "• ## Título": um marcador de lista que sobrou na frente de um título.
    const linha = crua.replace(/[ ]+/g, " ").replace(/^•\s*(?=##\s)/, "").trim();
    if (!linha) {
      linhas.push("");
      continue;
    }
    linhas.push(linha);
  }
  return juntarQuebrasDeLargura(linhas);
}

/** Linhas quebradas no meio da frase ("...gestão de contratos e" / "processos de aquisição") voltam a ser uma só. */
function juntarQuebrasDeLargura(linhas: string[]): string[] {
  const saida: string[] = [];
  for (const linha of linhas) {
    const anterior = saida[saida.length - 1];
    const continua =
      anterior !== undefined && anterior !== "" && !anterior.startsWith("## ") && !linha.startsWith("• ") && !linha.startsWith("## ") &&
      linha !== "" && /^[a-zà-ú(]/.test(linha) && !/[.;:!?]$/.test(anterior);
    if (continua) saida[saida.length - 1] = `${anterior} ${linha}`;
    else saida.push(linha);
  }
  return saida;
}

const ABREVIATURAS = /(?:^|\s)(sr|sra|dr|dra|ex|etc|ltda|vs|obs|cia|ing|prof|aprox|min|max|tel|av|n[ºo])$/i;
const TOKEN_TECNICO_APOS_PONTO = /^(js|net|ts|jsx|tsx|io|py|rb|com|org|br|gov|edu)\b/i;

/**
 * Quebra um trecho em frases ou itens. ";" separa sempre. "." "!" "?" separam quando a frase seguinte vem COLADA
 * ("...disponibilidade.Atuar na...") ou, se `porFrase`, também quando vem depois de um espaço. Não quebra depois de
 * abreviaturas ("Sr.", "etc."), de letra ou número solto ("S.A", "2.") nem em nomes como "Node.JS".
 */
function quebrarEmItens(trecho: string, porFrase: boolean): string[] {
  const itens: string[] = [];
  let inicio = 0;
  for (const m of trecho.matchAll(/[;.!?]+/g)) {
    const fim = m.index! + m[0].length;
    const resto = trecho.slice(fim);
    if (resto.trim() === "") break;
    const antes = trecho.slice(inicio, m.index!);
    let separa = false;
    if (m[0].includes(";")) separa = true;
    else {
      const colado = /^[A-ZÀ-Ú•]/.test(resto);
      const comEspaco = /^\s+[A-ZÀ-Ú•]/.test(resto);
      const abreviatura = ABREVIATURAS.test(antes) || /(?:^|\s)[A-Za-zÀ-ú\d]$/.test(antes);
      const nomeTecnico = colado && TOKEN_TECNICO_APOS_PONTO.test(resto);
      const depoisDeLetra = /[a-zà-ú)\d%"”]$/.test(antes);
      separa = !abreviatura && !nomeTecnico && depoisDeLetra && (colado || (porFrase && comEspaco));
    }
    if (separa) {
      itens.push(trecho.slice(inicio, fim).trim());
      inicio = fim;
    }
  }
  if (trecho.slice(inicio).trim()) itens.push(trecho.slice(inicio).trim());
  return itens;
}

const MANTER_PONTO_FINAL = /(?:^|\s)(etc|ltda|sr|sra|dr|dra|inc|corp|s\.a|cia)\.$/i;

/** Item de lista: sem ponto e vírgula e sem o ponto final (frase curta de lista não precisa dele). */
const limparItem = (s: string) => {
  const t = s.replace(/^[;.\s•-]+|[;\s]+$/g, "").replace(/\s+/g, " ").trim();
  return t.endsWith(".") && !MANTER_PONTO_FINAL.test(t) && !/\w\.\w+\.$/.test(t) ? t.slice(0, -1).trimEnd() : t;
};
/** Parágrafo: mantém a pontuação, só tira o que sobrou de marcador no começo. */
const limparParagrafo = (s: string) => espacarFrases(s.replace(/^[;.\s•-]+/, "").replace(/\s+/g, " ").trim());

/** "Jornada de Trabalho:06h diárias" → "Jornada de Trabalho: 06h diárias". */
const espacarRotulo = (s: string) => s.replace(/^([A-ZÀ-Ú][^:]{2,40}:)(?=\S)/, "$1 ");

type Construcao = { id: IdDaSecao; titulo: string; linhas: string[] };

function dividirEmSecoes(linhas: string[]): Construcao[] {
  const secoes: Construcao[] = [];
  let atual: Construcao = { id: "sobre", titulo: TITULO_DA_SECAO.sobre, linhas: [] };

  const abrir = (titulo: string, id: IdDaSecao | null) => {
    secoes.push(atual);
    const categoria = id ?? "outras";
    atual = { id: categoria, titulo: categoria === "outras" ? titulo.replace(/[:?]+$/, "").trim() : TITULO_DA_SECAO[categoria], linhas: [] };
  };

  for (const linha of linhas) {
    if (/^##\s*$/.test(linha)) continue; // título vazio
    if (linha.startsWith("## ")) {
      const titulo = linha.slice(3).trim();
      abrir(titulo, categoriaDe(titulo));
      continue;
    }
    // Rótulo de sub-seção no meio do texto: "Diferenciais:", "DESEJÁVEIS", "O que aumenta suas chances?", "Nossos benefícios:Vale..."
    const semMarcador = linha.startsWith("• ") ? linha.slice(2) : linha;
    const rotulo = semMarcador.match(/^([^:?]{3,60})([:?])\s*(.*)$/);
    const soRotulo = semMarcador.length <= 70 && (/[:?]$/.test(semMarcador) || (/^[A-ZÀ-Ú0-9 /&-]{4,}$/.test(semMarcador) && !linha.startsWith("• ")));
    if (soRotulo || rotulo) {
      const titulo = soRotulo ? semMarcador.replace(/[:?]+$/, "") : rotulo![1];
      const categoria = categoriaDe(titulo);
      // Só vira seção nova se for de uma categoria diferente da atual e conhecida (não quebra "Requisitos Obrigatórios:" dentro de Requisitos).
      if (categoria && categoria !== atual.id && ["diferenciais", "comportamentais", "beneficios", "responsabilidades"].includes(categoria)) {
        abrir(titulo, categoria);
        if (!soRotulo && rotulo![3]) atual.linhas.push(rotulo![3]);
        continue;
      }
      if (categoria && categoria === atual.id && categoria !== "outras") {
        if (!soRotulo && rotulo![3]) atual.linhas.push(rotulo![3]);
        continue; // repete o título da seção atual (ex.: "Requisitos:" logo depois de "Requisitos e qualificações")
      }
    }
    atual.linhas.push(linha);
  }
  secoes.push(atual);
  return secoes;
}

function montar(c: Construcao): Secao {
  const paragrafos: string[] = [];
  const itens: string[] = [];
  const lista = COM_LISTA.has(c.id);

  // Em benefícios e informações adicionais os itens costumam vir colados ("Seguro de VidaApoio ao falecimento"). Aqui não há
  // nomes como "JavaScript", então dá para separar palavra Capitalizada colada em outra.
  const separarColados = c.id === "beneficios" || c.id === "outras";
  const linhas = separarColados
    ? c.linhas.flatMap((l) => l.replace(/([A-ZÀ-Ú]?[a-zà-ú]{3,})(?=[A-ZÀ-Ú][a-zà-ú]{2,})/g, "$1\n").split("\n"))
    : c.linhas;

  for (const linha of linhas) {
    if (!linha) continue;
    const ehItem = linha.startsWith("• ");
    const texto = ehItem ? linha.slice(2) : linha;
    if (ehItem || lista) {
      for (const parte of quebrarEmItens(texto, lista)) {
        const item = espacarRotulo(limparItem(parte));
        if (item.length >= 2 && /[\p{L}\d]/u.test(item)) itens.push(item);
      }
    } else if (c.id === "outras" && texto.length <= 250) {
      for (const parte of quebrarEmItens(texto, false)) {
        const item = espacarRotulo(limparItem(parte));
        if (item.length >= 2 && /[\p{L}\d]/u.test(item)) itens.push(item);
      }
    } else {
      const p = limparParagrafo(texto);
      if (p.length >= 3 && /[\p{L}\d]/u.test(p)) paragrafos.push(p);
    }
  }
  return { id: c.id, titulo: c.titulo, paragrafos, itens: [...new Set(itens)].slice(0, 40) };
}

/** Parágrafo grande e sem quebras (comum em resumos curtos de fontes como a Adzuna): divide a cada 2 ou 3 frases. */
function repartirTextoCorrido(paragrafo: string): string[] {
  if (paragrafo.length < 420) return [paragrafo];
  const frases = paragrafo.split(/(?<=[.!?])\s+(?=[A-ZÀ-Ú])/);
  const saida: string[] = [];
  let atual = "";
  for (const f of frases) {
    atual = atual ? `${atual} ${f}` : f;
    if (atual.length >= 220) {
      saida.push(atual);
      atual = "";
    }
  }
  if (atual) saida.push(atual);
  return saida;
}

const ESCOLARIDADE =
  /\b(ensino (fundamental|medio|tecnico|superior)|graduacao|bacharel(ado)?|licenciatura|tecnologo|pos[- ]?graduacao|mestrado|doutorado|mba|curso (tecnico|superior)|formacao (superior|tecnica|em|academica)|cursando|formad[oa]|superior (completo|incompleto|cursando)|nivel (superior|tecnico|medio)|segundo grau|2[ºo] grau|escolaridade|graduando|graduado)\b/;
const EXPERIENCIA =
  /(\b\d{1,2}\s*\+?\s*(a\s*\d{1,2}\s*)?(anos?|years?)\b|\bsem experiencia\b|\bexperiencia (previa|minima|comprovada|solida|anterior|profissional|na area|em (mercado|campo))\b|\bnao (e|sera) (necessari[oa]|exigid[oa])\b|\bexperience (is )?(required|preferred)\b)/;
const IDIOMAS = /\b(ingles|english|espanhol|spanish|frances|bilingue|fluente|fluencia|idiomas?)\b/;
const CERTIFICACOES = /\b(certificacoes?|certificado|certified|certification|pmp|itil|cissp|ceh|ccna|ccnp|aws certified|az-\d{3}|scrum master certificad[oa]|psm|csm)\b/;
const AFIRMATIVA = /(exclusiv[ao] (para )?(pessoas? com defici[eê]ncia|pcd)|vaga afirmativa|afirmativa (para|pcd)|somente (para )?pcd|pessoas negras|mulheres (cis|trans)?)/i;

const aparar = (s: string, limite = 220) => (s.length <= limite ? s : `${s.slice(0, limite).replace(/\s+\S*$/, "")}…`);

function achar(unidades: string[], regex: RegExp, maximo: number): string[] {
  const vistos = new Set<string>();
  const saida: string[] = [];
  for (const u of unidades) {
    if (regex.test(normalizar(u)) && !vistos.has(u)) {
      vistos.add(u);
      saida.push(aparar(u));
      if (saida.length >= maximo) break;
    }
  }
  return saida;
}

function extrairFatos(secoes: Secao[], textoTodo: string): Fatos {
  const doTexto = (ids: IdDaSecao[]) =>
    secoes.filter((s) => ids.includes(s.id)).flatMap((s) => [...s.itens, ...s.paragrafos.flatMap((p) => p.split(/(?<=[.;!?])\s+/))]);
  const preferidas = doTexto(["requisitos", "diferenciais", "comportamentais"]);
  // Na falta de seção de requisitos, vale o resto do texto, menos benefícios e informações logísticas (ali "certificado",
  // "curso" e "idiomas" falam de bolsa de estudo, não de exigência).
  const todas = doTexto(["sobre", "responsabilidades", "requisitos", "diferenciais", "comportamentais"]);

  const buscar = (regex: RegExp, maximo: number, soDosRequisitos = false) => {
    const nas = achar(preferidas, regex, maximo);
    return nas.length > 0 || soDosRequisitos ? nas : achar(todas, regex, maximo);
  };
  const afirmativa = textoTodo.match(AFIRMATIVA)?.[0] ?? "";
  return {
    escolaridade: buscar(ESCOLARIDADE, 3),
    experiencia: buscar(EXPERIENCIA, 3),
    idiomas: buscar(IDIOMAS, 2),
    certificacoes: buscar(CERTIFICACOES, 2, true),
    afirmativa: afirmativa ? aparar(afirmativa.charAt(0).toUpperCase() + afirmativa.slice(1), 80) : "",
  };
}

/** O que mostrar no cartão: as primeiras atividades da vaga (não a propaganda da empresa) ou, sem elas, o primeiro parágrafo. */
const COMECA_COM_VERBO = /^[A-ZÀ-Ú][a-zà-ú]{2,}(ar|er|ir|or)\b/;

function criarResumo(secoes: Secao[]): string {
  const atividades = secoes.find((s) => s.id === "responsabilidades")?.itens ?? [];
  // Atividades de verdade começam com verbo no infinitivo ("Gerenciar compras", "Desenvolver APIs"); frases de efeito não.
  const comVerbo = atividades.filter((a) => COMECA_COM_VERBO.test(a));
  const escolhidas = (comVerbo.length > 0 ? comVerbo : atividades).slice(0, 3).map((a) => aparar(a, 110));
  const texto = escolhidas.length > 0 ? escolhidas.join(" · ") : secoes.flatMap((s) => s.paragrafos)[0] ?? secoes.flatMap((s) => s.itens)[0] ?? "";
  return aparar(texto, 280);
}

export function organizarDescricao(bruto: string): DescricaoOrganizada {
  const textoTodo = bruto ?? "";
  const construcoes = dividirEmSecoes(prepararLinhas(textoTodo));
  const montadas = construcoes.map(montar).filter((s) => s.paragrafos.length > 0 || s.itens.length > 0);

  // Junta seções repetidas da mesma categoria (ex.: dois "Informações adicionais" ficam como duas "outras", as demais se juntam).
  const juntas: Secao[] = [];
  for (const s of montadas) {
    const igual = s.id !== "outras" ? juntas.find((j) => j.id === s.id) : juntas.find((j) => j.id === "outras" && j.titulo === s.titulo);
    if (igual) {
      igual.paragrafos.push(...s.paragrafos);
      igual.itens = [...new Set([...igual.itens, ...s.itens])];
    } else juntas.push({ ...s });
  }
  for (const s of juntas) s.paragrafos = s.paragrafos.flatMap(repartirTextoCorrido);

  const secoes = ORDEM.flatMap((id) => juntas.filter((s) => s.id === id));
  return { secoes, fatos: extrairFatos(secoes, textoTodo), resumo: criarResumo(secoes) };
}

/** O texto sem marcadores, para busca e para sites que só mostram texto corrido. */
export function textoSimples(bruto: string): string {
  return bruto
    .replace(/^## /gm, "")
    .replace(/^• /gm, "")
    .replace(/\n{2,}/g, "\n\n")
    .trim();
}

/** Lê com segurança o JSON guardado no banco; devolve null se estiver vazio ou fora do formato. */
export function lerDescricaoOrganizada(json: string | null | undefined): DescricaoOrganizada | null {
  if (!json) return null;
  try {
    const d = JSON.parse(json) as DescricaoOrganizada;
    if (!Array.isArray(d.secoes) || typeof d.fatos !== "object" || d.fatos === null) return null;
    // Textos guardados por versões antigas do organizador podem ter sinais soltos ("##") no lugar de itens.
    const comTexto = (t: string) => /[\p{L}\d]/u.test(t);
    for (const secao of d.secoes) {
      secao.itens = (secao.itens ?? []).filter(comTexto);
      secao.paragrafos = (secao.paragrafos ?? []).filter(comTexto);
    }
    return d;
  } catch {
    return null;
  }
}
