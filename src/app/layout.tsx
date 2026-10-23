import type { Metadata } from "next";
import "./globals.css";
import { Cabecalho } from "@/components/Cabecalho";

export const metadata: Metadata = {
  title: { default: "Rota TI — vagas e cursos para estudantes de TI", template: "%s · Rota TI" },
  description:
    "Encontre estágios, trainees e vagas júnior em tecnologia e veja quais cursos gratuitos e pagos fecham a distância entre você e a vaga.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <Cabecalho />
        <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8">{children}</main>
        <footer className="border-t border-slate-200 py-6 text-center text-sm text-slate-500">
          Rota TI · As vagas exibidas são <strong>exemplos fictícios</strong> para demonstração. Preços e certificados dos
          cursos devem ser conferidos no site de cada instituição.
        </footer>
      </body>
    </html>
  );
}
