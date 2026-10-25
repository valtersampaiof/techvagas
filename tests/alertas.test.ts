import { describe, expect, it } from "vitest";
import { MAX_VAGAS_NO_EMAIL, escaparHtml, montarEmailDoAlerta } from "@/lib/alertas-email";
import { gerarToken, nomeDoAlerta, parametrosDaLista, resumoDosFiltros, temAlgumFiltro, type FiltrosDoAlerta } from "@/lib/alertas";
import { configuracaoDeEmail, enderecoDoSite } from "@/lib/email";
import type { VagaComRequisitos } from "@/lib/fonte-de-vagas";

const filtros = (extra: Partial<FiltrosDoAlerta> = {}): FiltrosDoAlerta => ({
  uf: "", cidade: "", incluirRemotas: true, tipo: "", contrato: "", area: "", salarioMinimo: null, ...extra,
});

describe("alertas: nome, resumo e endereço da lista", () => {
  it("nomeia o alerta pelos filtros", () => {
    expect(nomeDoAlerta(filtros({ cidade: "Recife", uf: "PE" }))).toBe("Vagas em Recife (PE)");
    expect(nomeDoAlerta(filtros({ uf: "PE", tipo: "estagio" }))).toBe("Estágios em Pernambuco");
    expect(nomeDoAlerta(filtros({ tipo: "junior", area: "Dados", salarioMinimo: 2000 }))).toBe("Vagas júnior de Dados a partir de R$ 2.000 por mês");
    expect(nomeDoAlerta(filtros({ tipo: "trainee" }))).toBe("Trainees");
    expect(nomeDoAlerta(filtros({ contrato: "estagio", uf: "PE" }))).toBe("Estágios em Pernambuco");
    expect(nomeDoAlerta(filtros({ tipo: "senior", contrato: "pj", area: "Dados" }))).toBe("Vagas sênior PJ de Dados");
    expect(nomeDoAlerta(filtros({ tipo: "pleno", uf: "SP" }))).toBe("Vagas pleno em São Paulo");
    expect(nomeDoAlerta(filtros({ contrato: "clt", uf: "PE" }))).toBe("Vagas CLT em Pernambuco");
    expect(nomeDoAlerta(filtros({ area: "Segurança" }))).toBe("Vagas de Segurança");
  });

  it("resume os filtros", () => {
    expect(resumoDosFiltros(filtros({ uf: "PE", cidade: "Recife", tipo: "estagio", incluirRemotas: false }))).toBe(
      "estado: Pernambuco · cidade: Recife · nível: Estágio · sem vagas remotas",
    );
    expect(resumoDosFiltros(filtros({ area: "Dados" }))).toBe("área: Dados");
  });

  it("monta os parâmetros da lista de vagas", () => {
    expect(parametrosDaLista(filtros({ uf: "PE", cidade: "Recife" }))).toBe("uf=PE&cidade=Recife");
    expect(parametrosDaLista(filtros({ uf: "PE", incluirRemotas: false, tipo: "estagio", salarioMinimo: 1500 }))).toBe(
      "uf=PE&tipo=estagio&salario=1500&somenteRegiao=1",
    );
    // salário que não é uma das opções da tela não vai para o endereço
    expect(parametrosDaLista(filtros({ salarioMinimo: 1234 }))).toBe("");
    // "sem remotas" só faz sentido com região
    expect(parametrosDaLista(filtros({ incluirRemotas: false, tipo: "junior" }))).toBe("tipo=junior");
    expect(parametrosDaLista(filtros({ tipo: "senior", contrato: "pj" }))).toBe("tipo=senior&contrato=pj");
  });

  it("exige algum filtro e gera tokens longos e diferentes", () => {
    expect(temAlgumFiltro(filtros())).toBe(false);
    expect(temAlgumFiltro(filtros({ uf: "PE" }))).toBe(true);
    expect(temAlgumFiltro(filtros({ salarioMinimo: 1000 }))).toBe(true);
    const a = gerarToken(), b = gerarToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(30);
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/); // seguro para usar num endereço
  });
});

describe("configuracaoDeEmail", () => {
  it("sem SMTP_HOST ou sem remetente, não está configurado", () => {
    expect(configuracaoDeEmail({})).toBeNull();
    expect(configuracaoDeEmail({ SMTP_HOST: "smtp.exemplo.com" })).toBeNull(); // falta o remetente
    expect(configuracaoDeEmail({ SMTP_HOST: "  " , EMAIL_DE: "a@b.com" })).toBeNull();
  });
  it("lê host, porta, TLS e remetente", () => {
    expect(configuracaoDeEmail({ SMTP_HOST: "smtp.exemplo.com", EMAIL_DE: "TechVagas <a@b.com>" })).toMatchObject({
      host: "smtp.exemplo.com", port: 587, secure: false, ignorarTls: false, de: "TechVagas <a@b.com>",
    });
    expect(configuracaoDeEmail({ SMTP_HOST: "h", SMTP_PORT: "465", EMAIL_DE: "a@b.com" })?.secure).toBe(true);
    expect(configuracaoDeEmail({ SMTP_HOST: "h", SMTP_PORT: "465", SMTP_SECURE: "false", EMAIL_DE: "a@b.com" })?.secure).toBe(false);
    expect(configuracaoDeEmail({ SMTP_HOST: "h", EMAIL_DE: "a@b.com", SMTP_IGNORAR_TLS: "true" })?.ignorarTls).toBe(true);
  });
  it("usa o usuário como remetente quando ele é um e-mail", () => {
    expect(configuracaoDeEmail({ SMTP_HOST: "h", SMTP_USER: "avisos@exemplo.com", SMTP_PASS: "segredo" })).toMatchObject({
      de: "TechVagas <avisos@exemplo.com>", usuario: "avisos@exemplo.com", senha: "segredo",
    });
    expect(configuracaoDeEmail({ SMTP_HOST: "h", SMTP_USER: "apikey" })).toBeNull();
  });
  it("endereço do site: padrão local e sem barra no final", () => {
    expect(enderecoDoSite({})).toBe("http://localhost:3000");
    expect(enderecoDoSite({ SITE_URL: "https://techvagas.com.br///" })).toBe("https://techvagas.com.br");
  });
});

