import { describe, expect, it } from "vitest";
import { clasificarError } from "./errores";

// contracts/repositorio-compras.md, tabla de clasificación (FR-012).

describe("clasificarError", () => {
  it("sin error es éxito", () => {
    expect(clasificarError(null)).toEqual({ tipo: "exito" });
  });

  it("sin red, aborto por plazo, 5xx, 429, 408 y 401 son transitorios", () => {
    expect(clasificarError({ red: true })).toEqual({ tipo: "transitorio" });
    expect(clasificarError({ aborto: true })).toEqual({ tipo: "transitorio" });
    for (const estado of [500, 502, 503, 429, 408, 401]) {
      expect(clasificarError({ estado })).toEqual({ tipo: "transitorio" });
    }
  });

  it("un dato inválido o una restricción rota se rechazan, con el código como causa", () => {
    for (const codigo of ["22P02", "23514", "23503", "23502", "42501"]) {
      expect(clasificarError({ codigo, estado: 400 })).toEqual({ tipo: "rechazada", causa: codigo });
    }
  });

  it("un código desconocido se reintenta", () => {
    expect(clasificarError({ codigo: "XX000", estado: 400 })).toEqual({ tipo: "transitorio" });
    expect(clasificarError({ estado: 418 })).toEqual({ tipo: "transitorio" });
  });

  it("el código de Postgres manda sobre el estado HTTP", () => {
    expect(clasificarError({ codigo: "23503", estado: 409 })).toEqual({ tipo: "rechazada", causa: "23503" });
  });

  it("la causa nunca lleva datos del usuario", () => {
    const r = clasificarError({ codigo: "23514", estado: 400, mensaje: "monto 5000 en Coto" } as never);
    expect(JSON.stringify(r)).not.toMatch(/Coto|5000/);
  });
});
