import Link from "next/link";
import type { Metadata } from "next";
import { alternarAlerta, criarAlerta, removerAlerta } from "@/app/acoes";
import { MAX_ALERTAS_POR_PESSOA, parametrosDaLista, resumoDosFiltros } from "@/lib/alertas";
import { db } from "@/lib/db";
import { emailConfigurado } from "@/lib/email";
import { SALARIOS_MINIMOS } from "@/lib/filtros-de-vagas";
import { fonteDeVagas } from "@/lib/fonte-de-vagas";
import { formatarPublicacao } from "@/lib/formatar";
import { usuarioAtual } from "@/lib/sessao";
import { ehFiltroDeContrato, ehTipoDeVaga } from "@/lib/tipos-de-vaga";
import { FormularioDeAlerta } from "@/components/FormularioDeAlerta";

export const metadata: Metadata = { title: "Alertas por e-mail" };

type Parametros = { uf?: string; cidade?: string; tipo?: string; contrato?: string; area?: string; salario?: string; somenteRegiao?: string };

export default async function PaginaDeAlertas({ searchParams }: { searchParams: Promise<Parametros> }) {
  const usuario = await usuarioAtual();

  if (!usuario) {
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="text-2xl font-bold">Alertas por e-mail</h1>
        <p className="mt-3 text-slate-600">Entre na sua conta para receber aviso de vagas novas na sua cidade.</p>
        <div className="mt-5 flex justify-center gap-3">
          <Link href="/entrar" className="rounded-md border border-slate-300 px-4 py-2 hover:bg-slate-50">Entrar</Link>
          <Link href="/cadastrar" className="rounded-md bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700">Criar conta</Link>
        </div>
      </div>
    );
  }

  const p = await searchParams;
  const [alertas, areas] = await Promise.all([
    db.alerta.findMany({ where: { usuarioId: usuario.id }, orderBy: { id: "desc" } }),
    fonteDeVagas.areas(),
  ]);

  // Valores iniciais do formulário, vindos da lista de vagas; qualquer coisa fora das opções é ignorada.
  const inicial = {
    uf: p.uf?.toUpperCase() ?? "",
    cidade: p.cidade?.slice(0, 80) ?? "",
    tipo: ehTipoDeVaga(p.tipo) ? p.tipo : "",
    contrato: ehFiltroDeContrato(p.contrato) ? p.contrato : "",
    area: areas.includes(p.area ?? "") ? p.area! : "",
    salarioMinimo: (SALARIOS_MINIMOS as readonly number[]).includes(Number(p.salario)) ? String(p.salario) : "",
    incluirRemotas: !p.somenteRegiao,
  };

  return (
    <div>
      <h1 className="text-2xl font-bold">Alertas por e-mail</h1>
      <p className="mt-1 text-sm text-slate-600">
        Receba um e-mail em <strong>{usuario.email}</strong> quando o site achar vagas <strong>novas</strong> que combinam com o que
        você procura. Você pode ter até {MAX_ALERTAS_POR_PESSOA} alertas e cancelar quando quiser (cada e-mail traz o link para isso).
      </p>

      {!emailConfigurado() && (
        <p className="mt-4 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong>Atenção:</strong> este servidor ainda não tem o envio de e-mails configurado. Seus alertas ficam guardados, mas
          nenhum e-mail é enviado até quem administra o site configurar o SMTP (veja o README).
        </p>
      )}

      <h2 className="mt-6 text-lg font-bold">Novo alerta</h2>
      <div className="mt-2">
        <FormularioDeAlerta acao={criarAlerta} areas={areas} inicial={inicial} />
      </div>

      <h2 className="mt-8 text-lg font-bold">Seus alertas ({alertas.length})</h2>
      {alertas.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">Você ainda não tem nenhum alerta.</p>
      ) : (
        <ul className="mt-2 space-y-3">
          {alertas.map((a) => {
            const consulta = parametrosDaLista(a);
            return (
              <li key={a.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {a.nome}{" "}
                      <span className={`ml-1 rounded-full px-2 py-0.5 text-xs font-medium ${a.ativo ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"}`}>
                        {a.ativo ? "Ativo" : "Pausado"}
                      </span>
                    </p>
                    <p className="text-sm text-slate-600">{resumoDosFiltros(a)}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {a.ultimoEnvioEm ? `Último e-mail enviado ${formatarPublicacao(a.ultimoEnvioEm)}.` : "Ainda não enviou nenhum e-mail."}{" "}
                      <Link href={`/vagas${consulta ? `?${consulta}` : ""}`} className="font-medium text-indigo-700 underline">
                        Ver as vagas de hoje com estes filtros
                      </Link>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <form action={alternarAlerta.bind(null, a.id)}>
                      <button className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">
                        {a.ativo ? "Pausar" : "Reativar"}
                      </button>
                    </form>
                    <form action={removerAlerta.bind(null, a.id)}>
                      <button className="rounded-md border border-rose-300 px-3 py-1.5 text-sm text-rose-700 hover:bg-rose-50">Excluir</button>
                    </form>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
