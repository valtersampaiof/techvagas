import { normalizar } from "./extrair-habilidades";

export const ESTADOS: { uf: string; nome: string }[] = [
  { uf: "AC", nome: "Acre" }, { uf: "AL", nome: "Alagoas" }, { uf: "AP", nome: "Amapá" }, { uf: "AM", nome: "Amazonas" },
  { uf: "BA", nome: "Bahia" }, { uf: "CE", nome: "Ceará" }, { uf: "DF", nome: "Distrito Federal" }, { uf: "ES", nome: "Espírito Santo" },
  { uf: "GO", nome: "Goiás" }, { uf: "MA", nome: "Maranhão" }, { uf: "MT", nome: "Mato Grosso" }, { uf: "MS", nome: "Mato Grosso do Sul" },
  { uf: "MG", nome: "Minas Gerais" }, { uf: "PA", nome: "Pará" }, { uf: "PB", nome: "Paraíba" }, { uf: "PR", nome: "Paraná" },
  { uf: "PE", nome: "Pernambuco" }, { uf: "PI", nome: "Piauí" }, { uf: "RJ", nome: "Rio de Janeiro" }, { uf: "RN", nome: "Rio Grande do Norte" },
  { uf: "RS", nome: "Rio Grande do Sul" }, { uf: "RO", nome: "Rondônia" }, { uf: "RR", nome: "Roraima" }, { uf: "SC", nome: "Santa Catarina" },
  { uf: "SP", nome: "São Paulo" }, { uf: "SE", nome: "Sergipe" }, { uf: "TO", nome: "Tocantins" },
];

/** As 27 capitais: servem para entender "Renascença, Belo Horizonte" (bairro + cidade, sem estado). */
const CAPITAIS: { cidade: string; uf: string }[] = [
  { cidade: "Rio Branco", uf: "AC" }, { cidade: "Maceió", uf: "AL" }, { cidade: "Macapá", uf: "AP" }, { cidade: "Manaus", uf: "AM" },
  { cidade: "Salvador", uf: "BA" }, { cidade: "Fortaleza", uf: "CE" }, { cidade: "Brasília", uf: "DF" }, { cidade: "Vitória", uf: "ES" },
  { cidade: "Goiânia", uf: "GO" }, { cidade: "São Luís", uf: "MA" }, { cidade: "Cuiabá", uf: "MT" }, { cidade: "Campo Grande", uf: "MS" },
  { cidade: "Belo Horizonte", uf: "MG" }, { cidade: "Belém", uf: "PA" }, { cidade: "João Pessoa", uf: "PB" }, { cidade: "Curitiba", uf: "PR" },
  { cidade: "Recife", uf: "PE" }, { cidade: "Teresina", uf: "PI" }, { cidade: "Rio de Janeiro", uf: "RJ" }, { cidade: "Natal", uf: "RN" },
  { cidade: "Porto Alegre", uf: "RS" }, { cidade: "Porto Velho", uf: "RO" }, { cidade: "Boa Vista", uf: "RR" }, { cidade: "Florianópolis", uf: "SC" },
  { cidade: "São Paulo", uf: "SP" }, { cidade: "Aracaju", uf: "SE" }, { cidade: "Palmas", uf: "TO" },
];
const CAPITAL_POR_NOME = new Map(CAPITAIS.map((c) => [normalizar(c.cidade), c]));
/** "Zona Norte", "Zona Sul"... existem em várias cidades; sozinhas não dizem qual. */
const SO_ZONA = /^zona (norte|sul|leste|oeste|central)$/;

export type Local = {
  /** Nome da cidade como será exibido; vazio se não der para saber. */
  cidade: string;
  /** Sigla do estado (ex.: "PE"); vazio se não der para saber. */
  uf: string;
  /** A cidade sem acentos e em minúsculas, para buscar. */
  chave: string;
};

const POR_NOME = new Map(ESTADOS.map((e) => [normalizar(e.nome), e.uf]));
const SIGLAS = new Set(ESTADOS.map((e) => e.uf));
const PAISES = new Set(["brasil", "brazil", "br"]);

