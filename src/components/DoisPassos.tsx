"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { confirmarDoisPassos, desativarDoisPassos, gerarNovosCodigos, prepararDoisPassos } from "@/app/acoes-conta";

type Props = { ativo: boolean; ativoDesde: string | null; recuperacaoRestantes: number; usouRecuperacao: boolean };

const campo = "campo mt-1";

function CodigosDeRecuperacao({ codigos }: { codigos: string[] }) {
  const [copiado, setCopiado] = useState(false);
  const texto = codigos.join("\n");
  function baixar() {
    const blob = new Blob([`Códigos de recuperação do TechVagas (cada um vale uma vez)\n\n${texto}\n`], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "techvagas-codigos-de-recuperacao.txt";
    link.click();
    URL.revokeObjectURL(link.href);
  }
  return (
    <div className="rounded-xl bg-amber-50 p-4 ring-1 ring-inset ring-amber-200">
      <p className="text-sm font-semibold text-amber-900">Guarde estes códigos agora, num lugar seguro.</p>
      <p className="mt-1 text-sm text-amber-900">
        Se você perder o celular, cada código deixa você entrar <strong>uma vez</strong>. Eles não aparecem de novo.
      </p>
      <ul className="mt-3 grid grid-cols-2 gap-2 font-mono text-sm" aria-label="Códigos de recuperação">
        {codigos.map((c) => <li key={c} className="rounded-md bg-white px-3 py-1.5 text-center ring-1 ring-amber-200">{c}</li>)}
      </ul>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="btn-secundario !py-1.5" onClick={async () => { await navigator.clipboard?.writeText(texto); setCopiado(true); }}>
          {copiado ? "Copiado ✔" : "Copiar"}
        </button>
        <button type="button" className="btn-secundario !py-1.5" onClick={baixar}>Baixar em arquivo</button>
      </div>
    </div>
  );
}

/** Tela de ligar, desligar e renovar a verificação em dois passos. */
export function DoisPassos({ ativo, ativoDesde, recuperacaoRestantes, usouRecuperacao }: Props) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [preparo, setPreparo] = useState<{ segredo: string; qrSvg: string } | null>(null);
  const [codigos, setCodigos] = useState<string[] | null>(null);
  const [mensagem, setMensagem] = useState<{ tipo: "erro" | "ok"; texto: string } | null>(null);

  const falha = (texto: string) => setMensagem({ tipo: "erro", texto });

  function preparar() {
    setMensagem(null);
    iniciar(async () => {
      const r = await prepararDoisPassos();
      if ("erro" in r) falha(r.erro);
      else setPreparo(r);
    });
  }

  function confirmar(formData: FormData) {
    setMensagem(null);
    iniciar(async () => {
      const r = await confirmarDoisPassos(String(formData.get("codigo") ?? ""));
      if ("erro" in r) return falha(r.erro);
      setCodigos(r.codigosDeRecuperacao);
      setPreparo(null);
      router.refresh();
    });
  }

  function desativar(formData: FormData) {
    setMensagem(null);
    iniciar(async () => {
      const r = await desativarDoisPassos(String(formData.get("senha") ?? ""), String(formData.get("codigo") ?? ""));
      if ("erro" in r) return falha(r.erro);
      setCodigos(null);
      setMensagem({ tipo: "ok", texto: "Verificação em dois passos desligada." });
      router.refresh();
    });
  }

  function renovar(formData: FormData) {
    setMensagem(null);
    iniciar(async () => {
      const r = await gerarNovosCodigos(String(formData.get("codigo") ?? ""));
      if ("erro" in r) return falha(r.erro);
      setCodigos(r.codigosDeRecuperacao);
      router.refresh();
    });
  }

  const aviso = mensagem && (
    <p role={mensagem.tipo === "erro" ? "alert" : "status"} className={`mt-3 rounded-xl px-3 py-2 text-sm ring-1 ring-inset ${mensagem.tipo === "erro" ? "bg-rose-50 text-rose-700 ring-rose-100" : "bg-emerald-50 text-emerald-800 ring-emerald-100"}`}>
      {mensagem.texto}
    </p>
  );

  // ---- Já ligada ----
  if (ativo) {
    return (
      <div className="space-y-5">
        <div className="cartao p-5">
          <p className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">✔ Ativada{ativoDesde ? ` desde ${ativoDesde}` : ""}</p>
          <p className="mt-3 text-sm text-slate-600">
            Ao entrar, depois da senha, o site pede o código do aplicativo. Você tem <strong>{recuperacaoRestantes}</strong>{" "}
            {recuperacaoRestantes === 1 ? "código de recuperação" : "códigos de recuperação"} sem uso.
          </p>
          {usouRecuperacao && (
            <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-inset ring-amber-200">
              Você entrou com um código de recuperação. Se perdeu o celular, gere códigos novos abaixo e, depois, ligue a verificação em um aparelho novo.
            </p>
          )}
          {codigos && <div className="mt-4"><CodigosDeRecuperacao codigos={codigos} /></div>}
          {aviso}
        </div>

        <div className="cartao p-5">
          <h2 className="font-semibold">Gerar novos códigos de recuperação</h2>
          <p className="mt-1 text-sm text-slate-600">Os códigos antigos deixam de valer. Digite o código atual do aplicativo.</p>
          <form action={renovar} className="mt-3 flex max-w-sm flex-wrap items-end gap-3">
            <label className="min-w-40 flex-1 text-sm font-medium text-slate-700">Código do aplicativo
              <input name="codigo" required autoComplete="one-time-code" inputMode="numeric" className={campo} />
            </label>
            <button disabled={pendente} className="btn-secundario">Gerar novos</button>
          </form>
        </div>

        <div className="cartao border-rose-200 p-5">
          <h2 className="font-semibold text-rose-800">Desligar a verificação em dois passos</h2>
          <p className="mt-1 text-sm text-slate-600">Sua conta volta a pedir só a senha. Por segurança, pedimos a senha e um código.</p>
          <form action={desativar} className="mt-3 grid max-w-sm gap-3">
            <label className="text-sm font-medium text-slate-700">Senha
              <input name="senha" type="password" required autoComplete="current-password" className={campo} />
            </label>
            <label className="text-sm font-medium text-slate-700">Código do aplicativo (ou de recuperação)
              <input name="codigo" required autoComplete="one-time-code" className={campo} />
            </label>
            <button disabled={pendente} className="inline-flex items-center justify-center rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:opacity-60">Desligar</button>
          </form>
        </div>
      </div>
    );
  }

  // ---- Recém-ligada: mostrar os códigos de recuperação uma vez ----
  if (codigos) {
    return (
      <div className="cartao space-y-4 p-5">
        <p className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">✔ Verificação em dois passos ligada</p>
        <CodigosDeRecuperacao codigos={codigos} />
      </div>
    );
  }

  // ---- Desligada ----
  return (
    <div className="cartao p-5">
      {!preparo ? (
        <>
          <p className="text-sm leading-relaxed text-slate-600">
            Com a verificação em dois passos, <strong>só a senha não basta</strong> para entrar na sua conta: o site também pede um código de
            6 dígitos que muda a cada 30 segundos e aparece no seu celular. Mesmo que alguém descubra a sua senha, não consegue entrar.
          </p>
          <button type="button" onClick={preparar} disabled={pendente} className="btn-primario mt-4">{pendente ? "Preparando..." : "Ligar a verificação em dois passos"}</button>
          {aviso}
        </>
      ) : (
        <div className="space-y-5">
          <ol className="list-decimal space-y-4 pl-5 text-sm text-slate-700">
            <li>
              Instale no celular um aplicativo de códigos, como o <strong>Google Authenticator</strong>, o <strong>Microsoft Authenticator</strong> ou o <strong>Authy</strong>.
            </li>
            <li>
              No aplicativo, escolha “adicionar conta” e <strong>aponte a câmera para este QR code</strong>:
              <div className="mt-3 inline-block rounded-xl bg-white p-2 ring-1 ring-slate-200" role="img" aria-label="QR code para o aplicativo de códigos" dangerouslySetInnerHTML={{ __html: preparo.qrSvg }} />
              <p className="mt-2 text-xs text-slate-500">
                Sem câmera? Digite esta chave no aplicativo (tipo “baseada em tempo”):
              </p>
              <p className="mt-1 break-all rounded-md bg-slate-100 px-3 py-2 font-mono text-sm tracking-wider text-slate-800">{preparo.segredo}</p>
            </li>
            <li>
              Digite aqui o número de 6 dígitos que o aplicativo mostra:
              <form action={confirmar} className="mt-2 flex max-w-sm flex-wrap items-end gap-3">
                <label className="min-w-40 flex-1 text-sm font-medium text-slate-700">Código
                  <input name="codigo" required autoComplete="one-time-code" inputMode="numeric" maxLength={7} className={campo} />
                </label>
                <button disabled={pendente} className="btn-primario">Confirmar e ligar</button>
              </form>
            </li>
          </ol>
          {aviso}
        </div>
      )}
    </div>
  );
}
