import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { calcularCompatibilidade, melhoresGratuitos, recomendarCursos, type Lacuna } from "@/lib/compatibilidade";
import { listarCursosCandidatos } from "@/lib/cursos";
import { fonteDeVagas } from "@/lib/fonte-de-vagas";
import { ROTULO_NIVEL, ehNivel } from "@/lib/niveis";
import { formatarPublicacao, formatarSalario } from "@/lib/formatar";
import { ROTULO_MODALIDADE, ROTULO_TIPO, rotuloDaOrigem, rotuloDoLocal } from "@/lib/rotulos";
import { idsDasVagasSalvas } from "@/lib/salvas";
import { usuarioAtual } from "@/lib/sessao";
import { BotaoSalvar } from "@/components/BotaoSalvar";
import { CartaoCurso } from "@/components/CartaoCurso";
import { RequisitoComCursos } from "@/components/RequisitoComCursos";
import { SeloCompatibilidade } from "@/components/SeloCompatibilidade";

type Props = { params: Promise<{ id: string }> };

async function carregarVaga(idTexto: string) {
  const id = Number(idTexto);
  return Number.isInteger(id) ? fonteDeVagas.obter(id) : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const vaga = await carregarVaga((await params).id);
  return { title: vaga ? vaga.titulo : "Vaga não encontrada" };
}

const listaEmPortugues = new Intl.ListFormat("pt-BR", { style: "long", type: "conjunction" });
const rotuloNivel = (n: string) => (ehNivel(n) ? ROTULO_NIVEL[n] : n);

