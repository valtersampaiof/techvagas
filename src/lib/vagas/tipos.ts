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
  /** Etiquetas da própria fonte (ex.: "Júnior", "Remoto"). */
  rotulos?: string[];
};

export interface FonteExterna {
  origem: string;
  rotulo: string;
  /** null se pode rodar; senão, o motivo (ex.: chave de acesso ausente). */
  indisponivel(): string | null;
  buscar(): Promise<VagaExterna[]>;
}
