import { normalizar } from "../../extrair-habilidades";
import { interpretarLocal } from "../../localizacao";
import { PREFIXO_CARREIRA } from "../../rotulos";
import { pedirJson } from "../http";
import { pareceDeTI } from "../normalizar";
import { escritoEmEspanhol } from "../idioma";
import { dataOuNull, ehBancoDeTalentos, htmlParaTexto, textoOuVazio, urlSegura } from "../texto";
import type { FonteExterna, VagaExterna } from "../tipos";

/**
 * Páginas de carreiras de empresas que usam Greenhouse, Lever ou Ashby. As três oferecem uma API PÚBLICA e
 * documentada, feita justamente para mostrar as vagas da empresa em outros sites: sem chave e sem cadastro.
 * Cada vaga vem direto da empresa e o botão leva à página dela.
 *
 * Cada empresa é uma fonte separada (`carreira:plataforma:id`). Assim, se a página de uma empresa falhar, só as
 * vagas dela ficam como estão; as outras empresas seguem atualizando e nada é apagado por engano.
 */
export type Plataforma = "greenhouse" | "lever" | "ashby";
export type Empresa = {
  plataforma: Plataforma;
  id: string;
  nome: string;
  /** Empresa de tecnologia, onde toda vaga é da área (os setores dela não têm nomes úteis). */
  soTecnologia?: boolean;
  /** Empresa estrangeira: "Remote" sem país não vale; só entra vaga que cita o Brasil ou um lugar brasileiro. */
  exigeBrasil?: boolean;
};

/**
 * Empresas brasileiras (ou com muitas vagas no Brasil) de tecnologia e finanças. O `id` é o nome na
 * página de carreiras: boards.greenhouse.io/ID, jobs.lever.co/ID, jobs.ashbyhq.com/ID.
 * Para incluir outra, descubra em qual plataforma ela publica e acrescente uma linha.
 */
export const EMPRESAS: Empresa[] = [
  { plataforma: "greenhouse", id: "stone", nome: "Stone" },
  { plataforma: "greenhouse", id: "btgpactual", nome: "BTG Pactual" },
  { plataforma: "greenhouse", id: "c6bank", nome: "C6 Bank" },
  { plataforma: "greenhouse", id: "inter", nome: "Inter" },
  { plataforma: "greenhouse", id: "xpinc", nome: "XP Inc." },
  { plataforma: "greenhouse", id: "quintoandar", nome: "QuintoAndar" },
  { plataforma: "greenhouse", id: "agibank", nome: "Agibank" },
  { plataforma: "greenhouse", id: "arcoeducacao", nome: "Arco Educação" },
  { plataforma: "greenhouse", id: "gympass", nome: "Wellhub" },
  { plataforma: "greenhouse", id: "ebanx", nome: "EBANX" },
  { plataforma: "greenhouse", id: "vtex", nome: "VTEX" },
  { plataforma: "greenhouse", id: "wildlifestudios", nome: "Wildlife Studios" },
  { plataforma: "greenhouse", id: "rdstation", nome: "RD Station" },
  { plataforma: "greenhouse", id: "bancopan", nome: "Banco Pan" },
  { plataforma: "greenhouse", id: "getnet", nome: "Getnet" },
  { plataforma: "lever", id: "ciandt", nome: "CI&T", soTecnologia: true },
  { plataforma: "lever", id: "bv", nome: "Banco BV" },
  { plataforma: "lever", id: "neon", nome: "Neon" },
  { plataforma: "ashby", id: "nubank", nome: "Nubank" },
  // Empresas estrangeiras com vagas no Brasil (só as que citam o Brasil)
  { plataforma: "greenhouse", id: "braze", nome: "Braze", exigeBrasil: true },
  { plataforma: "greenhouse", id: "brex", nome: "Brex", exigeBrasil: true },
  { plataforma: "greenhouse", id: "datadog", nome: "Datadog", exigeBrasil: true },
  { plataforma: "greenhouse", id: "airbnb", nome: "Airbnb", exigeBrasil: true },
  { plataforma: "greenhouse", id: "databricks", nome: "Databricks", exigeBrasil: true },
  { plataforma: "greenhouse", id: "gitlab", nome: "GitLab", exigeBrasil: true },
  { plataforma: "greenhouse", id: "figma", nome: "Figma", exigeBrasil: true },
  { plataforma: "greenhouse", id: "adyen", nome: "Adyen", exigeBrasil: true },
  { plataforma: "greenhouse", id: "turing", nome: "Turing", exigeBrasil: true },
  { plataforma: "greenhouse", id: "mongodb", nome: "MongoDB", exigeBrasil: true },
  { plataforma: "greenhouse", id: "coinbase", nome: "Coinbase", exigeBrasil: true },
  { plataforma: "greenhouse", id: "binance", nome: "Binance", exigeBrasil: true },
  { plataforma: "greenhouse", id: "elastic", nome: "Elastic", exigeBrasil: true },
  { plataforma: "greenhouse", id: "twilio", nome: "Twilio", exigeBrasil: true },
  { plataforma: "greenhouse", id: "stripe", nome: "Stripe", exigeBrasil: true },
  { plataforma: "greenhouse", id: "payoneer", nome: "Payoneer", exigeBrasil: true },
  { plataforma: "greenhouse", id: "thoughtworks", nome: "Thoughtworks", exigeBrasil: true },
  { plataforma: "lever", id: "dlocal", nome: "dLocal", exigeBrasil: true },
  { plataforma: "ashby", id: "snowflake", nome: "Snowflake", exigeBrasil: true },
  { plataforma: "ashby", id: "amplitude", nome: "Amplitude", exigeBrasil: true },
];

