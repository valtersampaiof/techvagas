"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Link do menu que destaca a página em que a pessoa está. */
export function LinkDoMenu({ href, children }: { href: string; children: React.ReactNode }) {
  const caminho = usePathname();
  const ativo = caminho === href || caminho.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={ativo ? "page" : undefined}
      className={`inline-flex items-center whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition ${
        ativo ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      }`}
    >
      {children}
    </Link>
  );
}
