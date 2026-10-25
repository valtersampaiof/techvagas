"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { criarSessao, encerrarSessao, usuarioAtual } from "@/lib/sessao";
import { ehNivel } from "@/lib/niveis";
import { MAX_ALERTAS_POR_PESSOA, gerarToken, nomeDoAlerta, temAlgumFiltro } from "@/lib/alertas";
import { normalizar } from "@/lib/extrair-habilidades";
import { SALARIOS_MINIMOS } from "@/lib/filtros-de-vagas";
import { ESTADOS } from "@/lib/localizacao";
import { ajustarRegime, FILTROS_DE_CONTRATO, TIPOS_DE_VAGA } from "@/lib/tipos-de-vaga";

export type EstadoDoFormulario =
  | {
      erro?: string;
      ok?: string;
      /** Valores digitados, devolvidos para o formulário não apagar o que a pessoa escreveu. */
      campos?: Record<string, string>;
    }
  | undefined;

const esquemaCadastro = z.object({
  nome: z.string().trim().min(2, "Informe seu nome."),
  email: z.string().trim().toLowerCase().email("E-mail inválido."),
  senha: z.string().min(8, "A senha precisa de pelo menos 8 caracteres."),
});

export async function cadastrar(_: EstadoDoFormulario, formData: FormData): Promise<EstadoDoFormulario> {
  const digitado = {
    nome: String(formData.get("nome") ?? ""),
    email: String(formData.get("email") ?? ""),
  };
  const dados = esquemaCadastro.safeParse(Object.fromEntries(formData));
  if (!dados.success) return { erro: dados.error.issues[0].message, campos: digitado };

  const { nome, email, senha } = dados.data;
  if (await db.usuario.findUnique({ where: { email } })) {
    return { erro: "Já existe uma conta com este e-mail.", campos: digitado };
  }
  const usuario = await db.usuario.create({
    data: { nome, email, senhaHash: await bcrypt.hash(senha, 10) },
  });
  await criarSessao(usuario.id);
  redirect("/perfil");
}

export async function entrar(_: EstadoDoFormulario, formData: FormData): Promise<EstadoDoFormulario> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const senha = String(formData.get("senha") ?? "");

  const usuario = await db.usuario.findUnique({ where: { email } });
  // Mesma mensagem para e-mail inexistente e senha errada.
  if (!usuario || !(await bcrypt.compare(senha, usuario.senhaHash))) {
    return { erro: "E-mail ou senha incorretos.", campos: { email } };
  }
  await criarSessao(usuario.id);
  redirect("/vagas");
}

export async function sair() {
  await encerrarSessao();
  redirect("/");
}

const esquemaHabilidades = z.array(z.object({ slug: z.string(), nivel: z.string() })).max(100);

export async function salvarPerfil(_: EstadoDoFormulario, formData: FormData): Promise<EstadoDoFormulario> {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/entrar");

  let lista;
  try {
    lista = esquemaHabilidades.parse(JSON.parse(String(formData.get("habilidades") ?? "[]")));
  } catch {
    return { erro: "Não foi possível ler as habilidades enviadas." };
  }

  const catalogo = await db.habilidade.findMany({ select: { id: true, slug: true } });
  const idPorSlug = new Map(catalogo.map((h) => [h.slug, h.id]));
  const validas = lista.filter((h) => idPorSlug.has(h.slug));

  await db.$transaction([
    db.habilidadeDoUsuario.deleteMany({ where: { usuarioId: usuario.id } }),
    db.habilidadeDoUsuario.createMany({
      data: validas.map((h) => ({
        usuarioId: usuario.id,
        habilidadeId: idPorSlug.get(h.slug)!,
        nivel: ehNivel(h.nivel) ? h.nivel : "iniciante",
      })),
    }),
    db.usuario.update({
      where: { id: usuario.id },
      data: {
        curso: String(formData.get("curso") ?? "").trim().slice(0, 120),
        cidade: String(formData.get("cidade") ?? "").trim().slice(0, 80),
      },
    }),
  ]);

  revalidatePath("/", "layout");
  return { ok: "Perfil salvo! Agora veja as vagas que combinam com você." };
}

export type ResultadoDeSalvar = { salva: boolean } | { erro: "login" | "inexistente" };

/** Salva a vaga para a pessoa logada ou, se já estava salva, tira das salvas. */
export async function alternarVagaSalva(vagaId: number): Promise<ResultadoDeSalvar> {
  const usuario = await usuarioAtual();
  if (!usuario) return { erro: "login" };
  if (!Number.isInteger(vagaId) || vagaId <= 0) return { erro: "inexistente" };
  if (!(await db.vaga.findUnique({ where: { id: vagaId }, select: { id: true } }))) return { erro: "inexistente" };

  const chave = { usuarioId_vagaId: { usuarioId: usuario.id, vagaId } };
  const jaSalva = await db.vagaSalva.findUnique({ where: chave });
  if (jaSalva) await db.vagaSalva.delete({ where: chave });
  else await db.vagaSalva.create({ data: { usuarioId: usuario.id, vagaId } });

  revalidatePath("/salvas");
  return { salva: !jaSalva };
}

