import Link from "next/link";
import type { Metadata } from "next";
import { fonteDeVagas } from "@/lib/fonte-de-vagas";
import { usuarioAtual } from "@/lib/sessao";
import { ajustarRegime } from "@/lib/tipos-de-vaga";
import { ROTULO_CONTRATO, ROTULO_TIPO } from "@/lib/rotulos";
import { RegimeENivel } from "@/components/RegimeENivel";

export const metadata: Metadata = {
  title: "Habilidades mais pedidas",
  description: "As habilidades que mais aparecem nos requisitos das vagas de TI, por regime, nível e área.",
};

type Parametros = { contrato?: string; tipo?: string; area?: string };

const MOSTRAR = 15;
/** Com poucas vagas, o ranking varia muito de um dia para o outro. */
const MINIMO_CONFIAVEL = 20;

const seletor = "campo sm:!w-auto";

/** "vagas pleno em CLT, de Dados" */
function descreverFiltros(contrato: string, tipo: string, area: string): string {
  const partes = [tipo ? `vagas de nível ${ROTULO_TIPO[tipo].toLowerCase()}` : "vagas de todos os níveis"];
  if (contrato) partes.push(`em ${ROTULO_CONTRATO[contrato]}`);
  if (area) partes.push(`na área de ${area}`);
  return partes.join(" ");
}

export default async function PaginaDeMercado({ searchParams }: { searchParams: Promise<Parametros> }) {
  const p = await searchParams;
  const [usuario, areas] = await Promise.all([usuarioAtual(), fonteDeVagas.areas()]);

  const regime = ajustarRegime(p.contrato ?? "", p.tipo ?? "");
  const area = areas.includes(p.area ?? "") ? p.area! : "";
  const resultado = await fonteDeVagas.habilidadesMaisPedidas({
    tipo: regime.tipo || undefined,
    contrato: regime.contrato || undefined,
    area: area || undefined,
  });

  const populares = resultado.habilidades.slice(0, MOSTRAR);
  const tenho = new Set(usuario?.habilidades.map((h) => h.habilidade.slug) ?? []);
  const temPerfil = tenho.size > 0;
  const dasDez = populares.slice(0, 10);
  const tenhoDasDez = dasDez.filter((h) => tenho.has(h.slug)).length;
  const pct = (parte: number) => Math.round((parte / resultado.vagasAnalisadas) * 100);

  return (
    <div>
      <h1 className="titulo-de-pagina">Habilidades mais pedidas</h1>
      <p className="mt-1 text-slate-600">
        O que mais aparece nos requisitos das vagas de TI. Escolha o seu regime, nível e área para ver o que estudar primeiro.
      </p>

      <form method="get" className="cartao mt-6 flex flex-wrap items-end gap-3 p-4">
        <RegimeENivel contratoInicial={regime.contrato} tipoInicial={regime.tipo} classeDoSeletor={seletor} />
        <select name="area" defaultValue={area} className={seletor} aria-label="Área">
          <option value="">Todas as áreas</option>
          {areas.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <button className="btn-primario">Ver</button>
        <Link href="/mercado" className="btn-secundario">Limpar</Link>
      </form>

      {resultado.vagasAnalisadas === 0 ? (
        <p className="mt-8 text-center text-slate-500">
          Nenhuma vaga com requisitos identificados para esses filtros. Tente tirar algum deles.
        </p>
      ) : (
        <>
          <p className="mt-6 text-sm text-slate-600" aria-live="polite">
            Analisamos <strong>{resultado.vagasAnalisadas.toLocaleString("pt-BR")}</strong>{" "}
            {descreverFiltros(regime.contrato, regime.tipo, area)}
            {resultado.totalDeVagas > resultado.vagasAnalisadas && ` (de ${resultado.totalDeVagas.toLocaleString("pt-BR")}; as outras não citam tecnologias no anúncio)`}.
          </p>
          {resultado.vagasAnalisadas < MINIMO_CONFIAVEL && (
            <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-inset ring-amber-100">
              São poucas vagas, então o ranking pode mudar bastante. Tente um filtro mais amplo para um resultado mais seguro.
            </p>
          )}

          {temPerfil ? (
            <p className="mt-3 rounded-xl bg-indigo-50 px-4 py-3 text-sm text-indigo-900 ring-1 ring-inset ring-indigo-100">
              Você já tem <strong>{tenhoDasDez} das {dasDez.length}</strong> habilidades mais pedidas aqui.
              {tenhoDasDez < dasDez.length && " As que faltam estão marcadas abaixo, com o caminho para os cursos."}
            </p>
          ) : (
            <p className="mt-3 rounded-xl bg-indigo-50 px-4 py-3 text-sm text-indigo-900 ring-1 ring-inset ring-indigo-100">
              {usuario ? (
                <>
                  <Link href="/perfil" className="font-semibold underline">Complete o seu perfil</Link> para ver quais dessas você já tem.
                </>
              ) : (
                <>
                  <Link href="/cadastrar" className="font-semibold underline">Crie sua conta</Link> e envie o currículo para ver quais dessas você já tem.
                </>
              )}
            </p>
          )}

          <ol className="mt-5 space-y-3">
            {populares.map((h, i) => {
              const largura = Math.max(3, pct(h.vagas));
              const falta = temPerfil && !tenho.has(h.slug);
              return (
                <li key={h.slug} className="cartao p-4">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-indigo-50 text-sm font-bold text-indigo-700">{i + 1}</span>
                    <h2 className="font-semibold">{h.nome}</h2>
                    {temPerfil && (
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${falta ? "bg-rose-50 text-rose-700 ring-rose-200" : "bg-emerald-50 text-emerald-700 ring-emerald-200"}`}>
                        {falta ? "✘ falta no seu perfil" : "✔ você tem"}
                      </span>
                    )}
                    <Link href={`/cursos?habilidade=${h.slug}`} className="ml-auto text-sm font-semibold text-indigo-700 hover:text-indigo-900">
                      Ver cursos →
                    </Link>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`${pct(h.vagas)}% das vagas`}>
                      <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" style={{ width: `${largura}%` }} />
                    </div>
                    <span className="w-14 text-right text-sm font-bold text-slate-800">{pct(h.vagas)}%</span>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-500">
                    Aparece em {h.vagas.toLocaleString("pt-BR")} {h.vagas === 1 ? "vaga" : "vagas"}
                    {h.obrigatorias > 0 ? `, e é obrigatória em ${h.obrigatorias.toLocaleString("pt-BR")}` : ", sempre como diferencial"}.
                  </p>
                </li>
              );
            })}
          </ol>

          <p className="mt-6 text-xs text-slate-500">
            Os requisitos são identificados automaticamente a partir do texto dos anúncios, então são uma estimativa. Os percentuais
            usam só as vagas que citam alguma tecnologia.
          </p>
        </>
      )}
    </div>
  );
}