describe("montarEmailDoAlerta", () => {
  const vaga = (id: number, extra: Partial<VagaComRequisitos> & { compatibilidade?: number | null } = {}): VagaComRequisitos & { compatibilidade?: number | null } => ({
    id, titulo: `Estágio ${id}`, empresa: "Acme", cidade: "Recife, Pernambuco", cidadeNome: "Recife", uf: "PE", modalidade: "presencial",
    tipo: "estagio", contrato: "estagio", area: "Programação", descricao: "", detalhes: "", link: "https://exemplo.com", ativa: true, primeiraVezEm: new Date(),
    origem: "gupy", publicadaEm: null, salarioMin: null, salarioMax: null, salarioOrigem: "", requisitos: [], ...extra,
  });
  const base = {
    nomeDaPessoa: "Ana Maria Souza",
    para: "ana@exemplo.com",
    alerta: { nome: "Vagas em Recife (PE)", token: "tok_123-abc", ...filtros({ uf: "PE", cidade: "Recife" }) },
    enderecoDoSite: "https://techvagas.exemplo",
    agora: new Date("2026-10-25T12:00:00Z"),
  };

  it("assunto no singular e no plural", () => {
    expect(montarEmailDoAlerta({ ...base, vagas: [vaga(1)] }).assunto).toBe("TechVagas: 1 vaga nova · Vagas em Recife (PE)");
    expect(montarEmailDoAlerta({ ...base, vagas: [vaga(1), vaga(2)] }).assunto).toBe("TechVagas: 2 vagas novas · Vagas em Recife (PE)");
  });

  it("texto com os links da vaga, da lista, dos alertas e do cancelamento", () => {
    const m = montarEmailDoAlerta({ ...base, vagas: [vaga(7, { salarioMin: 1500, salarioMax: 1900, compatibilidade: 80, publicadaEm: new Date("2026-10-24T08:00:00Z") })] });
    expect(m.para).toBe("ana@exemplo.com");
    expect(m.texto).toContain("Olá, Ana!");
    expect(m.texto).toContain("https://techvagas.exemplo/vagas/7");
    expect(m.texto).toContain("Estágio 7");
    expect(m.texto).toContain("Acme · Recife, PE");
    expect(m.texto).toContain("R$ 1.500 a R$ 1.900 por mês");
    expect(m.texto).toContain("Compatibilidade com o seu perfil: 80%");
    expect(m.texto).toContain("ontem");
    expect(m.texto).toContain("https://techvagas.exemplo/vagas?uf=PE&cidade=Recife");
    expect(m.texto).toContain("https://techvagas.exemplo/alertas");
    expect(m.texto).toContain("https://techvagas.exemplo/alertas/cancelar?token=tok_123-abc");
    expect(m.cabecalhos?.["List-Unsubscribe"]).toBe("<https://techvagas.exemplo/alertas/cancelar?token=tok_123-abc>");
  });

  it("ESCAPA o HTML vindo das fontes (título, empresa, cidade) para ninguém injetar código no e-mail", () => {
    const perigosa = vaga(1, {
      titulo: `<script>alert(1)</script> Dev "Jr" & cia`,
      empresa: `<img src=x onerror=alert(2)>`,
      cidadeNome: `<b>Recife</b>`,
    });
    const m = montarEmailDoAlerta({ ...base, nomeDaPessoa: `<i>Ana</i>`, vagas: [perigosa] });
    expect(m.html).not.toContain("<script>");
    expect(m.html).not.toContain("<img src=x");
    expect(m.html).not.toContain("<b>Recife</b>");
    expect(m.html).not.toContain("<i>Ana</i>");
    expect(m.html).toContain("&lt;script&gt;alert(1)&lt;/script&gt; Dev &quot;Jr&quot; &amp; cia");
    expect(m.html).toContain("&lt;img src=x onerror=alert(2)&gt;");
  });

  it("não passa de 15 vagas e diz quantas ficaram de fora", () => {
    const vagas = Array.from({ length: 20 }, (_, i) => vaga(i + 1));
    const m = montarEmailDoAlerta({ ...base, vagas });
    expect(MAX_VAGAS_NO_EMAIL).toBe(15);
    expect(m.texto).toContain("https://techvagas.exemplo/vagas/15");
    expect(m.texto).not.toContain("https://techvagas.exemplo/vagas/16");
    expect(m.texto).toContain("... e mais 5 vagas.");
    expect(m.assunto).toContain("20 vagas novas");
    expect(montarEmailDoAlerta({ ...base, vagas: Array.from({ length: 16 }, (_, i) => vaga(i + 1)) }).texto).toContain("... e mais 1 vaga.");
  });

  it("o token vai codificado no endereço", () => {
    const m = montarEmailDoAlerta({ ...base, alerta: { ...base.alerta, token: "a b&c" }, vagas: [vaga(1)] });
    expect(m.texto).toContain("token=a%20b%26c");
  });
});

describe("escaparHtml", () => {
  it("escapa os cinco caracteres perigosos", () => {
    expect(escaparHtml(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;&#39;");
    expect(escaparHtml("texto normal")).toBe("texto normal");
  });
});
