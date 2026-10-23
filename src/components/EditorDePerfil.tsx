"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import type { EstadoDoFormulario } from "@/app/acoes";
import { NIVEIS, ROTULO_NIVEL } from "@/lib/niveis";

type Habilidade = { slug: string; nome: string; area: string };

type Props = {
  catalogo: Habilidade[];
  inicial: { slug: string; nivel: string }[];
  curso: string;
  cidade: string;
  acao: (estado: EstadoDoFormulario, formData: FormData) => Promise<EstadoDoFormulario>;
};

const campo = "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

export function EditorDePerfil({ catalogo, inicial, curso, cidade, acao }: Props) {
  const [marcadas, setMarcadas] = useState<Record<string, string>>(() =>
    Object.fromEntries(inicial.map((h) => [h.slug, h.nivel])),
  );
  const [recemEncontradas, setRecemEncontradas] = useState<Set<string>>(new Set());
  const [leitura, setLeitura] = useState<{ tipo: "info" | "erro"; texto: string } | null>(null);
  const [lendo, setLendo] = useState(false);
  const [estado, salvar, salvando] = useActionState(acao, undefined);

  const porArea = useMemo(() => {
    const grupos = new Map<string, Habilidade[]>();
    for (const h of catalogo) grupos.set(h.area, [...(grupos.get(h.area) ?? []), h]);
    return [...grupos.entries()];
  }, [catalogo]);

  async function lerCurriculo(arquivo: File | undefined) {
    if (!arquivo) return;
    setLendo(true);
    setLeitura(null);
    try {
      const corpo = new FormData();
      corpo.set("curriculo", arquivo);
      const resposta = await fetch("/api/curriculo", { method: "POST", body: corpo });
      const dados = await resposta.json();
      if (!resposta.ok) {
        setLeitura({ tipo: "erro", texto: dados.erro ?? "Não foi possível ler o PDF." });
        return;
      }
      const encontradas: string[] = dados.habilidades;
      setMarcadas((atual) => {
        const novo = { ...atual };
        for (const slug of encontradas) novo[slug] ??= "iniciante";
        return novo;
      });
      setRecemEncontradas(new Set(encontradas));
      setLeitura({
        tipo: "info",
        texto: encontradas.length
          ? `Encontramos ${encontradas.length} habilidade(s) no seu currículo. Revise a lista abaixo e ajuste o nível de cada uma.`
          : "Não encontramos habilidades conhecidas no PDF. Marque-as manualmente abaixo.",
      });
    } catch {
      setLeitura({ tipo: "erro", texto: "Falha de conexão ao enviar o PDF." });
    } finally {
      setLendo(false);
    }
  }

  function alternar(slug: string) {
    setMarcadas((atual) => {
      const novo = { ...atual };
      if (slug in novo) delete novo[slug];
      else novo[slug] = "iniciante";
      return novo;
    });
  }

  const lista = Object.entries(marcadas).map(([slug, nivel]) => ({ slug, nivel }));

  return (
    <form action={salvar} className="space-y-8">
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold">1. Envie seu currículo (opcional)</h2>
        <p className="mt-1 text-sm text-slate-600">
          Aceitamos PDF de até 5 MB. O arquivo é lido na hora para achar suas habilidades e <strong>não fica salvo</strong>.
        </p>
        <input
          type="file"
          accept="application/pdf"
          disabled={lendo}
          onChange={(e) => {
            void lerCurriculo(e.target.files?.[0]);
            e.target.value = "";
          }}
          className="mt-3 block text-sm file:mr-3 file:rounded-md file:border-0 file:bg-indigo-600 file:px-3 file:py-2 file:text-white hover:file:bg-indigo-700"
        />
        {lendo && <p className="mt-2 text-sm text-slate-600">Lendo seu currículo...</p>}
        {leitura && (
          <p
            role={leitura.tipo === "erro" ? "alert" : "status"}
            className={`mt-3 rounded-md px-3 py-2 text-sm ${leitura.tipo === "erro" ? "bg-rose-50 text-rose-700" : "bg-indigo-50 text-indigo-800"}`}
          >
            {leitura.texto}
          </p>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold">2. Confira suas habilidades</h2>
        <p className="mt-1 text-sm text-slate-600">Marque o que você sabe e escolha seu nível em cada uma.</p>
        <div className="mt-4 space-y-5">
          {porArea.map(([area, itens]) => (
            <div key={area}>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{area}</h3>
              <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                {itens.map((h) => {
                  const marcada = h.slug in marcadas;
                  return (
                    <li
                      key={h.slug}
                      className={`flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm ${
                        recemEncontradas.has(h.slug) ? "border-indigo-400 bg-indigo-50" : "border-slate-200"
                      }`}
                    >
                      <label className="flex items-center gap-2">
                        <input type="checkbox" checked={marcada} onChange={() => alternar(h.slug)} />
                        {h.nome}
                      </label>
                      {marcada && (
                        <select
                          aria-label={`Nível em ${h.nome}`}
                          value={marcadas[h.slug]}
                          onChange={(e) => setMarcadas((atual) => ({ ...atual, [h.slug]: e.target.value }))}
                          className="rounded border border-slate-300 px-1 py-0.5 text-xs"
                        >
                          {NIVEIS.map((n) => (
                            <option key={n} value={n}>
                              {ROTULO_NIVEL[n]}
                            </option>
                          ))}
                        </select>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold">3. Sobre você</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium">
            Curso ou área de estudo
            <input name="curso" defaultValue={curso} placeholder="Ex.: Análise e Desenvolvimento de Sistemas" className={campo} />
          </label>
          <label className="block text-sm font-medium">
            Cidade
            <input name="cidade" defaultValue={cidade} placeholder="Ex.: Recife, PE" className={campo} />
          </label>
        </div>
      </section>

      <input type="hidden" name="habilidades" value={JSON.stringify(lista)} />

      {estado?.erro && (
        <p role="alert" className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {estado.erro}
        </p>
      )}
      {estado?.ok && (
        <p role="status" className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {estado.ok}{" "}
          <Link href="/vagas?compativeis=1" className="font-semibold underline">
            Ver vagas
          </Link>
        </p>
      )}

      <button
        disabled={salvando}
        className="rounded-md bg-indigo-600 px-5 py-2.5 font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
      >
        {salvando ? "Salvando..." : "Salvar perfil"}
      </button>
    </form>
  );
}