export default async function PaginaDaVaga({ params }: Props) {
  const vaga = await carregarVaga((await params).id);
  if (!vaga) notFound();

  const usuario = await usuarioAtual();
  const habilidades = usuario?.habilidades.map((h) => ({ slug: h.habilidade.slug, nivel: h.nivel })) ?? [];
  const logado = usuario !== null;
  const temPerfil = habilidades.length > 0;

  const salva = usuario ? (await idsDasVagasSalvas(usuario.id)).includes(vaga.id) : false;
  const semRequisitos = vaga.requisitos.length === 0;
  const salario = formatarSalario(vaga);
  const publicacao = formatarPublicacao(vaga.publicadaEm);
  const compat = calcularCompatibilidade(vaga.requisitos, habilidades);
  const cursos = await listarCursosCandidatos();
  // Sem perfil, mostramos cursos para todos os requisitos da vaga.
  const lacunas: Lacuna[] = compat.lacunas;
  const rec = recomendarCursos(lacunas, cursos);

  // Mini quadro de cursos gratuitos de cada requisito (aparece ao passar o mouse no nome da habilidade).
  const cursosDoQuadro = new Map(
    vaga.requisitos.map((r) => {
      const nivelAtual = habilidades.find((h) => h.slug === r.slug)?.nivel ?? null;
      const gratuitos = melhoresGratuitos(cursos, r, nivelAtual).map((c) => ({
        id: c.id,
        titulo: c.titulo,
        instituicao: c.instituicao,
        link: c.link,
        cargaHoraria: c.cargaHoraria,
        certificado: c.certificado,
      }));
      return [r.slug, gratuitos] as const;
    }),
  );

  return (
    <div className="space-y-8">
      <Link href="/vagas" className="text-sm text-indigo-700 hover:underline">← Voltar para as vagas</Link>

      <header className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{vaga.titulo}</h1>
            <p className="text-slate-600">{vaga.empresa} · {rotuloDoLocal(vaga)}</p>
          </div>
          <div className="flex items-center gap-3">
            {temPerfil && !semRequisitos && <SeloCompatibilidade percentual={compat.percentual} />}
            <BotaoSalvar vagaId={vaga.id} salvaInicial={salva} logado={logado} variante="completo" />
          </div>
        </div>
        {!vaga.ativa && (
          <p className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800">
            <strong>Possivelmente encerrada.</strong> Esta vaga não apareceu mais na fonte. Confirme no anúncio original antes de
            se candidatar.
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="rounded bg-indigo-50 px-2 py-1 text-indigo-700">{ROTULO_TIPO[vaga.tipo] ?? vaga.tipo}</span>
          <span className="rounded bg-slate-100 px-2 py-1">{ROTULO_MODALIDADE[vaga.modalidade] ?? vaga.modalidade}</span>
          <span className="rounded bg-slate-100 px-2 py-1">{vaga.area}</span>
        </div>
        {salario && (
          <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            <strong>💰 {salario}</strong>
            <span className="block text-xs text-emerald-800">
              {vaga.salarioOrigem === "texto"
                ? "Valor identificado no texto do anúncio. Confira na vaga original (pode variar por semestre, carga horária ou cidade)."
                : "Valor informado pela fonte do anúncio. Confira na vaga original."}
            </span>
          </p>
        )}
        <p className="mt-4 whitespace-pre-line text-slate-700">{vaga.descricao}</p>
        {vaga.origem === "exemplo" ? (
          <p className="mt-3 text-xs text-amber-700">Vaga fictícia, criada apenas para demonstração.</p>
        ) : (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {vaga.link && (
              <a
                href={vaga.link}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Ver vaga e candidatar-se ↗
              </a>
            )}
            <p className="text-xs text-slate-500">
              Fonte: {rotuloDaOrigem(vaga.origem)}
              {publicacao && ` · publicada ${publicacao}`}. Os requisitos foram
              identificados automaticamente pelo texto do anúncio; confira os detalhes na vaga original.
            </p>
          </div>
        )}
      </header>

      {semRequisitos ? (
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-bold">O que a vaga pede</h2>
          <p className="mt-2 text-sm text-slate-700">
            O resumo deste anúncio não cita tecnologias específicas, então <strong>não calculamos compatibilidade</strong>{" "}
            nem indicamos cursos para esta vaga. Abra a vaga original para ver os requisitos completos.
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Enquanto isso, veja o <Link href="/cursos" className="font-medium text-indigo-700 underline">catálogo de cursos</Link>{" "}
            para fortalecer o que costuma ser pedido em vagas de {vaga.area === "TI em geral" ? "TI" : vaga.area.toLowerCase()}.
          </p>
        </section>
      ) : (
      <section>
        <h2 className="text-lg font-bold">O que a vaga pede</h2>
        {!logado && (
          <p className="mt-2 rounded-md bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
            <Link href="/entrar" className="font-semibold underline">Entre</Link> ou{" "}
            <Link href="/cadastrar" className="font-semibold underline">crie sua conta</Link> para ver o que você já tem e o que falta.
          </p>
        )}
        {logado && !temPerfil && (
          <p className="mt-2 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Seu perfil está sem habilidades. <Link href="/perfil" className="font-semibold underline">Envie seu currículo</Link>{" "}
            para comparar com esta vaga.
          </p>
        )}
        <p className="mt-3 text-xs text-slate-500">
          Dica: passe o mouse (ou toque) no nome de uma habilidade para ver cursos gratuitos dela, sem sair desta página.
        </p>
        <ul className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {vaga.requisitos.map((r) => {
            const lacuna = compat.lacunas.find((l) => l.slug === r.slug);
            const tem = temPerfil && !lacuna;
            return (
              <li key={r.slug} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <span>
                  <RequisitoComCursos nome={r.nome} slug={r.slug} cursos={cursosDoQuadro.get(r.slug) ?? []} /> · nível{" "}
                  {rotuloNivel(r.nivelMinimo).toLowerCase()}{" "}
                  <span className="text-slate-500">({r.obrigatorio ? "obrigatório" : "desejável"})</span>
                </span>
                {temPerfil && (
                  <span className={tem ? "font-semibold text-emerald-700" : "font-semibold text-rose-700"}>
                    {tem
                      ? "✔ você tem"
                      : lacuna?.situacao === "nivel_abaixo"
                        ? `✘ seu nível: ${rotuloNivel(lacuna.nivelAtual ?? "").toLowerCase()}`
                        : "✘ falta"}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      )}

      {!semRequisitos && lacunas.length > 0 && (
        <section>
          <h2 className="text-lg font-bold">
            {temPerfil ? "Cursos para chegar lá" : "Cursos para os requisitos desta vaga"}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Para cada ponto {temPerfil ? "que falta" : "pedido"}, uma opção gratuita e uma paga (quando existem). Confira
            preço e certificado no site da instituição.
          </p>

          {rec.maisUteis.length > 0 && (
            <div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50 p-4">
              <h3 className="text-sm font-semibold text-indigo-900">Atalho: um curso, várias lacunas</h3>
              <ul className="mt-2 space-y-1 text-sm text-indigo-900">
                {rec.maisUteis.map(({ curso, lacunasCobertas }) => (
                  <li key={curso.id}>
                    <a href={curso.link} target="_blank" rel="noopener noreferrer" className="font-medium underline">
                      {curso.titulo}
                    </a>{" "}
                    ({curso.gratuito ? "gratuito" : "pago"}) — cobre {listaEmPortugues.format(lacunasCobertas)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-6 space-y-6">
            {rec.porLacuna.map(({ lacuna, melhorGratuito, melhorPago }) => (
              <div key={lacuna.slug}>
                <h3 className="font-semibold">
                  {lacuna.nome}{" "}
                  <span className="text-sm font-normal text-slate-500">
                    · nível {rotuloNivel(lacuna.nivelMinimo).toLowerCase()}
                  </span>
                </h3>
                {melhorGratuito || melhorPago ? (
                  <div className="mt-2 grid gap-3 md:grid-cols-2">
                    {melhorGratuito && <CartaoCurso curso={melhorGratuito} destaque="Opção gratuita" />}
                    {melhorPago && <CartaoCurso curso={melhorPago} destaque="Opção paga" />}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">Ainda não temos curso para este nível. Veja o <Link href="/cursos" className="underline">catálogo</Link>.</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {temPerfil && !semRequisitos && lacunas.length === 0 && (
        <p className="rounded-md bg-emerald-50 px-4 py-3 text-emerald-800">
          Você cobre todos os requisitos desta vaga. Bom momento para se candidatar!
        </p>
      )}
    </div>
  );
}
