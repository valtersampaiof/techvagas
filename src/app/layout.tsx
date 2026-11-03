import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { Cabecalho, Marca } from "@/components/Cabecalho";

export const metadata: Metadata = {
  title: { default: "TechVagas — vagas de TI e cursos para chegar até elas", template: "%s · TechVagas" },
  description:
    "Encontre vagas de tecnologia, do estágio ao sênior, em CLT e PJ, e veja quais cursos gratuitos e pagos fecham a distância entre você e a vaga.",
};

const linksDoRodape = [
  { href: "/vagas", rotulo: "Vagas" },
  { href: "/cursos", rotulo: "Cursos" },
  { href: "/mercado", rotulo: "Habilidades mais pedidas" },
  { href: "/alertas", rotulo: "Alertas por e-mail" },
  { href: "/perfil", rotulo: "Meu perfil" },
  { href: "/privacidade", rotulo: "Privacidade" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <Cabecalho />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
        <footer className="mt-8 border-t border-slate-200 bg-white/70">
          <div className="mx-auto grid max-w-5xl gap-8 px-4 py-10 sm:grid-cols-[1.4fr_1fr]">
            <div>
              <Marca />
              <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-600">
                Vagas de TI do estágio à liderança, em CLT, PJ e estágio, e os cursos para fechar o que falta no seu currículo.
              </p>
            </div>
            <nav aria-label="Rodapé">
              <ul className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                {linksDoRodape.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-slate-600 hover:text-indigo-700">{l.rotulo}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
          <p className="border-t border-slate-100 px-4 py-4 text-center text-xs text-slate-500">
            Vagas marcadas como &ldquo;exemplo&rdquo; são fictícias. As demais vêm das fontes indicadas em cada anúncio. Preços e
            certificados dos cursos devem ser conferidos no site de cada instituição.
          </p>
        </footer>
      </body>
    </html>
  );
}
