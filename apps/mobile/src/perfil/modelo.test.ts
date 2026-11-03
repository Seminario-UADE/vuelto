import { describe, expect, it } from "vitest";
import {
  clasificarError,
  comercioRepetido,
  esDuplicado,
  ETIQUETAS_RED,
  puedeConfirmar,
  puedeSacar,
  REDES,
  TIPOS_TARJETA,
  type MedioDePago,
  type MedioNuevo,
} from "./modelo";

const GALICIA = "88d8705e-2dda-46f9-8411-bb4916af858e";
const SANTANDER = "5b1c3a7e-0000-4000-8000-000000000072";
const galiciaCreditoVisa: MedioNuevo = { bancoId: GALICIA, tipo: "credito", red: "visa" };

describe("esDuplicado", () => {
  it("es duplicado con la misma tripleta", () => {
    expect(esDuplicado([galiciaCreditoVisa], { ...galiciaCreditoVisa })).toBe(true);
  });

  it("no es duplicado si cambia solo la red (US1-3)", () => {
    expect(esDuplicado([galiciaCreditoVisa], { ...galiciaCreditoVisa, red: "american_express" })).toBe(false);
  });

  it("no es duplicado si cambia solo el tipo o solo el banco", () => {
    expect(esDuplicado([galiciaCreditoVisa], { ...galiciaCreditoVisa, tipo: "debito" })).toBe(false);
    expect(esDuplicado([galiciaCreditoVisa], { ...galiciaCreditoVisa, bancoId: SANTANDER })).toBe(false);
  });

  it("sin medios, nada es duplicado", () => {
    expect(esDuplicado([], galiciaCreditoVisa)).toBe(false);
  });
});

describe("mínimo de un medio (FR-007, FR-009)", () => {
  it("puedeConfirmar: hace falta al menos uno", () => {
    expect(puedeConfirmar([])).toBe(false);
    expect(puedeConfirmar([galiciaCreditoVisa])).toBe(true);
  });

  it("puedeSacar: no se puede sacar el último", () => {
    const guardado = (id: string, red: MedioDePago["red"]): MedioDePago => ({ ...galiciaCreditoVisa, id, nombreBanco: "Banco Galicia", red });
    expect(puedeSacar([guardado("m1", "visa")])).toBe(false);
    expect(puedeSacar([guardado("m1", "visa"), guardado("m2", "master")])).toBe(true);
  });
});

describe("clasificarError", () => {
  it("23505 es un duplicado", () => {
    expect(clasificarError({ status: 409, code: "23505" })).toBe("duplicado");
  });

  it("23503 es un banco que ya no está", () => {
    expect(clasificarError({ status: 409, code: "23503" })).toBe("banco_inexistente");
    expect(clasificarError({ status: 400, code: "VM001" })).toBe("ultimo_medio");
  });

  it("401 es la sesión vencida", () => {
    expect(clasificarError({ status: 401, code: "PGRST301" })).toBe("sesion_vencida");
  });

  it("status 0 es sin conexión", () => {
    expect(clasificarError({ status: 0, code: null })).toBe("sin_conexion");
  });

  it("cualquier otro caso es genérico", () => {
    expect(clasificarError({ status: 500, code: "XX000" })).toBe("otro");
    expect(clasificarError({ status: 400, code: null })).toBe("otro");
  });
});

describe("etiquetas", () => {
  it("cada red tiene su etiqueta visible", () => {
    expect(ETIQUETAS_RED).toMatchObject({ master: "Mastercard", dinners_club: "Diners Club", tarjeta_sol: "Tarjeta Sol" });
    expect(REDES).toHaveLength(9);
    expect(TIPOS_TARJETA).toEqual(["debito", "credito"]);
  });
});

describe("comercioRepetido (issue #47)", () => {
  it("ignora mayúsculas y espacios de más, como el índice único de la base", () => {
    expect(comercioRepetido([{ nombre: "Coto" }], "  coto ")).toBe(true);
    expect(comercioRepetido([{ nombre: "Café  Martínez" }], "café martínez")).toBe(true);
  });

  it("los acentos cuentan: «Dia» y «Día» son distintos", () => {
    expect(comercioRepetido([{ nombre: "Día" }], "Dia")).toBe(false);
  });
});
