import type { Salario } from "../salario";
import type { Contrato } from "../tipos-de-vaga";

/** Vaga como veio da fonte, já em texto simples, antes de ser classificada. */
export type VagaExterna = {
  origem: string;
  /** Identificador estável da vaga dentro da fonte. */
  idExterno: string;
  titulo: string;
  empresa: string;
  cidade: string;
  /** Texto simples (sem HTML nem Markdown). */
  descricao: string;
  link: string;
  publicadaEm: Date | null;
  modalidade?: "remoto" | "hibrido" | "presencial";
  /** Como a pessoa é contratada, quando a própria fonte informa (senão o texto do anúncio é analisado). */
  contrato?: Contrato;
  /** Setor ou departamento da empresa (ex.: "Engenharia & Tecnologia"), quando a fonte informa. */
  setor?: string;
  /** Etiquetas da própria fonte (ex.: "Júnior", "Remoto"). */
  rotulos?: string[];
  /** Salário informado pela própria fonte em campo próprio, já convertido para mensal. */
  salario?: Salario | null;
};

export interface FonteExterna {
  origem: string;
  rotulo: string;
  /** null se pode rodar; senão, o motivo (ex.: chave de acesso ausente). */
  indisponivel(): string | null;
  /**
   * A fonte devolve TODAS as vagas atuais de um lugar (como a página de carreiras de uma empresa). Nesse caso, mesmo
   * que nenhuma sirva (nenhuma vaga de TI), as que ela tinha antes saem do site. Nas outras fontes, um resultado sem
   * nada aproveitável é tratado como falha e nada é apagado.
   */
  listaCompleta?: boolean;
  buscar(): Promise<VagaExterna[]>;
}
