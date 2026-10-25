import type { PrismaClient } from "@prisma/client";
import { calcularCompatibilidade } from "./compatibilidade";
import { montarEmailDoAlerta } from "./alertas-email";
import type { Enviador, MensagemDeEmail } from "./email";
import { criarFonteDeVagas } from "./fonte-de-vagas";
import { normalizarDatasDeDescoberta } from "./vagas/datas-antigas";

export type ResultadoDoAlerta = {
  alertaId: number;
  nome: string;
  para: string;
  situacao: "enviado" | "simulado" | "sem-novas" | "erro";
  novas: number;
  detalhe?: string;
};

type Opcoes = {
  db: PrismaClient;
  /** Quem de fato manda o e-mail. Sem ele (ou com `simular`), nada é enviado nem marcado como enviado. */
  enviar?: Enviador;
  simular?: boolean;
  enderecoDoSite: string;
  /** Chamado com cada e-mail na simulação, para mostrar o que seria enviado. */
  aoSimular?: (mensagem: MensagemDeEmail) => void;
  /** Pausa entre e-mails (os provedores limitam a velocidade). */
  pausaMs?: number;
};

const dormir = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Para cada alerta ativo, procura vagas que o site achou DEPOIS do último envio (ou da criação do alerta) e
 * manda um e-mail com elas. O momento do último envio só é atualizado se o e-mail saiu: se o envio falhar,
 * as mesmas vagas entram na próxima tentativa, e nenhuma se perde nem se repete.
 */
export async function enviarAlertas(opcoes: Opcoes): Promise<ResultadoDoAlerta[]> {
  const { db, enderecoDoSite, simular = !opcoes.enviar, pausaMs = 300 } = opcoes;
  await normalizarDatasDeDescoberta(db);
  const fonte = criarFonteDeVagas(db);
  const alertas = await db.alerta.findMany({
    where: { ativo: true },
    include: { usuario: { include: { habilidades: { include: { habilidade: { select: { slug: true } } } } } } },
    orderBy: { id: "asc" },
  });

  const resultados: ResultadoDoAlerta[] = [];
  for (const alerta of alertas) {
    const base = { alertaId: alerta.id, nome: alerta.nome, para: alerta.usuario.email };
    // O instante é guardado ANTES da busca: vaga achada durante o envio entra no próximo, em vez de se perder.
    const instante = new Date();
    try {
      const vagas = await fonte.listar({
        uf: alerta.uf || undefined,
        cidade: alerta.cidade || undefined,
        somenteRegiao: !alerta.incluirRemotas,
        tipo: alerta.tipo || undefined,
        area: alerta.area || undefined,
        salarioMinimo: alerta.salarioMinimo ?? undefined,
        descobertasDepoisDe: alerta.ultimoEnvioEm ?? alerta.criadoEm,
      });
      if (vagas.length === 0) {
        resultados.push({ ...base, situacao: "sem-novas", novas: 0 });
        continue;
      }

      const habilidades = alerta.usuario.habilidades.map((h) => ({ slug: h.habilidade.slug, nivel: h.nivel }));
      const comCompatibilidade = vagas.map((v) => ({
        ...v,
        compatibilidade:
          habilidades.length > 0 && v.requisitos.length > 0 ? calcularCompatibilidade(v.requisitos, habilidades).percentual : null,
      }));
      const mensagem = montarEmailDoAlerta({
        nomeDaPessoa: alerta.usuario.nome,
        para: alerta.usuario.email,
        alerta,
        vagas: comCompatibilidade,
        enderecoDoSite,
      });

      if (simular || !opcoes.enviar) {
        opcoes.aoSimular?.(mensagem);
        resultados.push({ ...base, situacao: "simulado", novas: vagas.length });
        continue;
      }
      await opcoes.enviar(mensagem);
      await db.alerta.update({ where: { id: alerta.id }, data: { ultimoEnvioEm: instante } });
      resultados.push({ ...base, situacao: "enviado", novas: vagas.length });
      await dormir(pausaMs);
    } catch (e) {
      resultados.push({ ...base, situacao: "erro", novas: 0, detalhe: e instanceof Error ? e.message : String(e) });
    }
  }
  return resultados;
}
