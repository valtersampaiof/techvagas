import Link from "next/link";
import type { Metadata } from "next";
import { COR_DA_ETAPA, ETAPAS, ROTULO_ETAPA, contarPorEtapa, ehEtapa } from "@/lib/candidaturas";
import { calcularCompatibilidade } from "@/lib/compatibilidade";
import { fonteDeVagas } from "@/lib/fonte-de-vagas";
import { vagasAcompanhadas } from "@/lib/salvas";
import { usuarioAtual } from "@/lib/sessao";
import { CartaoVaga } from "@/components/CartaoVaga";
import { EtapaDaVaga } from "@/components/EtapaDaVaga";

export const metadata: Metadata = { title: "Minhas vagas" };

export default async function PaginaDeVagasSalvas({ searchParams }: { searchParams: Promise<{ etapa?: string }> }) {
  const usuario = await usuarioAtual();

  if (!usuario) {
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="titulo-de-pagina">Minhas vagas</h1>
        <p className="mt-3 text-slate-600">Entre na sua conta para guardar vagas e acompanhar suas candidaturas.</p>
        <div className="mt-5 flex justify-center gap-3">
          <Link href="/entrar" className="btn-secundario">Entrar</Link>
          <Link href="/cadastrar" className="btn-primario">Criar conta</Link>
        </div>
      </div>
    );
  }

  const { etapa: etapaDaUrl } = await searchParams;
  const filtro = ehEtapa(etapaDaUrl) ? etapaDaUrl : null;

  const acompanhadas = await vagasAcompanhadas(usuario.id);
  const contagem = contarPorEtapa(acompanhadas);
  const visiveis = filtro ? acompanhadas.filter((a) => a.etapa === filtro) : acompanhadas;
  const vagas = await fonteDeVagas.porIds(visiveis.map((a) => a.vagaId));
  const porId = new Map(vagas.map((v) => [v.id, v]));
  const habilidades = usuario.habilidades.map((h) => ({ slug: h.habilidade.slug, nivel: h.nivel }));
  const encerradas = vagas.filter((v) => !v.ativa).length;

  const aba = "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-inset transition";

  return (
    <div>
      <h1 className="titulo-de-pagina">Minhas vagas</h1>
      <p className="mt-1 text-slate-600">
        As vagas que você guardou e o andamento de cada candidatura.{" "}
        <Link href="/alertas" className="font-medium text-indigo-700 hover:underline">Receber aviso por e-mail de vagas novas</Link>
      </p>

      {acompanhadas.length > 0 && (
        <nav aria-label="Filtrar por etapa" className="mt-5 flex flex-wrap gap-2">
          <Link href="/salvas" className={`${aba} ${filtro === null ? "bg-indigo-600 text-white ring-indigo-600" : "bg-white text-slate-700 ring-slate-200 hover:ring-indigo-300"}`}>
            Todas <span className="opacity-70">{acompanhadas.length}</span>
          </Link>
          {ETAPAS.map((e) => (
            <Link
              key={e}
              href={`/salvas?etapa=${e}`}
              aria-current={filtro === e ? "page" : undefined}
              className={`${aba} ${filtro === e ? "bg-indigo-600 text-white ring-indigo-600" : `${COR_DA_ETAPA[e]} hover:brightness-95`}`}
            >
              {ROTULO_ETAPA[e]} <span className="opacity-70">{contagem[e]}</span>
            </Link>
          ))}
        </nav>
      )}

      {encerradas > 0 && (
        <p className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-inset ring-rose-100">
          {encerradas === 1 ? "1 vaga salva não aparece mais" : `${encerradas} vagas salvas não aparecem mais`} na fonte e
          pode ter sido encerrada. Confirme no anúncio original antes de se candidatar.
        </p>
      )}

      {acompanhadas.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-slate-700">Você ainda não salvou nenhuma vaga.</p>
          <p className="mt-1 text-sm text-slate-500">Toque na estrela (☆) de uma vaga para guardá-la aqui, e depois marque em que pé está a candidatura.</p>
          <Link href="/vagas" className="btn-primario mt-4">Ver vagas</Link>
        </div>
      ) : visiveis.length === 0 ? (
        <p className="mt-8 text-center text-slate-500">Nenhuma vaga nesta etapa ainda.</p>
      ) : (
        <>
          <p className="mt-4 text-sm text-slate-600" aria-live="polite">{visiveis.length} vaga(s)</p>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            {visiveis.map((a) => {
              const vaga = porId.get(a.vagaId);
              if (!vaga) return null;
              return (
                <CartaoVaga
                  key={vaga.id}
                  vaga={vaga}
                  percentual={habilidades.length > 0 && vaga.requisitos.length > 0 ? calcularCompatibilidade(vaga.requisitos, habilidades).percentual : null}
                  salva
                  logado
                  rodape={<EtapaDaVaga vagaId={vaga.id} etapaInicial={a.etapa} anotacaoInicial={a.anotacao} />}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
