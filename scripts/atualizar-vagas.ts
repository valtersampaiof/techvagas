import { PrismaClient } from "@prisma/client";
import { sincronizarVagas } from "../src/lib/vagas/sincronizar";

const db = new PrismaClient();

async function main() {
  console.log("Buscando vagas nas fontes...\n");
  const resultados = await sincronizarVagas(db);

  for (const r of resultados) {
    const marca = r.situacao === "ok" ? "✔" : r.situacao === "pulada" ? "–" : "✘";
    const resumo =
      r.situacao === "ok"
        ? `${r.salvas} salvas (${r.recebidas} recebidas, ${r.descartadas} descartadas por não serem para iniciantes ou não pedirem habilidades conhecidas)`
        : r.situacao === "pulada"
          ? `pulada: ${r.detalhe}`
          : `erro: ${r.detalhe}`;
    console.log(`${marca} ${r.rotulo}: ${resumo}`);
  }

  const reais = await db.vaga.count({ where: { origem: { not: "exemplo" } } });
  console.log(`\nVagas reais no site agora: ${reais}`);
  if (reais === 0) console.log("Sem vagas reais, o site continua mostrando as vagas de exemplo.");
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
