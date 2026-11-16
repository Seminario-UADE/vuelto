import { describe, expect, it } from "vitest";
import type { MedioDePago } from "../perfil/modelo";
import { sugerirMedio, textoLeido, type MedioLeido } from "./sugerencia";

function tarjeta(id: string, datos: Partial<MedioDePago>): MedioDePago {
  return { id, bancoId: "b", nombreBanco: "Banco Galicia", tipo: "debito", red: "visa", ...datos };
}

function leido(datos: Partial<MedioLeido>): MedioLeido {
  return { banco: null, tipo: null, red: null, ultimos4: null, ...datos };
}

const galiciaVisaDebito = tarjeta("gvd", {});
const galiciaVisaCredito = tarjeta("gvc", { tipo: "credito" });
const santanderMasterCredito = tarjeta("smc", { nombreBanco: "Banco Santander", tipo: "credito", red: "master" });

describe("sugerirMedio (FR-008)", () => {
  it("VISA débito y una sola tarjeta Visa débito → sugerida", () => {
    expect(sugerirMedio(leido({ red: "visa", tipo: "debito" }), [galiciaVisaDebito, santanderMasterCredito])).toEqual({
      tipo: "sugerida",
      medioId: "gvd",
    });
  });

  it("VISA y dos tarjetas Visa → sin coincidencia, con «Visa»", () => {
    expect(sugerirMedio(leido({ red: "visa" }), [galiciaVisaDebito, galiciaVisaCredito])).toEqual({
      tipo: "sin_coincidencia",
      leido: "Visa",
    });
  });

  it("una red que no tiene ninguna tarjeta → sin coincidencia", () => {
    expect(sugerirMedio(leido({ red: "cabal", tipo: "debito" }), [galiciaVisaDebito])).toEqual({
      tipo: "sin_coincidencia",
      leido: "Cabal débito",
    });
  });

  it("solo crédito: con una sola tarjeta de crédito se sugiere; con dos, no", () => {
    expect(sugerirMedio(leido({ tipo: "credito" }), [galiciaVisaDebito, galiciaVisaCredito])).toEqual({
      tipo: "sugerida",
      medioId: "gvc",
    });
    expect(sugerirMedio(leido({ tipo: "credito" }), [galiciaVisaCredito, santanderMasterCredito])).toEqual({
      tipo: "sin_coincidencia",
      leido: "crédito",
    });
  });

  it("sin red ni tipo → sin medio, aunque traiga banco o últimos 4", () => {
    expect(sugerirMedio(leido({ banco: "BCO GALICIA", ultimos4: "1234" }), [galiciaVisaDebito])).toEqual({
      tipo: "sin_medio",
    });
  });

  it("el banco del ticket se compara sin «banco» ni «bco»", () => {
    const tarjetas = [galiciaVisaCredito, tarjeta("svc", { nombreBanco: "Banco Santander", tipo: "credito" })];
    expect(sugerirMedio(leido({ red: "visa", banco: "BCO GALICIA" }), tarjetas)).toEqual({
      tipo: "sugerida",
      medioId: "gvc",
    });
    expect(sugerirMedio(leido({ red: "visa", banco: "Bco. Santander Río" }), tarjetas)).toEqual({
      tipo: "sugerida",
      medioId: "svc",
    });
    expect(sugerirMedio(leido({ red: "visa", banco: "BBVA" }), tarjetas)).toEqual({
      tipo: "sin_coincidencia",
      leido: "Visa",
    });
  });

  it("una tarjeta sin banco cargado no filtra por banco", () => {
    const sinBanco = tarjeta("x", { nombreBanco: null });
    expect(sugerirMedio(leido({ red: "visa", tipo: "debito", banco: "BCO GALICIA" }), [sinBanco])).toEqual({
      tipo: "sugerida",
      medioId: "x",
    });
  });

  it("los últimos 4 no cambian nada (el perfil no los guarda)", () => {
    expect(sugerirMedio(leido({ red: "visa", tipo: "debito", ultimos4: "9999" }), [galiciaVisaDebito])).toEqual({
      tipo: "sugerida",
      medioId: "gvd",
    });
  });

  it("sin tarjetas en el perfil → sin coincidencia", () => {
    expect(sugerirMedio(leido({ red: "visa" }), [])).toEqual({ tipo: "sin_coincidencia", leido: "Visa" });
  });
});

describe("textoLeido", () => {
  it.each([
    [{ red: "visa", tipo: "debito" }, "Visa débito"],
    [{ red: "master", tipo: "credito" }, "Mastercard crédito"],
    [{ red: "dinners_club" }, "Diners Club"],
    [{ red: "tarjeta_sol" }, "Tarjeta Sol"],
    [{ red: "american_express" }, "American Express"],
    [{ tipo: "credito" }, "crédito"],
    [{ tipo: "debito" }, "débito"],
  ] as const)("%j → %s", (datos, esperado) => {
    expect(textoLeido(leido(datos))).toBe(esperado);
  });
});
