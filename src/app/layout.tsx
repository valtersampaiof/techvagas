import type { Metadata } from "next";
import "./globals.css";
import { Cabecalho } from "@/components/Cabecalho";

export const metadata: Metadata = {
  title: { default: "TechVagas — vagas de TI e cursos para chegar até elas", template: "%s · TechVagas" },
  description:
    "Encontre vagas de tecnologia, do estágio ao sênior, em CLT e PJ, e veja quais cursos gratuitos e pagos fecham a distância entre você e a vaga.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <Cabecalho />
        <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8">{children}</main>
        <footer className="border-t border-slate-200 py-6 text-center text-sm text-slate-500">
          TechVagas · Vagas marcadas como &ldquo;exemplo&rdquo; são fictícias. As demais vêm das fontes indicadas em cada anúncio. Preços
          e certificados dos cursos devem ser conferidos no site de cada instituição.
        </footer>
      </body>
    </html>
  );
}
