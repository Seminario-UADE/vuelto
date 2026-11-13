import { describe, expect, it } from "vitest";
import { LARGO_MAXIMO_TEXTO, cuitValido, recortar, taparDatosPersonales } from "./privacidad.ts";

describe("taparDatosPersonales: tarjetas (US2-2)", () => {
  it.each([
    ["4509 9535 6623 3704", "****3704"],
    ["4509-9535-6623-3704", "****3704"],
    ["4509953566233704", "****3704"],
    ["XXXX XXXX XXXX 3704", "****3704"],
    ["**** **** **** 3704", "****3704"],
    ["xxxx3704", "****3704"],
    // Ya enmascarada como la imprimió el ticket del bar (prueba manual): queda igual.
    ["**** 4114", "****4114"],
  ])("%s → %s", (texto, esperado) => {
    expect(taparDatosPersonales(`VISA DEBITO ${texto} OK`)).toBe(`VISA DEBITO ${esperado} OK`);
  });

  it("una tarjeta agrupada se tapa aunque un dígito esté mal leído (no cumple la cuenta de control)", () => {
    expect(taparDatosPersonales("VISA 4509 9535 6623 3705")).toBe("VISA ****3705");
  });

  it("13 a 19 dígitos juntos se tapan solo si cumplen la cuenta de control", () => {
    expect(taparDatosPersonales("4509953566233704")).toBe("****3704");
    expect(taparDatosPersonales("4509953566233705")).toBe("4509953566233705");
  });

  it("no toca números de los tickets reales que no son tarjetas", () => {
    // Factura de 13 dígitos con guion, AID de la terminal y registro (prueba manual, 13/11),
    // y un código de barras de 13 dígitos que no cumple la cuenta de control de las tarjetas.
    const texto = [
      "Tique Factura B 00113-00117019",
      "AID A0000000031110",
      "REGISTRO: EPEPA0000023001",
      "7790001234567",
    ].join("\n");
    expect(taparDatosPersonales(texto)).toBe(texto);
  });

  it("no toca números cortos ni importes", () => {
    const texto = "ID Transacción 17228423\nTicket 3579 Terminal 1\nTOTAL 31.800";
    expect(taparDatosPersonales(texto)).toBe(texto);
  });
});

describe("taparDatosPersonales: CUIT y CUIL (US2-3, US2-4)", () => {
  it.each([
    ["CUIT 20-12345678-6", "CUIT [DATO PERSONAL]"],
    ["20123456786", "[DATO PERSONAL]"],
    ["CUIL: 27-33445566-7", "CUIL: [DATO PERSONAL]"],
  ])("de una persona: %s → %s", (texto, esperado) => {
    expect(taparDatosPersonales(texto)).toBe(esperado);
  });

  it.each([
    // Empresa: prefijo 30, 33 o 34 (tickets reales de la prueba manual).
    "C.U.I.T. Nro.: 30-71817931-5",
    "CUIT 30-50121458-9",
    "CUIT 33-99887766-6",
    // Prefijo de persona pero dígito verificador inválido: no es un CUIT.
    "20-12345678-5",
  ])("queda visible: %s", (texto) => {
    expect(taparDatosPersonales(texto)).toBe(texto);
  });
});

describe("taparDatosPersonales: DNI (US2-5, US2-7)", () => {
  it.each([
    ["DNI: 12345678", "DNI: [DATO PERSONAL]"],
    ["D.N.I. 12.345.678", "D.N.I. [DATO PERSONAL]"],
    ["Documento 1234567", "Documento [DATO PERSONAL]"],
    ["DOC 30.123.456", "DOC [DATO PERSONAL]"],
    ["dni 12345678", "dni [DATO PERSONAL]"],
  ])("%s → %s", (texto, esperado) => {
    expect(taparDatosPersonales(texto)).toBe(esperado);
  });

  it("un número no anunciado como DNI queda visible", () => {
    expect(taparDatosPersonales("Cód. 12345678")).toBe("Cód. 12345678");
  });
});

describe("taparDatosPersonales: limitaciones conocidas", () => {
  it("un nombre que el proveedor no tapó queda visible (se mide en #10)", () => {
    expect(taparDatosPersonales("Mozo:(21) Fabi")).toBe("Mozo:(21) Fabi");
  });
});

describe("cuitValido", () => {
  it("acepta un dígito verificador correcto y rechaza uno incorrecto", () => {
    expect(cuitValido("20123456786")).toBe(true);
    expect(cuitValido("30718179315")).toBe(true);
    expect(cuitValido("20123456785")).toBe(false);
    expect(cuitValido("2012345678")).toBe(false);
  });
});

describe("recortar", () => {
  it("deja igual un texto que entra", () => {
    expect(recortar("TOTAL 100")).toBe("TOTAL 100");
  });

  it("corta a 10.000 caracteres y agrega […]", () => {
    const texto = "a".repeat(12_000);
    const r = recortar(texto);
    expect(r.endsWith("[…]")).toBe(true);
    expect(r.length).toBe(LARGO_MAXIMO_TEXTO + "[…]".length);
  });

  it("primero se tapa y después se recorta: una tarjeta en el borde no queda a medias", () => {
    const texto = `${"a".repeat(9_990)} 4509 9535 6623 3704 ${"b".repeat(2_000)}`;
    const r = recortar(taparDatosPersonales(texto));
    expect(r).toContain("****3704");
    expect(r).not.toMatch(/4509/);
  });
});
