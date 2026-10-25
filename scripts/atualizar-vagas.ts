import { PrismaClient } from "@prisma/client";
import { PREFIXO_CARREIRA } from "../src/lib/rotulos";
import { sincronizarVagas, type ResultadoDaFonte } from "../src/lib/vagas/sincronizar";

const db = new PrismaClient();

async function main() {
  console.log("Buscando vagas nas fontes...\n");
  const resultados = await sincronizarVagas(db);

  const descrever = (r: ResultadoDaFonte) =>
    r.situacao === "ok"
      ? `${r.salvas} salvas (${r.recebidas} recebidas; ${r.descartadas - (r.repetidas ?? 0)} descartadas por não serem para iniciantes de TI; ${r.repetidas ?? 0} já vieram de outra fonte)`
      : r.situacao === "pulada"
        ? `pulada: ${r.detalhe}`
        : `erro: ${r.detalhe}`;
  const marcaDe = (r: ResultadoDaFonte) => (r.situacao === "ok" ? "✔" : r.situacao === "pulada" ? "–" : "✘");

  // São dezenas de páginas de empresas: elas saem numa linha só, e só as que falharam ganham linha própria.
  const deEmpresas = resultados.filter((r) => r.origem.startsWith(PREFIXO_CARREIRA));
  const resumoDeEmpresas = () => {
    const lidas = deEmpresas.filter((r) => r.situacao === "ok");
    const comVagas = lidas.filter((r) => r.salvas > 0).map((r) => `${r.rotulo.replace(/ \(.*\)$/, "")} ${r.salvas}`);
    const salvas = lidas.reduce((n, r) => n + r.salvas, 0);
    const recebidas = lidas.reduce((n, r) => n + r.recebidas, 0);
    console.log(`✔ Sites de empresas (${lidas.length} de ${deEmpresas.length} páginas lidas): ${salvas} salvas (${recebidas} vagas lidas no Brasil e em tecnologia)${comVagas.length ? `: ${comVagas.join(", ")}` : ""}`);
    for (const r of deEmpresas.filter((x) => x.situacao !== "ok")) console.log(`${marcaDe(r)} ${r.rotulo}: ${descrever(r)}`);
  };

  let resumoImpresso = false;
  for (const r of resultados) {
    if (r.origem.startsWith(PREFIXO_CARREIRA)) {
      if (!resumoImpresso) resumoDeEmpresas();
      resumoImpresso = true;
      continue;
    }
    console.log(`${marcaDe(r)} ${r.rotulo}: ${descrever(r)}`);
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
