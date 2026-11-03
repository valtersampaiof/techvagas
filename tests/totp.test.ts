import { describe, expect, it } from "vitest";
import {
  base32Codificar,
  base32Decodificar,
  cifrarSegredo,
  codigoTotp,
  decifrarSegredo,
  gerarCodigosDeRecuperacao,
  gerarSegredoTotp,
  normalizarCodigoDeRecuperacao,
  pareceCodigoDeRecuperacao,
  passoDoMomento,
  urlOtpauth,
  verificarTotp,
} from "@/lib/totp";

// Segredo de teste da própria norma (RFC 6238): a palavra "12345678901234567890" em base32.
const SEGREDO_DA_NORMA = base32Codificar(Buffer.from("12345678901234567890"));
const emSegundos = (s: number) => new Date(s * 1000);

describe("TOTP (RFC 6238)", () => {
  it("o segredo da norma em base32 é o esperado", () => {
    expect(SEGREDO_DA_NORMA).toBe("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ");
  });

  it("gera os mesmos códigos dos exemplos oficiais da norma (os 6 últimos dígitos)", () => {
    // Valores de 8 dígitos da norma: 94287082, 07081804, 14050471, 89005924, 69279037, 65353130.
    const casos: [number, string][] = [
      [59, "287082"],
      [1111111109, "081804"],
      [1111111111, "050471"],
      [1234567890, "005924"],
      [2000000000, "279037"],
      [20000000000, "353130"],
    ];
    for (const [segundos, esperado] of casos) expect(codigoTotp(SEGREDO_DA_NORMA, passoDoMomento(emSegundos(segundos))), `T=${segundos}`).toBe(esperado);
  });

  it("base32: ida e volta, e recusa letras inválidas", () => {
    const bytes = Buffer.from([0, 1, 2, 250, 251, 252, 253, 254, 255, 77]);
    expect(base32Decodificar(base32Codificar(bytes))).toEqual(bytes);
    expect(base32Decodificar("gezd gnbv-gy3t")).toEqual(base32Decodificar("GEZDGNBVGY3T"));
    expect(() => base32Decodificar("1890")).toThrow();
  });

  it("segredos novos são longos, em base32 e diferentes a cada vez", () => {
    const a = gerarSegredoTotp();
    expect(a).toMatch(/^[A-Z2-7]{32}$/);
    expect(gerarSegredoTotp()).not.toBe(a);
  });
});

describe("verificarTotp", () => {
  const agora = emSegundos(1111111109);
  const passo = passoDoMomento(agora);

  it("aceita o código do momento e o do passo anterior e do seguinte, mas não os mais distantes", () => {
    expect(verificarTotp(SEGREDO_DA_NORMA, codigoTotp(SEGREDO_DA_NORMA, passo), { agora })).toBe(passo);
    expect(verificarTotp(SEGREDO_DA_NORMA, codigoTotp(SEGREDO_DA_NORMA, passo - 1), { agora })).toBe(passo - 1);
    expect(verificarTotp(SEGREDO_DA_NORMA, codigoTotp(SEGREDO_DA_NORMA, passo + 1), { agora })).toBe(passo + 1);
    expect(verificarTotp(SEGREDO_DA_NORMA, codigoTotp(SEGREDO_DA_NORMA, passo - 2), { agora })).toBeNull();
    expect(verificarTotp(SEGREDO_DA_NORMA, codigoTotp(SEGREDO_DA_NORMA, passo + 2), { agora })).toBeNull();
  });

  it("tolera espaços ('081 804') e recusa o que não é um número de 6 dígitos", () => {
    const codigo = codigoTotp(SEGREDO_DA_NORMA, passo);
    expect(verificarTotp(SEGREDO_DA_NORMA, `${codigo.slice(0, 3)} ${codigo.slice(3)}`, { agora })).toBe(passo);
    for (const ruim of ["", "12345", "1234567", "abcdef", "12 34"]) expect(verificarTotp(SEGREDO_DA_NORMA, ruim, { agora }), ruim).toBeNull();
  });

  it("o mesmo código não vale duas vezes (passo já usado é recusado)", () => {
    const codigo = codigoTotp(SEGREDO_DA_NORMA, passo);
    expect(verificarTotp(SEGREDO_DA_NORMA, codigo, { agora, ultimoPasso: passo })).toBeNull();
    expect(verificarTotp(SEGREDO_DA_NORMA, codigo, { agora, ultimoPasso: passo - 1 })).toBe(passo);
  });

  it("código de outro segredo não vale", () => {
    const outro = gerarSegredoTotp();
    expect(verificarTotp(SEGREDO_DA_NORMA, codigoTotp(outro, passo), { agora })).toBeNull();
  });
});

describe("urlOtpauth", () => {
  it("monta o endereço que o QR code carrega", () => {
    const url = urlOtpauth({ email: "ana+teste@exemplo.com", segredo: "ABC234" });
    expect(url).toBe("otpauth://totp/TechVagas%3Aana%2Bteste%40exemplo.com?secret=ABC234&issuer=TechVagas&algorithm=SHA1&digits=6&period=30");
  });
});

describe("segredo cifrado no banco", () => {
  it("volta igual, é diferente a cada cifra e não deixa o segredo à vista", () => {
    const segredo = gerarSegredoTotp();
    const a = cifrarSegredo(segredo);
    expect(a).not.toContain(segredo);
    expect(cifrarSegredo(segredo)).not.toBe(a);
    expect(decifrarSegredo(a)).toBe(segredo);
  });

  it("texto adulterado ou lixo não decifra", () => {
    const guardado = cifrarSegredo("ABCDEFGH");
    const bruto = Buffer.from(guardado, "base64");
    bruto[bruto.length - 1] ^= 1;
    expect(decifrarSegredo(bruto.toString("base64"))).toBeNull();
    expect(decifrarSegredo("lixo")).toBeNull();
    expect(decifrarSegredo("")).toBeNull();
  });
});

describe("códigos de recuperação", () => {
  it("são 8, no formato XXXXX-XXXXX, sem caracteres que se confundem e sem repetir", () => {
    const codigos = gerarCodigosDeRecuperacao();
    expect(codigos).toHaveLength(8);
    expect(new Set(codigos).size).toBe(8);
    for (const c of codigos) expect(c).toMatch(/^[A-HJKMNP-Z2-9]{5}-[A-HJKMNP-Z2-9]{5}$/);
  });

  it("maiúsculas, hífen e espaços não importam", () => {
    expect(normalizarCodigoDeRecuperacao("abcde-fghjk")).toBe("ABCDEFGHJK");
    expect(normalizarCodigoDeRecuperacao("ABCDE FGHJK")).toBe("ABCDEFGHJK");
  });

  it("distingue código de recuperação de código do aplicativo", () => {
    expect(pareceCodigoDeRecuperacao("ABCDE-FGHJK")).toBe(true);
    expect(pareceCodigoDeRecuperacao("287082")).toBe(false);
    expect(pareceCodigoDeRecuperacao("287 082")).toBe(false);
    expect(pareceCodigoDeRecuperacao("abc")).toBe(false);
  });
});
