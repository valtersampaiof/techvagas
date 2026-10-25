const reais = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

/** "R$ 1.500" (com espaço comum, para não quebrar em testes e leitores de tela). */
export function formatarReais(valor: number): string {
  return reais.format(valor).replace(/ /g, " ");
}

/** "R$ 1.500 a R$ 2.000 por mês", "R$ 1.800 por mês", "a partir de R$ 1.000 por mês"; sem valor, null. */
export function formatarSalario(v: { salarioMin: number | null; salarioMax: number | null }): string | null {
  if (v.salarioMin === null) return null;
  if (v.salarioMax === null) return `a partir de ${formatarReais(v.salarioMin)} por mês`;
  if (v.salarioMax === v.salarioMin) return `${formatarReais(v.salarioMin)} por mês`;
  return `${formatarReais(v.salarioMin)} a ${formatarReais(v.salarioMax)} por mês`;
}

const DIA_MS = 24 * 60 * 60 * 1000;

/** "hoje", "ontem", "há 5 dias", "há 3 semanas"; mais de 8 semanas, a data. Sem data, null. */
export function formatarPublicacao(data: Date | null, agora: Date = new Date()): string | null {
  if (!data) return null;
  const dias = Math.floor((agora.getTime() - data.getTime()) / DIA_MS);
  if (dias <= 0) return "hoje"; // inclui datas no futuro por diferença de relógio
  if (dias === 1) return "ontem";
  if (dias < 14) return `há ${dias} dias`;
  if (dias < 57) return `há ${Math.floor(dias / 7)} semanas`;
  return `em ${data.toLocaleDateString("pt-BR")}`;
}
