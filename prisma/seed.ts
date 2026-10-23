import { PrismaClient } from "@prisma/client";
import { HABILIDADES } from "../src/lib/dados/habilidades";
import { CURSOS } from "../src/lib/dados/cursos";
import { VAGAS } from "../src/lib/dados/vagas";

const db = new PrismaClient();

async function main() {
  // Recria o catálogo de cursos e as vagas de exemplo. Contas, perfis e vagas
  // reais já sincronizadas são preservados.
  await db.habilidadeDoCurso.deleteMany();
  await db.vaga.deleteMany({ where: { origem: "exemplo" } });
  await db.curso.deleteMany();

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

  for (const c of CURSOS) {
    const { habilidades, ...dados } = c;
    await db.curso.create({
      data: {
        ...dados,
        habilidades: {
          // Nos dados, a primeira habilidade listada é a principal do curso.
          create: habilidades.map(([slug, nivelEnsinado], i) => ({
            habilidadeId: idDe(slug),
            nivelEnsinado,
            principal: i === 0,
          })),
        },
      },
    });
  }

  for (const v of VAGAS) {
    const { requisitos, ...dados } = v;
    await db.vaga.create({
      data: {
        ...dados,
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

  console.log(`Habilidades: ${HABILIDADES.length} · Cursos: ${CURSOS.length} · Vagas: ${VAGAS.length}`);
}

main().finally(() => db.$disconnect());
