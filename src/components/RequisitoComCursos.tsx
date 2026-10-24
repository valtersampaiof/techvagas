"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

export type CursoDoQuadro = {
  id: number;
  titulo: string;
  instituicao: string;
  link: string;
  cargaHoraria: number;
  certificado: boolean;
};

type Props = {
  nome: string;
  slug: string;
  cursos: CursoDoQuadro[];
};

const ATRASO_PARA_FECHAR_MS = 150;

/**
 * Nome de uma habilidade que, ao passar o mouse (ou tocar, ou usar o teclado), abre um mini quadro com
 * cursos gratuitos, sem sair da página. Os links abrem em outra aba.
 */
export function RequisitoComCursos({ nome, slug, cursos }: Props) {
  const [aberto, setAberto] = useState(false);
  // "Fixado": o quadro foi aberto por clique/toque e só fecha por outro clique, Esc ou clique fora.
  const [fixado, setFixado] = useState(false);
  const raiz = useRef<HTMLSpanElement>(null);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idDoQuadro = useId();

  const cancelarFechamento = () => {
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = null;
  };

  const fechar = useCallback(() => {
    cancelarFechamento();
    setAberto(false);
    setFixado(false);
  }, []);

  useEffect(() => {
    if (!aberto) return;
    const aoPressionarTecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") fechar();
    };
    const aoClicarFora = (e: PointerEvent) => {
      if (raiz.current && !raiz.current.contains(e.target as Node)) fechar();
    };
    document.addEventListener("keydown", aoPressionarTecla);
    document.addEventListener("pointerdown", aoClicarFora);
    return () => {
      document.removeEventListener("keydown", aoPressionarTecla);
      document.removeEventListener("pointerdown", aoClicarFora);
    };
  }, [aberto, fechar]);

  useEffect(() => cancelarFechamento, []);

  function aoEntrarComMouse() {
    cancelarFechamento();
    setAberto(true);
  }

  function aoSairComMouse() {
    if (fixado) return;
    cancelarFechamento();
    temporizador.current = setTimeout(() => setAberto(false), ATRASO_PARA_FECHAR_MS);
  }

  function aoClicar() {
    // Aberto só pelo mouse: o clique fixa. Já fixado: o clique fecha.
    if (aberto && fixado) {
      fechar();
    } else {
      setAberto(true);
      setFixado(true);
    }
  }

  return (
    <span
      ref={raiz}
      className="relative inline-block"
      onMouseEnter={aoEntrarComMouse}
      onMouseLeave={aoSairComMouse}
      onBlur={(e) => {
        // Saiu o foco de dentro do componente (ex.: Tab para outro elemento).
        if (!fixado && !e.currentTarget.contains(e.relatedTarget as Node | null)) setAberto(false);
      }}
    >
      <button
        type="button"
        aria-expanded={aberto}
        aria-controls={aberto ? idDoQuadro : undefined}
        aria-haspopup="dialog"
        onClick={aoClicar}
        onFocus={() => setAberto(true)}
        className="cursor-help font-bold underline decoration-dotted decoration-indigo-400 underline-offset-4 hover:text-indigo-700 focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
      >
        {nome}
      </button>

      {aberto && (
        <div
          id={idDoQuadro}
          role="dialog"
          aria-label={`Cursos gratuitos de ${nome}`}
          className="absolute left-0 top-full z-30 mt-2 w-[min(24rem,calc(100vw-4rem))] rounded-xl border border-slate-200 bg-white p-3 text-left font-normal shadow-xl"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Cursos gratuitos de {nome}</p>

          {cursos.length > 0 ? (
            <ul className="mt-2 space-y-2">
              {cursos.map((c) => (
                <li key={c.id} className="rounded-lg border border-slate-100 p-2 hover:border-indigo-200 hover:bg-indigo-50/40">
                  <a
                    href={c.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-sm font-semibold text-slate-900 hover:text-indigo-700"
                  >
                    {c.titulo} <span aria-hidden="true">↗</span>
                    <span className="sr-only"> (abre em outra aba)</span>
                  </a>
                  <p className="mt-0.5 text-xs text-slate-600">
                    {c.instituicao} · ≈ {c.cargaHoraria} h ·{" "}
                    <span className={c.certificado ? "font-medium text-emerald-700" : "text-slate-500"}>
                      {c.certificado ? "com certificado" : "sem certificado"}
                    </span>
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-600">Ainda não temos curso gratuito para esta habilidade.</p>
          )}

          <a
            href={`/cursos?habilidade=${encodeURIComponent(slug)}&preco=gratuito`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block text-xs font-medium text-indigo-700 hover:underline"
          >
            Ver todos os cursos de {nome} <span aria-hidden="true">↗</span>
            <span className="sr-only"> (abre em outra aba)</span>
          </a>
        </div>
      )}
    </span>
  );
}
