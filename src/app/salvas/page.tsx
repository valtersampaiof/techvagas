import Link from "next/link";
import type { Metadata } from "next";
import { calcularCompatibilidade } from "@/lib/compatibilidade";
import { fonteDeVagas } from "@/lib/fonte-de-vagas";
import { idsDasVagasSalvas } from "@/lib/salvas";
import { usuarioAtual } from "@/lib/sessao";
import { CartaoVaga } from "@/components/CartaoVaga";

export const metadata: Metadata = { title: "Vagas salvas" };

export default async function PaginaDeVagasSalvas() {
  const usuario = await usuarioAtual();

  if (!usuario) {
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="text-2xl font-bold">Vagas salvas</h1>
        <p className="mt-3 text-slate-600">Entre na sua conta para guardar vagas e voltar a elas depois.</p>
        <div className="mt-5 flex justify-center gap-3">
          <Link href="/entrar" className="rounded-md border border-slate-300 px-4 py-2 hover:bg-slate-50">Entrar</Link>
          <Link href="/cadastrar" className="rounded-md bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700">Criar conta</Link>
        </div>
      </div>
    );
  }

  const vagas = await fonteDeVagas.porIds(await idsDasVagasSalvas(usuario.id));
  const habilidades = usuario.habilidades.map((h) => ({ slug: h.habilidade.slug, nivel: h.nivel }));
  const encerradas = vagas.filter((v) => !v.ativa).length;

  return (
    <div>
      <h1 className="text-2xl font-bold">Vagas salvas</h1>
      <p className="mt-1 text-sm text-slate-600">
        As vagas que você guardou, da mais recente para a mais antiga.{" "}
        <Link href="/alertas" className="font-medium text-indigo-700 underline">Receber aviso por e-mail de vagas novas</Link>
      </p>

      {encerradas > 0 && (
        <p className="mt-4 rounded-md bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {encerradas === 1 ? "1 vaga salva não aparece mais" : `${encerradas} vagas salvas não aparecem mais`} na fonte e
          pode ter sido encerrada. Confirme no anúncio original antes de se candidatar.
        </p>
      )}

      {vagas.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-slate-700">Você ainda não salvou nenhuma vaga.</p>
          <p className="mt-1 text-sm text-slate-500">Toque na estrela (☆) de uma vaga para guardá-la aqui.</p>
          <Link href="/vagas" className="mt-4 inline-block rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            Ver vagas
          </Link>
        </div>
      ) : (
        <>
          <p className="mt-4 text-sm text-slate-600" aria-live="polite">{vagas.length} vaga(s) salva(s)</p>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            {vagas.map((vaga) => (
              <CartaoVaga
                key={vaga.id}
                vaga={vaga}
                percentual={habilidades.length > 0 && vaga.requisitos.length > 0 ? calcularCompatibilidade(vaga.requisitos, habilidades).percentual : null}
                salva
                logado
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
