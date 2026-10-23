import { extractText, getDocumentProxy } from "unpdf";
import { HABILIDADES } from "@/lib/dados/habilidades";
import { extrairHabilidades } from "@/lib/extrair-habilidades";
import { usuarioAtual } from "@/lib/sessao";

const TAMANHO_MAXIMO = 5 * 1024 * 1024; // 5 MB
const MAX_PAGINAS = 15;

const erro = (mensagem: string, status: number) => Response.json({ erro: mensagem }, { status });

/**
 * Lê um PDF de currículo e devolve as habilidades encontradas.
 * O arquivo é processado na memória e descartado: nada é gravado.
 */
export async function POST(request: Request) {
  if (!(await usuarioAtual())) return erro("Entre na sua conta para enviar o currículo.", 401);

  const formData = await request.formData().catch(() => null);
  const arquivo = formData?.get("curriculo");
  if (!(arquivo instanceof File)) return erro("Nenhum arquivo enviado.", 400);
  if (arquivo.size === 0) return erro("O arquivo está vazio.", 400);
  if (arquivo.size > TAMANHO_MAXIMO) return erro("O arquivo passa de 5 MB.", 413);

  const bytes = new Uint8Array(await arquivo.arrayBuffer());
  // Confere o conteúdo real: todo PDF começa com "%PDF-".
  if (String.fromCharCode(...bytes.slice(0, 5)) !== "%PDF-") return erro("Envie um arquivo PDF.", 415);

  try {
    const pdf = await getDocumentProxy(bytes);
    if (pdf.numPages > MAX_PAGINAS) return erro(`O PDF tem páginas demais (máximo ${MAX_PAGINAS}).`, 413);
    const { text } = await extractText(pdf, { mergePages: true });

    if (text.trim().length < 20) {
      return erro("Não encontrei texto no PDF. Se ele for uma imagem escaneada, marque as habilidades manualmente.", 422);
    }
    return Response.json({ habilidades: extrairHabilidades(text, HABILIDADES) });
  } catch {
    return erro("Não consegui ler este PDF. Tente outro arquivo ou marque as habilidades manualmente.", 422);
  }
}
