import { describe, expect, it } from "vitest";
import {
  normalizarFecha,
  normalizarImporte,
  normalizarRed,
  normalizarTexto,
  normalizarTipo,
  normalizarUltimos4,
} from "./normalizar.ts";

describe("normalizarImporte (formato argentino)", () => {
  it.each([
    ["$ 24.500,00", 24500],
    ["24500,5", 24500.5],
    ["24.500", 24500],
    // Formatos que devolvió Groq con tickets reales (prueba manual, 13/11).
    ["31.800", 31800],
    ["11000,00", 11000],
    ["4800,00", 4800],
    ["1.234.567,89", 1234567.89],
    ["$4800", 4800],
  ])("%s → %d", (impreso, esperado) => {
    expect(normalizarImporte(impreso)).toBe(esperado);
  });

  it.each([
    // Ambiguo: puede ser 24,50 (formato de EE. UU.) o una lectura equivocada.
    "24.50",
    // Más de 2 decimales.
    "1,234",
    "0",
    "0,00",
    "-10",
    "abc",
    "24.500,00 USD",
    "",
  ])("%j → null", (impreso) => {
    expect(normalizarImporte(impreso)).toBeNull();
  });

  it("null queda null", () => {
    expect(normalizarImporte(null)).toBeNull();
  });
});

describe("normalizarFecha (hoy: 14/10/2026 en Argentina)", () => {
  const HOY = "2026-10-14";

  it.each([
    ["14/10/2026", "2026-10-14"],
    ["14-10-26", "2026-10-14"],
    ["14.10.2026", "2026-10-14"],
    ["1/9/2026", "2026-09-01"],
    // Una fecha vieja se acepta: decidir si sirve es de la app (spec 012).
    ["05/03/2019", "2019-03-05"],
    // Fecha y hora juntas, como en el ticket del bar (prueba manual).
    ["13/10/2026 22:40:14", "2026-10-13"],
  ])("%s → %s", (impresa, esperada) => {
    expect(normalizarFecha(impresa, HOY)).toBe(esperada);
  });

  it.each([
    // Sin año: completarlo sería deducir (US1-7).
    "14/10",
    // No existe.
    "31/02/2026",
    // Posterior a hoy.
    "15/10/2026",
    "hoy",
    "",
  ])("%j → null", (impresa) => {
    expect(normalizarFecha(impresa, HOY)).toBeNull();
  });

  it("null queda null", () => {
    expect(normalizarFecha(null, HOY)).toBeNull();
  });
});

describe("normalizarRed (tabla de nombres impresos)", () => {
  it.each([
    ["MASTERCARD", "master"],
    ["master", "master"],
    ["MC", "master"],
    ["Visa Débito", "visa"],
    ["VISA ELECTRON", "visa"],
    ["MAESTRO", "maestro"],
    ["AMEX", "american_express"],
    ["American Express", "american_express"],
    ["DINERS CLUB", "dinners_club"],
    ["CABAL", "cabal"],
    ["Naranja", "naranja"],
    ["CONFIABLE", "confiable"],
    ["TARJETA SOL", "tarjeta_sol"],
  ])("%s → %s", (impresa, esperada) => {
    expect(normalizarRed(impresa)).toBe(esperada);
  });

  it.each([
    // Deducir la red por los dígitos no está permitido (US1-6).
    "4509",
    "TARJETA",
    "Cuenta Corriente",
    // Dos redes distintas: no se elige ninguna.
    "VISA / MASTERCARD",
    "",
  ])("%j → null", (impresa) => {
    expect(normalizarRed(impresa)).toBeNull();
  });

  it("null queda null", () => {
    expect(normalizarRed(null)).toBeNull();
  });
});

describe("normalizarTipo", () => {
  it.each([
    ["DEBITO", "debito"],
    ["débito", "debito"],
    ["Debito", "debito"],
    ["DEB", "debito"],
    ["VISA DEBITO", "debito"],
    ["CRED", "credito"],
    ["TARJETA DE CREDITO", "credito"],
    ["Crédito", "credito"],
  ])("%s → %s", (impreso, esperado) => {
    expect(normalizarTipo(impreso)).toBe(esperado);
  });

  it.each([
    "DEBITO/CREDITO",
    // Groq puso la red en el tipo; no dice débito ni crédito (prueba manual).
    "VISA",
    "Cuenta Corriente",
    "",
  ])("%j → null", (impreso) => {
    expect(normalizarTipo(impreso)).toBeNull();
  });

  it("null queda null", () => {
    expect(normalizarTipo(null)).toBeNull();
  });
});

describe("normalizarUltimos4", () => {
  it.each([
    ["1234", "1234"],
    // Lo impreso, con la máscara: tomar los dígitos no es deducir.
    ["**** 4114", "4114"],
    ["XXXX-1234", "1234"],
  ])("%s → %s", (impresos, esperados) => {
    expect(normalizarUltimos4(impresos)).toBe(esperados);
  });

  it.each(["123", "12345", "12a4", "****", ""])("%j → null", (impresos) => {
    expect(normalizarUltimos4(impresos)).toBeNull();
  });

  it("null queda null", () => {
    expect(normalizarUltimos4(null)).toBeNull();
  });
});

describe("normalizarTexto (banco y comercio)", () => {
  it("recorta y junta los espacios de más", () => {
    expect(normalizarTexto("  BCO   GALICIA ")).toBe("BCO GALICIA");
    expect(normalizarTexto("PIÉNSATE BRAVO")).toBe("PIÉNSATE BRAVO");
  });

  it("vacío o null queda null", () => {
    expect(normalizarTexto("   ")).toBeNull();
    expect(normalizarTexto("")).toBeNull();
    expect(normalizarTexto(null)).toBeNull();
  });
});
