import { lerDescricaoOrganizada, organizarDescricao, type DescricaoOrganizada, type Secao } from "@/lib/vagas/organizar";

type Props = {
  /** JSON guardado no banco (`detalhes`). Vazio nas vagas antigas: nesse caso o texto simples é organizado na hora. */
  detalhes: string;
  descricao: string;
};

const LIMITE_PARA_RECOLHER = 450;

function Itens({ secao }: { secao: Secao }) {
  return (
    <>
      {secao.paragrafos.map((p, i) => (
        <p key={`p${i}`} className="mt-2 text-sm leading-relaxed text-slate-700">{p}</p>
      ))}
      {secao.itens.length > 0 && (
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-slate-700 marker:text-indigo-400">
          {secao.itens.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      )}
    </>
  );
}

function Bloco({ secao }: { secao: Secao }) {
  const tamanho = secao.paragrafos.join(" ").length + secao.itens.join(" ").length;
  // A propaganda da empresa costuma ser longa e vem primeiro: fica recolhida, para o que importa aparecer logo.
  if (secao.id === "sobre" && tamanho > LIMITE_PARA_RECOLHER) {
    const previa = (secao.paragrafos[0] ?? secao.itens[0] ?? "").slice(0, 160).replace(/\s+\S*$/, "");
    return (
      <details className="group rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
        <summary className="cursor-pointer list-none text-sm font-semibold text-slate-800">
          {secao.titulo}
          <span className="ml-2 font-normal text-slate-500 group-open:hidden">{previa}… <span className="text-indigo-700 underline">ler tudo</span></span>
        </summary>
        <Itens secao={secao} />
      </details>
    );
  }
  return (
    <section>
      <h3 className="text-base font-bold text-slate-900">{secao.titulo}</h3>
      <Itens secao={secao} />
    </section>
  );
}

function Linha({ rotulo, valores, vazio }: { rotulo: string; valores: string[]; vazio?: string }) {
  if (valores.length === 0 && !vazio) return null;
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[9rem_1fr] sm:gap-4">
      <dt className="text-sm font-semibold text-slate-800">{rotulo}</dt>
      <dd className="text-sm text-slate-700">
        {valores.length === 0 ? (
          <span className="text-slate-500">{vazio}</span>
        ) : (
          <ul className="space-y-1">
            {valores.map((v, i) => <li key={i}>{v}</li>)}
          </ul>
        )}
      </dd>
    </div>
  );
}

function QuadroDeRequisitos({ fatos }: { fatos: DescricaoOrganizada["fatos"] }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5" aria-labelledby="requisitos-gerais">
      <h2 id="requisitos-gerais" className="text-lg font-bold">Requisitos da vaga</h2>
      <p className="mt-1 text-xs text-slate-500">
        Lidos do texto do anúncio, além das habilidades técnicas que aparecem mais abaixo. Confira na vaga original.
      </p>
      {fatos.afirmativa && (
        <p className="mt-3 inline-block rounded-md bg-violet-50 px-3 py-1.5 text-sm font-medium text-violet-900">{fatos.afirmativa}</p>
      )}
      <dl className="mt-2 divide-y divide-slate-100">
        <Linha rotulo="Escolaridade" valores={fatos.escolaridade} vazio="O anúncio não informa." />
        <Linha rotulo="Experiência" valores={fatos.experiencia} vazio="O anúncio não informa." />
        <Linha rotulo="Idiomas" valores={fatos.idiomas} vazio="O anúncio não informa." />
        <Linha rotulo="Certificações" valores={fatos.certificacoes} />
      </dl>
    </section>
  );
}

/**
 * A vaga como texto organizado: um quadro com escolaridade, experiência e idiomas, e depois as seções do anúncio
 * (o que fazer, requisitos, diferenciais, benefícios...) em listas.
 */
export function DescricaoDaVaga({ detalhes, descricao }: Props) {
  const organizada = lerDescricaoOrganizada(detalhes) ?? organizarDescricao(descricao);
  if (organizada.secoes.length === 0) return null;

  return (
    <>
      <QuadroDeRequisitos fatos={organizada.fatos} />
      <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-5" aria-labelledby="descricao-da-vaga">
        <h2 id="descricao-da-vaga" className="text-lg font-bold">Descrição da vaga</h2>
        {organizada.secoes.map((s, i) => <Bloco key={`${s.id}-${i}`} secao={s} />)}
      </section>
    </>
  );
}