export function nomeDoEstado(uf: string): string {
  return ESTADOS.find((e) => e.uf === uf)?.nome ?? uf;
}

/** "Estado de São Paulo", "São Paulo" ou "SP" → "SP"; qualquer outra coisa → "". */
function ufDe(parte: string): string {
  const sigla = parte.trim().toUpperCase();
  // Sigla só vale se foi escrita em maiúsculas ("PE"), para "Pe" ou "se" não virarem estado por acaso.
  if (parte.trim() === sigla && SIGLAS.has(sigla)) return sigla;
  const nome = normalizar(parte).replace(/^estado (de|do|da) /, "").trim();
  return POR_NOME.get(nome) ?? "";
}

/**
 * Entende os formatos de localização das fontes: "Curitiba, Paraná", "São Paulo, Estado de São Paulo",
 * "Recife, PE", "Recife/PE", "Renascença, Belo Horizonte, Minas Gerais". Vagas só "Brasil" ou
 * remotas ficam sem cidade e sem estado.
 */
export function interpretarLocal(texto: string): Local {
  const vazio: Local = { cidade: "", uf: "", chave: "" };
  const t = (texto ?? "").trim();
  if (!t || /^remot[oa]/i.test(t)) return vazio;

  let partes = t.split(/\s*(?:,|\/| - )\s*/).filter(Boolean);
  while (partes.length > 0 && PAISES.has(normalizar(partes[partes.length - 1]).trim())) partes.pop();
  if (partes.length > 0 && SO_ZONA.test(normalizar(partes[partes.length - 1]).trim())) return vazio;
  if (partes.length === 0) return vazio;

  const ultima = partes[partes.length - 1];
  const uf = ufDe(ultima);
  if (uf) partes = partes.slice(0, -1);

  // "São Paulo" e "Rio de Janeiro" nomeiam estado e capital: sozinhos (ou só com o país), valem como a cidade.
  if (uf && partes.length === 0) {
    const capital = CAPITAL_POR_NOME.get(normalizar(ultima).trim());
    if (capital && capital.uf === uf) return { cidade: capital.cidade, uf, chave: normalizar(capital.cidade).trim() };
  }

  // Sem estado: se a última parte é uma capital ("Renascença, Belo Horizonte"), a cidade é ela.
  if (!uf) {
    const capital = CAPITAL_POR_NOME.get(normalizar(ultima).trim());
    if (capital) return { cidade: capital.cidade, uf: capital.uf, chave: normalizar(capital.cidade).trim() };
  }

  // Com bairro na frente, a cidade é a última parte que sobrou.
  const cidadeBruta = (uf ? partes[partes.length - 1] : partes[0]) ?? "";
  // Se o que sobrou é só o nome do estado ("Paraná"), não é uma cidade.
  if (!uf && ufDe(cidadeBruta) !== "") return { cidade: "", uf: ufDe(cidadeBruta), chave: "" };

  // Escreve o nome certo das capitais ("Brasilia" → "Brasília").
  const capital = CAPITAL_POR_NOME.get(normalizar(cidadeBruta).trim());
  const cidade = capital && (!uf || capital.uf === uf) ? capital.cidade : cidadeBruta;
  return { cidade, uf, chave: normalizar(cidade).trim() };
}

/** Colunas de localização já interpretadas, gravadas junto da vaga e usadas pelos filtros de cidade e estado. */
export function dadosDeLocalizacao(texto: string) {
  const l = interpretarLocal(texto);
  return { cidadeNome: l.cidade, uf: l.uf, cidadeChave: l.chave };
}

/**
 * A vaga é da região escolhida (estado e/ou cidade)? Usado para mostrar primeiro as vagas dali e só
 * depois as remotas de outros lugares. Sem estado nem cidade escolhidos, toda vaga serve.
 */
export function ehDaRegiao(vaga: { uf: string; cidadeNome: string }, uf?: string, cidade?: string): boolean {
  if (uf && vaga.uf !== uf) return false;
  const chave = cidade ? normalizar(cidade).trim() : "";
  if (chave && !normalizar(vaga.cidadeNome).includes(chave)) return false;
  return true;
}