const NOME_DA_PLATAFORMA: Record<Plataforma, string> = { greenhouse: "Greenhouse", lever: "Lever", ashby: "Ashby" };

const ENDERECO: Record<Plataforma, (id: string) => string> = {
  greenhouse: (id) => `https://boards-api.greenhouse.io/v1/boards/${id}/jobs?content=true`,
  lever: (id) => `https://api.lever.co/v0/postings/${id}?mode=json`,
  ashby: (id) => `https://api.ashbyhq.com/posting-api/job-board/${id}`,
};

/** O texto cita o Brasil ou um lugar brasileiro (estado, capital, cidade conhecida)? */
function citaBrasil(local: string): boolean {
  return local
    .split(/\s*[;|]\s*/)
    .filter(Boolean)
    .some((p) => /\b(brasil|brazil)\b/.test(normalizar(p)) || interpretarLocal(p).uf !== "");
}

const PALAVRAS_SEM_LUGAR = /\b(remot[oa]|remote|hibrid[oa]|hybrid|home ?office|presencial|on-?site|anywhere|latam|america latina)\b/g;

/**
 * A vaga é no Brasil? Cita o Brasil ou um lugar brasileiro: sim. Fala só de modalidade ("Remoto", "Híbrido") ou
 * não diz nada: sim, porque as empresas da lista são brasileiras. Cita qualquer outro lugar ("Mexico City",
 * "Palo Alto", "Remote - US"): não.
 */
export function ehNoBrasil(local: string): boolean {
  if (citaBrasil(local)) return true;
  return normalizar(local).replace(PALAVRAS_SEM_LUGAR, "").replace(/[^a-z]/g, "") === "";
}

/** "Híbrido, São Paulo" → "São Paulo": a modalidade vai para o campo próprio, não para o nome da cidade. */
const semModalidade = (local: string) =>
  local
    .replace(/\b(h[ií]brid[oa]|remot[oa]|remote|hybrid|presencial|home ?office|on-?site)\b/gi, " ")
    .replace(/\s*[,/-]\s*(?=[,/-]|$)/g, "")
    .replace(/^\s*[,/-]\s*/, "")
    .replace(/\s+/g, " ")
    .trim();

/** Vale o local? Empresa estrangeira só com menção ao Brasil; empresa brasileira também quando só diz "Remoto". */
const localValido = (local: string, empresa: Empresa) => (empresa.exigeBrasil ? citaBrasil(local) : ehNoBrasil(local));

/** O melhor texto de local: entre vários separados por ";", o que é brasileiro. */
function melhorLocal(local: string): string {
  const partes = local.split(/\s*;\s*/).filter(Boolean);
  const escolhida =
    partes.find((p) => interpretarLocal(semModalidade(p)).uf !== "") ?? partes.find((p) => /\b(brasil|brazil)\b/.test(normalizar(p))) ?? partes[0] ?? "";
  return semModalidade(escolhida);
}

function modalidadeDoTexto(texto: string): VagaExterna["modalidade"] {
  const t = normalizar(texto);
  if (/\b(hibrid[oa]|hybrid)\b/.test(t)) return "hibrido";
  if (/\b(remot[oa]|remote|home ?office)\b/.test(t)) return "remoto";
  return undefined;
}

const SETOR_DE_TI = /\b(tecnologia|technology|engenharia|engineering|dados|data|ti|it|software|infraestrutura|plataformas?)\b/;

