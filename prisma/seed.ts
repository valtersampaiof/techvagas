import { criarClienteDoBanco } from "../src/lib/cliente-do-banco";
import { HABILIDADES } from "../src/lib/dados/habilidades";
import { CURSOS } from "../src/lib/dados/cursos";
import { VAGAS } from "../src/lib/dados/vagas";
import { dadosDeLocalizacao } from "../src/lib/localizacao";

const db = criarClienteDoBanco();

async function main() {
  for (const h of HABILIDADES) {
    const dados = { nome: h.nome, area: h.area, sinonimos: h.sinonimos.join(",") };
    await db.habilidade.upsert({ where: { slug: h.slug }, update: dados, create: { slug: h.slug, ...dados } });
  }
  const ids = new Map((await db.habilidade.findMany()).map((h) => [h.slug, h.id]));
  const idDe = (slug: string) => {
    const id = ids.get(slug);
    if (id === undefined) throw new Error(`Habilidade desconhecida: ${slug}`);
    return id;
  };

  // Os cursos são atualizados no lugar (e não apagados e recriados): o número de cada curso precisa continuar o mesmo,
  // porque os cursos que as pessoas marcaram como concluídos apontam para ele. Só mexe no que mudou.
  const existentes = await db.curso.findMany({ include: { habilidades: true } });
  const chave = (c: { instituicao: string; titulo: string }) => `${c.instituicao}|${c.titulo}`;
  const porChave = new Map(existentes.map((c) => [chave(c), c]));
  let novos = 0;
  let atualizados = 0;

  for (const c of CURSOS) {
    const { habilidades, ...dados } = c;
    // Nos dados, a primeira habilidade listada é a principal do curso.
    const doCatalogo = habilidades.map(([slug, nivelEnsinado], i) => ({ habilidadeId: idDe(slug), nivelEnsinado, principal: i === 0 }));
    const atual = porChave.get(chave(c));

    if (!atual) {
      await db.curso.create({ data: { ...dados, habilidades: { create: doCatalogo } } });
      novos++;
      continue;
    }
    const assinatura = (l: { habilidadeId: number; nivelEnsinado: string; principal: boolean }[]) =>
      l.map((h) => `${h.habilidadeId}:${h.nivelEnsinado}:${h.principal}`).sort().join(",");
    const mudouCurso = (Object.keys(dados) as (keyof typeof dados)[]).some((k) => atual[k] !== dados[k]);
    const mudouHabilidades = assinatura(atual.habilidades) !== assinatura(doCatalogo);
    if (!mudouCurso && !mudouHabilidades) continue;

    await db.curso.update({ where: { id: atual.id }, data: dados });
    if (mudouHabilidades) {
      await db.habilidadeDoCurso.deleteMany({ where: { cursoId: atual.id } });
      await db.habilidadeDoCurso.createMany({ data: doCatalogo.map((h) => ({ ...h, cursoId: atual.id })) });
    }
    atualizados++;
  }

  // Cursos que saíram do catálogo.
  const doCatalogo = new Set(CURSOS.map(chave));
  const sobrando = existentes.filter((c) => !doCatalogo.has(chave(c))).map((c) => c.id);
  if (sobrando.length > 0) {
    await db.habilidadeDoCurso.deleteMany({ where: { cursoId: { in: sobrando } } });
    await db.curso.deleteMany({ where: { id: { in: sobrando } } });
  }

  // As vagas de exemplo só servem enquanto não há vagas reais (assim que há, elas deixam de aparecer).
  const reais = await db.vaga.count({ where: { origem: { not: "exemplo" } } });
  if (reais === 0) {
    await db.vaga.deleteMany({ where: { origem: "exemplo" } });
    for (const v of VAGAS) {
      const { requisitos, ...dados } = v;
      await db.vaga.create({
        data: {
          ...dados,
          ...dadosDeLocalizacao(dados.cidade),
          requisitos: {
            create: requisitos.map(([slug, nivelMinimo, obrigatorio]) => ({
              habilidadeId: idDe(slug),
              nivelMinimo,
              obrigatorio,
            })),
          },
        },
      });
    }
  }

  // Vagas reais já sincronizadas antes dos filtros de cidade/estado ainda não têm a localização interpretada.
  const semLocalizacao = await db.vaga.findMany({ where: { cidadeChave: "", uf: "", cidadeNome: "" }, select: { id: true, cidade: true } });
  for (const v of semLocalizacao) await db.vaga.update({ where: { id: v.id }, data: dadosDeLocalizacao(v.cidade) });

  console.log(
    `Habilidades: ${HABILIDADES.length} · Cursos: ${CURSOS.length} (${novos} novos, ${atualizados} atualizados, ${sobrando.length} removidos)` +
      ` · Vagas de exemplo: ${reais === 0 ? VAGAS.length : "não recriadas (há vagas reais)"}`,
  );
}

main().finally(() => db.$disconnect());
