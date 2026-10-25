import Link from "next/link";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const passos = [
  { n: "1", titulo: "Mostre o que você sabe", texto: "Envie seu currículo em PDF ou marque suas habilidades. Você revisa tudo antes de salvar." },
  { n: "2", titulo: "Veja vagas do seu nível", texto: "Do estágio à liderança, em CLT e PJ, com a compatibilidade de cada vaga com o seu perfil." },
  { n: "3", titulo: "Descubra o que estudar", texto: "Faltou algo, como segurança da informação? Mostramos cursos gratuitos e pagos, com certificado, para chegar lá." },
];

export default async function Inicio() {
  const [reais, exemplos, cursos, gratuitos] = await Promise.all([
    db.vaga.count({ where: { origem: { not: "exemplo" } } }),
    db.vaga.count({ where: { origem: "exemplo" } }),
    db.curso.count(),
    db.curso.count({ where: { gratuito: true } }),
  ]);
  const vagas = reais > 0 ? reais : exemplos;

  return (
    <div className="space-y-14">
      <section className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 px-6 py-14 text-white sm:px-12">
        <h1 className="max-w-2xl text-3xl font-bold leading-tight sm:text-4xl">
          Toda vaga de TI mostra o que falta para você chegar lá.
        </h1>
        <p className="mt-4 max-w-xl text-indigo-100">
          Vagas de estágio a sênior, CLT e PJ, em todo o Brasil, com a lista exata de habilidades que você ainda precisa e os
          cursos para conquistá-las.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/vagas" className="rounded-md bg-white px-5 py-2.5 font-semibold text-indigo-700 hover:bg-indigo-50">
            Buscar vagas
          </Link>
          <Link href="/perfil" className="rounded-md border border-white/60 px-5 py-2.5 font-semibold hover:bg-white/10">
            Enviar meu currículo
          </Link>
        </div>
        <p className="mt-6 text-sm text-indigo-100">
          {vagas} {reais > 0 ? (vagas === 1 ? "vaga real" : "vagas reais") : "vagas de exemplo"} · {cursos} cursos ({gratuitos} gratuitos)
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold">Como funciona</h2>
        <ol className="mt-5 grid gap-4 sm:grid-cols-3">
          {passos.map((p) => (
            <li key={p.n} className="rounded-xl border border-slate-200 bg-white p-5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-700">{p.n}</span>
              <h3 className="mt-3 font-semibold">{p.titulo}</h3>
              <p className="mt-1 text-sm text-slate-600">{p.texto}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-xl border border-indigo-200 bg-indigo-50 p-6">
        <h2 className="font-bold text-indigo-900">Exemplo</h2>
        <p className="mt-2 text-sm text-indigo-900">
          A vaga de <strong>Estágio em Segurança da Informação</strong> pede segurança, redes e Linux. Você sabe redes e
          Linux, mas não segurança. O site mostra <em>“67% compatível — falta: Segurança da Informação”</em> e sugere, por
          exemplo, a <strong>Introdução à Cibersegurança</strong> (gratuita, com certificado) e o{" "}
          <strong>Certificado Profissional Google de Cibersegurança</strong> (pago, mais completo).
        </p>
      </section>
    </div>
  );
}