/**
 * Bancos e fintechs publicam TODAS as vagas na mesma página (crédito, RH, design...), então aqui o filtro é mais
 * rígido que nas outras fontes: só passa vaga com cargo de TI ou de um setor de tecnologia. Depois disso, a
 * triagem comum (`normalizarVaga`) ainda confere se é para iniciante e se o texto pede habilidades técnicas.
 */
export function ehDeTecnologia(v: { titulo: string; setor?: string }, empresa: Empresa): boolean {
  return empresa.soTecnologia === true || pareceDeTI(v.titulo) || SETOR_DE_TI.test(normalizar(v.setor ?? ""));
}

/** "[Job-32142] Developer Fullstack Jr" → "Developer Fullstack Jr" (código interno da empresa). */
const limparTitulo = (t: string) => t.replace(/^\s*\[[^\]]*\]\s*/, "").replace(/\s+/g, " ").trim();

/** O texto vem com as etiquetas escritas como texto ("&lt;p&gt;"): decodifica uma vez e só então tira as etiquetas. */
const descricaoDoGreenhouse = (html: string) => htmlParaTexto(htmlParaTexto(html));

type VagaGreenhouse = {
  id?: number;
  title?: string;
  absolute_url?: string;
  first_published?: string;
  updated_at?: string;
  application_deadline?: string | null;
  location?: { name?: string };
  departments?: { name?: string }[];
  content?: string;
};

export function converterGreenhouse(json: unknown, empresa: Empresa, agora: Date = new Date()): VagaExterna[] {
  const vagas = (json as { jobs?: VagaGreenhouse[] } | null)?.jobs;
  if (!Array.isArray(vagas)) return [];
  return vagas.flatMap((v) => {
    const link = urlSegura(v.absolute_url);
    const titulo = limparTitulo(htmlParaTexto(textoOuVazio(v.title)));
    const local = textoOuVazio(v.location?.name);
    if (v.id === undefined || !link || !titulo || !localValido(local, empresa)) return [];
    const prazo = dataOuNull(v.application_deadline);
    if (prazo && prazo.getTime() < agora.getTime()) return [];
    return [{
      origem: origemDaEmpresa(empresa),
      idExterno: String(v.id),
      titulo,
      empresa: empresa.nome,
      cidade: melhorLocal(local),
      descricao: descricaoDoGreenhouse(textoOuVazio(v.content)),
      link,
      publicadaEm: dataOuNull(v.first_published) ?? dataOuNull(v.updated_at),
      modalidade: modalidadeDoTexto(local),
      setor: (v.departments ?? []).map((d) => textoOuVazio(d.name)).filter(Boolean).join(" · "),
    }];
  });
}

type VagaLever = {
  id?: string;
  text?: string;
  hostedUrl?: string;
  createdAt?: number;
  country?: string;
  workplaceType?: string;
  descriptionPlain?: string;
  additionalPlain?: string;
  lists?: { text?: string; content?: string }[];
  categories?: { location?: string; commitment?: string; department?: string; team?: string; allLocations?: string[] };
};

const MODALIDADE_LEVER: Record<string, VagaExterna["modalidade"]> = { remote: "remoto", hybrid: "hibrido", "on-site": "presencial" };

export function converterLever(json: unknown, empresa: Empresa): VagaExterna[] {
  if (!Array.isArray(json)) return [];
  return (json as VagaLever[]).flatMap((v) => {
    const link = urlSegura(v.hostedUrl);
    const titulo = limparTitulo(textoOuVazio(v.text));
    const local = textoOuVazio(v.categories?.location);
    // O código do país ("BR") é mais confiável que o texto, que costuma vir só em inglês ("Brazil").
    const noBrasil = v.country ? v.country.toUpperCase() === "BR" : localValido(local, empresa);
    if (!v.id || !link || !titulo || !noBrasil) return [];

    const listas = (v.lists ?? []).map((l) => `${textoOuVazio(l.text)}\n${htmlParaTexto(textoOuVazio(l.content))}`).join("\n\n");
    const descricao = [textoOuVazio(v.descriptionPlain), listas, textoOuVazio(v.additionalPlain)].filter(Boolean).join("\n\n");
    const compromisso = textoOuVazio(v.categories?.commitment);
    return [{
      origem: origemDaEmpresa(empresa),
      idExterno: v.id,
      titulo,
      empresa: empresa.nome,
      cidade: melhorLocal(local) || "Brasil",
      descricao,
      link,
      publicadaEm: typeof v.createdAt === "number" ? dataOuNull(v.createdAt) : null,
      modalidade: MODALIDADE_LEVER[textoOuVazio(v.workplaceType)],
      setor: [textoOuVazio(v.categories?.department), textoOuVazio(v.categories?.team)].filter(Boolean).join(" · "),
      // "Intern", "Estágio"... é o que a empresa marcou como tipo de contrato.
      rotulos: compromisso ? [compromisso] : [],
    }];
  });
}

