import Link from "next/link";
import { Marca } from "@/components/Cabecalho";

export default function PaginaNaoEncontrada() {
  return (
    <div className="mx-auto max-w-md py-10 text-center">
      <Marca tamanho="grande" />
      <p className="mt-8 bg-gradient-to-br from-indigo-600 to-violet-600 bg-clip-text text-7xl font-extrabold text-transparent">404</p>
      <h1 className="mt-2 text-2xl font-bold">Não encontramos esta página</h1>
      <p className="mt-2 text-slate-600">
        O endereço pode estar errado, ou a vaga pode ter sido encerrada e removida do site.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href="/vagas" className="btn-primario">Ver vagas</Link>
        <Link href="/" className="btn-secundario">Voltar ao início</Link>
      </div>
    </div>
  );
}
