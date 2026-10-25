/** Opções fixas dos filtros da lista de vagas (usadas na tela, na leitura da URL e nos alertas). */
export const PUBLICACOES: Record<string, string> = {
  "1": "Últimas 24 horas",
  "3": "Últimos 3 dias",
  "7": "Últimos 7 dias",
  "30": "Últimos 30 dias",
};

export const SALARIOS_MINIMOS = [800, 1000, 1500, 2000, 3000, 4000, 6000, 8000, 10000, 15000, 20000] as const;
