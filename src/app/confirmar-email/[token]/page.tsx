import Link from "next/link";
import type { Metadata } from "next";
import { Marca } from "@/components/Cabecalho";
import { consumirCodigoDeConta } from "@/lib/contas";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Confirmar e-mail", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function PaginaConfirmarEmail({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const usuarioId = await consumirCodigoDeConta(db, "email", token);
  if (usuarioId !== null) {
    await db.usuario.updateMany({ where: { id: usuarioId, emailConfirmadoEm: null }, data: { emailConfirmadoEm: new Date() } });
  }

  return (
    <div className="mx-auto max-w-sm pt-4 text-center">
      <Marca tamanho="grande" />
      {usuarioId !== null ? (
        <>
          <h1 className="mt-5 text-2xl font-bold">E-mail confirmado ✔</h1>
          <p className="mt-2 text-slate-600">Pronto! Agora você pode criar alertas e receber as vagas novas por e-mail.</p>
          <Link href="/alertas" className="btn-primario mt-6">Criar um alerta</Link>
        </>
      ) : (
        <>
          <h1 className="mt-5 text-2xl font-bold">Link inválido</h1>
          <p className="mt-2 text-slate-600">Este link já foi usado ou venceu. Entre na sua conta e peça um novo na página de alertas.</p>
          <Link href="/entrar" className="btn-primario mt-6">Entrar</Link>
        </>
      )}
    </div>
  );
}
