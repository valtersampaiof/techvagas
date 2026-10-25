import { randomBytes } from "node:crypto";
import { nomeDoEstado } from "./localizacao";
import { ROTULO_TIPO } from "./rotulos";
import { SALARIOS_MINIMOS } from "./filtros-de-vagas";
import { formatarReais } from "./formatar";

export type FiltrosDoAlerta = {
  uf: string;
  cidade: string;
  incluirRemotas: boolean;
  tipo: string;
  area: string;
  salarioMinimo: number | null;
};

export const MAX_ALERTAS_POR_PESSOA = 10;

/** Código secreto e impossível de adivinhar para o link "cancelar este alerta". */
export function gerarToken(): string {
  return randomBytes(24).toString("base64url");
}

export function temAlgumFiltro(f: Pick<FiltrosDoAlerta, "uf" | "cidade" | "tipo" | "area" | "salarioMinimo">): boolean {
  return !!(f.uf || f.cidade || f.tipo || f.area || f.salarioMinimo);
}

/** "Estágios em Recife (PE)", "Vagas em Pernambuco, de Dados", "Vagas a partir de R$ 2.000 por mês"... */
export function nomeDoAlerta(f: FiltrosDoAlerta): string {
  const tipo = f.tipo === "estagio" ? "Estágios" : f.tipo === "trainee" ? "Trainees" : f.tipo === "junior" ? "Vagas júnior" : "Vagas";
  const partes: string[] = [tipo];
  if (f.cidade) partes.push(`em ${f.cidade}${f.uf ? ` (${f.uf})` : ""}`);
  else if (f.uf) partes.push(`em ${nomeDoEstado(f.uf)}`);
  if (f.area) partes.push(`de ${f.area}`);
  if (f.salarioMinimo) partes.push(`a partir de ${formatarReais(f.salarioMinimo)} por mês`);
  return partes.join(" ");
}

/** Descrição curta dos filtros, para a lista de alertas. */
export function resumoDosFiltros(f: FiltrosDoAlerta): string {
  const itens: string[] = [];
  if (f.uf) itens.push(`estado: ${nomeDoEstado(f.uf)}`);
  if (f.cidade) itens.push(`cidade: ${f.cidade}`);
  if (f.tipo) itens.push(`tipo: ${ROTULO_TIPO[f.tipo] ?? f.tipo}`);
  if (f.area) itens.push(`área: ${f.area}`);
  if (f.salarioMinimo) itens.push(`salário a partir de ${formatarReais(f.salarioMinimo)}`);
  if (f.uf || f.cidade) itens.push(f.incluirRemotas ? "com vagas remotas" : "sem vagas remotas");
  return itens.join(" · ");
}

/** O mesmo filtro como endereço da lista de vagas, para o botão "ver todas" do e-mail. */
export function parametrosDaLista(f: FiltrosDoAlerta): string {
  const q = new URLSearchParams();
  if (f.uf) q.set("uf", f.uf);
  if (f.cidade) q.set("cidade", f.cidade);
  if (f.tipo) q.set("tipo", f.tipo);
  if (f.area) q.set("area", f.area);
  if (f.salarioMinimo && (SALARIOS_MINIMOS as readonly number[]).includes(f.salarioMinimo)) q.set("salario", String(f.salarioMinimo));
  if ((f.uf || f.cidade) && !f.incluirRemotas) q.set("somenteRegiao", "1");
  return q.toString();
}