const esquemaAlerta = z.object({
  uf: z.string().trim().toUpperCase().refine((v) => v === "" || ESTADOS.some((e) => e.uf === v), "Estado inválido."),
  cidade: z.string().trim().max(80, "O nome da cidade está grande demais."),
  tipo: z.enum(["", ...TIPOS_DE_VAGA], { message: "Nível de vaga inválido." }),
  contrato: z.enum(["", ...FILTROS_DE_CONTRATO], { message: "Tipo de contratação inválido." }),
  area: z.string().trim().max(60, "Área inválida."),
  salarioMinimo: z
    .string()
    .refine((v) => v === "" || (SALARIOS_MINIMOS as readonly number[]).includes(Number(v)), "Salário mínimo inválido."),
});

/** Cria um alerta: a pessoa passa a receber por e-mail as vagas NOVAS que combinam com estes filtros. */
export async function criarAlerta(_: EstadoDoFormulario, formData: FormData): Promise<EstadoDoFormulario> {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/entrar");

  const digitado = {
    uf: String(formData.get("uf") ?? ""),
    cidade: String(formData.get("cidade") ?? ""),
    tipo: String(formData.get("tipo") ?? ""),
    contrato: String(formData.get("contrato") ?? ""),
    area: String(formData.get("area") ?? ""),
    salarioMinimo: String(formData.get("salarioMinimo") ?? ""),
    incluirRemotas: formData.get("incluirRemotas") === "1" ? "1" : "",
  };
  // Em qualquer erro, devolvemos o que a pessoa escolheu: o formulário se limpa sozinho depois de cada envio.
  const recusar = (erro: string): EstadoDoFormulario => ({ erro, campos: digitado });

  const dados = esquemaAlerta.safeParse(digitado);
  if (!dados.success) return recusar(dados.error.issues[0].message);

  // Regime e nível coerentes: estágio é um regime e não tem nível; PJ não tem trainee.
  const filtros = {
    ...dados.data,
    ...ajustarRegime(dados.data.contrato, dados.data.tipo),
    salarioMinimo: dados.data.salarioMinimo ? Number(dados.data.salarioMinimo) : null,
    incluirRemotas: formData.get("incluirRemotas") === "1",
  };
  if (!temAlgumFiltro(filtros)) return recusar("Escolha pelo menos um filtro (estado, cidade, nível, contratação, área ou salário) para o alerta.");

  const existentes = await db.alerta.findMany({ where: { usuarioId: usuario.id } });
  if (existentes.length >= MAX_ALERTAS_POR_PESSOA) {
    return recusar(`Você já tem ${MAX_ALERTAS_POR_PESSOA} alertas, o máximo. Exclua algum para criar outro.`);
  }
  const cidadeChave = normalizar(filtros.cidade).trim();
  const repetido = existentes.some(
    (a) =>
      a.uf === filtros.uf && a.cidadeChave === cidadeChave && a.tipo === filtros.tipo && a.contrato === filtros.contrato && a.area === filtros.area &&
      a.salarioMinimo === filtros.salarioMinimo && a.incluirRemotas === filtros.incluirRemotas,
  );
  if (repetido) return recusar("Você já tem um alerta igual a esse.");

  await db.alerta.create({
    data: { usuarioId: usuario.id, nome: nomeDoAlerta(filtros), ...filtros, cidadeChave, token: gerarToken() },
  });
  revalidatePath("/alertas");
  return { ok: `Alerta criado! Vamos avisar em ${usuario.email} quando aparecerem vagas novas assim.` };
}

/** Só mexe em alertas da própria pessoa. */
async function alertaDaPessoa(id: number) {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/entrar");
  if (!Number.isInteger(id)) return null;
  return db.alerta.findFirst({ where: { id, usuarioId: usuario.id } });
}

export async function removerAlerta(id: number) {
  const alerta = await alertaDaPessoa(id);
  if (alerta) await db.alerta.delete({ where: { id: alerta.id } });
  revalidatePath("/alertas");
}

/** Pausa um alerta ativo ou reativa um pausado. */
export async function alternarAlerta(id: number) {
  const alerta = await alertaDaPessoa(id);
  if (alerta) {
    // Ao reativar, só contam as vagas achadas daqui para frente (não as que chegaram durante a pausa).
    await db.alerta.update({ where: { id: alerta.id }, data: { ativo: !alerta.ativo, ...(alerta.ativo ? {} : { ultimoEnvioEm: new Date() }) } });
  }
  revalidatePath("/alertas");
}

/** Cancelamento pelo link do e-mail: dispensa login, porque o token é secreto. */
export async function cancelarAlertaPorToken(token: string) {
  if (typeof token === "string" && token.length >= 20) await db.alerta.deleteMany({ where: { token } });
  redirect("/alertas/cancelar?cancelado=1");
}
