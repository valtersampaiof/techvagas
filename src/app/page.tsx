import Link from "next/link";
import { db } from "@/lib/db";
import { Etiqueta } from "@/components/Etiqueta";

export const dynamic = "force-dynamic";

const icone = "h-6 w-6";

const passos = [
  {
    titulo: "Mostre o que você sabe",
    texto: "Envie seu currículo em PDF ou marque suas habilidades. Você revisa tudo antes de salvar.",
    icone: (
      <svg className={icone} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
        <path d="M14 3v5h5M9 13h6M9 17h6" />
      </svg>
    ),
  },
  {
    titulo: "Veja vagas do seu nível",
    texto: "Do estágio à liderança, em CLT, PJ e estágio, com a compatibilidade de cada vaga com o seu perfil.",
    icone: (
      <svg className={icone} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18" />
      </svg>
    ),
  },
  {
    titulo: "Descubra o que estudar",
    texto: "Faltou algo, como segurança da informação? Mostramos cursos gratuitos e pagos, com certificado, para chegar lá.",
    icone: (
      <svg className={icone} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M22 9 12 4 2 9l10 5 10-5z" />
        <path d="M6 11.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-4.5M22 9v6" />
      </svg>
    ),
  },
];

export default async function Inicio() {
  const [reais, exemplos, cursos, gratuitos] = await Promise.all([
    db.vaga.count({ where: { origem: { not: "exemplo" }, ativa: true } }),
    db.vaga.count({ where: { origem: "exemplo" } }),
    db.curso.count(),
    db.curso.count({ where: { gratuito: true } }),
  ]);
  const vagas = reais > 0 ? reais : exemplos;
  const numero = (n: number) => n.toLocaleString("pt-BR");

  const estatisticas = [
    { valor: numero(vagas), rotulo: reais > 0 ? "vagas reais de TI" : "vagas de exemplo" },
    { valor: numero(cursos), rotulo: "cursos no catálogo" },
    { valor: numero(gratuitos), rotulo: "cursos gratuitos" },
  ];

  return (
    <div className="space-y-16">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-700 px-6 py-12 text-white shadow-xl shadow-indigo-900/20 sm:px-12 sm:py-16">
        {/* Círculos de fundo, só enfeite. */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-fuchsia-400/20 blur-3xl" aria-hidden="true" />

        <div className="relative grid items-center gap-10 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold ring-1 ring-white/25">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" aria-hidden="true" />
              Estágio, CLT e PJ · do júnior à liderança
            </p>
            <h1 className="mt-5 text-balance text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl">
              Toda vaga de TI mostra o que falta para você chegar lá.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-indigo-100">
              Vagas de todo o Brasil, com a lista exata de habilidades que você ainda precisa e os cursos, gratuitos e pagos,
              para conquistá-las.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/vagas" className="rounded-xl bg-white px-6 py-3 font-semibold text-indigo-700 shadow-lg shadow-indigo-950/20 transition hover:-translate-y-0.5 hover:bg-indigo-50">
                Buscar vagas
              </Link>
              <Link href="/perfil" className="rounded-xl border border-white/50 px-6 py-3 font-semibold transition hover:bg-white/10">
                Enviar meu currículo
              </Link>
            </div>
          </div>

          {/* Exemplo visual de uma vaga, para quem chega entender o site em segundos. */}
          <div className="hidden lg:block" aria-hidden="true">
            <div className="rotate-2 rounded-2xl bg-white p-5 text-slate-800 shadow-2xl shadow-indigo-950/30">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-lg font-bold text-violet-700">E</span>
                <div>
                  <p className="font-semibold">Estágio em Segurança da Informação</p>
                  <p className="text-sm text-slate-500">Empresa Exemplo · Recife, PE</p>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-amber-700">67% compatível</span>
                  <span className="text-slate-400">2 de 3 requisitos</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-amber-400 to-emerald-500" />
                </div>
              </div>
              <ul className="mt-4 space-y-1.5 text-sm">
                <li className="flex items-center gap-2"><span className="text-emerald-600">✔</span> Redes <span className="text-slate-400">você tem</span></li>
                <li className="flex items-center gap-2"><span className="text-emerald-600">✔</span> Linux <span className="text-slate-400">você tem</span></li>
                <li className="flex items-center gap-2"><span className="text-rose-600">✘</span> Segurança da Informação <span className="text-rose-500">falta</span></li>
              </ul>
              <div className="mt-4 rounded-xl bg-indigo-50 p-3 text-xs text-indigo-900">
                <p className="font-semibold">Para fechar essa lacuna:</p>
                <p className="mt-0.5">Introdução à Cibersegurança <span className="font-semibold text-emerald-700">· gratuito</span></p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Números do site" className="-mt-8 grid gap-4 px-2 sm:grid-cols-3 sm:px-8">
        {estatisticas.map((e) => (
          <div key={e.rotulo} className="cartao px-6 py-5 text-center">
            <p className="bg-gradient-to-br from-indigo-600 to-violet-600 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent">{e.valor}</p>
            <p className="mt-1 text-sm font-medium text-slate-500">{e.rotulo}</p>
          </div>
        ))}
      </section>

      <section>
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight">Como funciona</h2>
          <p className="mt-2 text-slate-600">Três passos, do currículo ao curso certo.</p>
        </div>
        <ol className="mt-8 grid gap-5 sm:grid-cols-3">
          {passos.map((p, i) => (
            <li key={p.titulo} className="cartao relative p-6 transition duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-900/10">
              <span className="absolute right-5 top-4 text-5xl font-extrabold text-slate-100" aria-hidden="true">{i + 1}</span>
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 text-indigo-700">{p.icone}</span>
              <h3 className="mt-4 text-lg font-semibold">{p.titulo}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{p.texto}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="cartao grid items-center gap-6 p-8 sm:grid-cols-[1.3fr_1fr]">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Escolha o regime e o nível certos</h2>
          <p className="mt-2 leading-relaxed text-slate-600">
            CLT, PJ e estágio são regimes diferentes, com leis e carreiras diferentes. Por isso o regime é o primeiro filtro da
            lista, e os níveis mudam conforme a sua escolha: estágio não tem nível, e PJ não tem trainee.
          </p>
          <Link href="/vagas" className="btn-primario mt-5">Ver as vagas</Link>
        </div>
        <div className="flex flex-wrap content-center gap-2">
          <Etiqueta variante="regime">CLT</Etiqueta>
          <Etiqueta variante="regime">PJ</Etiqueta>
          <Etiqueta variante="regime">Estágio</Etiqueta>
          <Etiqueta variante="nivel">Trainee</Etiqueta>
          <Etiqueta variante="nivel">Júnior</Etiqueta>
          <Etiqueta variante="nivel">Pleno</Etiqueta>
          <Etiqueta variante="nivel">Sênior</Etiqueta>
          <Etiqueta variante="nivel">Liderança</Etiqueta>
          <Etiqueta variante="remoto">Remoto</Etiqueta>
          <Etiqueta>Híbrido</Etiqueta>
          <Etiqueta>Presencial</Etiqueta>
        </div>
      </section>
    </div>
  );
}
