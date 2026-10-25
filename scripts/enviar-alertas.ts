import { PrismaClient } from "@prisma/client";
import { configuracaoDeEmail, criarEnviadorSmtp, enderecoDoSite } from "../src/lib/email";
import { enviarAlertas } from "../src/lib/enviar-alertas";

const db = new PrismaClient();

async function main() {
  const config = configuracaoDeEmail();
  const forcarSimulacao = process.argv.includes("--simular");
  const simular = forcarSimulacao || !config;

  if (!config) {
    console.log("O envio de e-mails ainda não está configurado (faltam SMTP_HOST e EMAIL_DE no arquivo .env).");
  }
  if (simular) {
    console.log("MODO SIMULAÇÃO: mostra o que seria enviado. Nada é enviado e nenhum alerta é marcado como enviado.\n");
  } else {
    console.log(`Enviando por ${config!.host}:${config!.port} ...\n`);
  }

  const resultados = await enviarAlertas({
    db,
    enviar: !simular && config ? criarEnviadorSmtp(config) : undefined,
    simular,
    enderecoDoSite: enderecoDoSite(),
    aoSimular: (m) => {
      console.log(`--- Para: ${m.para}\n--- Assunto: ${m.assunto}\n${m.texto}\n`);
    },
  });

  if (resultados.length === 0) console.log("Nenhum alerta ativo.");
  for (const r of resultados) {
    const marca = { enviado: "✔", simulado: "~", "sem-novas": "–", erro: "✘" }[r.situacao];
    const texto = {
      enviado: `${r.novas} vaga(s) nova(s) enviada(s)`,
      simulado: `${r.novas} vaga(s) nova(s) (simulado)`,
      "sem-novas": "nenhuma vaga nova",
      erro: `erro: ${r.detalhe}`,
    }[r.situacao];
    console.log(`${marca} "${r.nome}" → ${r.para}: ${texto}`);
  }
  if (resultados.some((r) => r.situacao === "erro")) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