type VagaAshby = {
  id?: string;
  title?: string;
  location?: string;
  secondaryLocations?: { location?: string }[];
  publishedAt?: string;
  isListed?: boolean;
  isRemote?: boolean;
  workplaceType?: string;
  employmentType?: string;
  department?: string;
  team?: string;
  address?: { postalAddress?: { addressCountry?: string } };
  jobUrl?: string;
  descriptionPlain?: string;
};

const MODALIDADE_ASHBY: Record<string, VagaExterna["modalidade"]> = { remote: "remoto", hybrid: "hibrido", onsite: "presencial" };

export function converterAshby(json: unknown, empresa: Empresa): VagaExterna[] {
  const vagas = (json as { jobs?: VagaAshby[] } | null)?.jobs;
  if (!Array.isArray(vagas)) return [];
  return vagas.flatMap((v) => {
    const link = urlSegura(v.jobUrl);
    const titulo = limparTitulo(textoOuVazio(v.title));
    if (!v.id || !link || !titulo || v.isListed === false) return [];

    // Vale a vaga se algum dos locais é no Brasil. Sem lugar claro ("Remote"), o país do endereço decide.
    const locais = [textoOuVazio(v.location), ...(v.secondaryLocations ?? []).map((s) => textoOuVazio(s.location))].filter(Boolean);
    const pais = textoOuVazio(v.address?.postalAddress?.addressCountry);
    const noBrasil = locais.some(citaBrasil) || citaBrasil(pais) || (pais === "" && locais.some((l) => localValido(l, empresa)));
    if (!noBrasil) return [];

    const tipoDeContrato = textoOuVazio(v.employmentType);
    return [{
      origem: origemDaEmpresa(empresa),
      idExterno: v.id,
      titulo,
      empresa: empresa.nome,
      cidade: melhorLocal(locais.find((l) => interpretarLocal(l).uf !== "") ?? locais[0] ?? ""),
      descricao: textoOuVazio(v.descriptionPlain),
      link,
      publicadaEm: dataOuNull(v.publishedAt),
      modalidade: MODALIDADE_ASHBY[normalizar(textoOuVazio(v.workplaceType))] ?? (v.isRemote ? "remoto" : undefined),
      setor: [textoOuVazio(v.department), textoOuVazio(v.team)].filter(Boolean).join(" · "),
      rotulos: tipoDeContrato ? [tipoDeContrato] : [],
    }];
  });
}

export const origemDaEmpresa = (e: Empresa) => `${PREFIXO_CARREIRA}${e.plataforma}:${e.id}`;

export function converterDaEmpresa(json: unknown, empresa: Empresa, agora?: Date): VagaExterna[] {
  if (empresa.plataforma === "greenhouse") return converterGreenhouse(json, empresa, agora);
  if (empresa.plataforma === "lever") return converterLever(json, empresa);
  return converterAshby(json, empresa);
}

export function fonteDaEmpresa(empresa: Empresa): FonteExterna {
  return {
    origem: origemDaEmpresa(empresa),
    rotulo: `${empresa.nome} (${NOME_DA_PLATAFORMA[empresa.plataforma]})`,
    indisponivel: () => null,
    // A página de carreiras lista todas as vagas da empresa: se nenhuma serve, as que tínhamos já fecharam.
    listaCompleta: true,
    async buscar() {
      const json = await pedirJson(ENDERECO[empresa.plataforma](empresa.id));
      // Resposta fora do formato esperado é erro (e não "empresa sem vagas"), para não apagar vagas por engano.
      const formatoCerto = empresa.plataforma === "lever" ? Array.isArray(json) : Array.isArray((json as { jobs?: unknown } | null)?.jobs);
      if (!formatoCerto) throw new Error(`${empresa.nome}: resposta inesperada de ${NOME_DA_PLATAFORMA[empresa.plataforma]}`);
      return converterDaEmpresa(json, empresa).filter(
        (v) => ehDeTecnologia(v, empresa) && !escritoEmEspanhol(`${v.titulo} ${v.descricao.slice(0, 1500)}`) && !ehBancoDeTalentos(v.titulo),
      );
    },
  };
}

export const fontesDeCarreiras: FonteExterna[] = EMPRESAS.map(fonteDaEmpresa);
