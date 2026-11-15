import { describe, expect, it } from "vitest";
import { anchoColumnaRedes, columnasRedes } from "./columnas-redes";

describe("columnasRedes", () => {
  it("con ancho de sobra y letra normal entran 3 columnas (3 × 3 = las 9 redes)", () => {
    expect(columnasRedes(335, 1)).toBe(3);
    expect(columnasRedes(380, 1)).toBe(3);
  });

  it("en un celular angosto, la palabra más larga («Mastercard») no entra en 3: pasa a 2", () => {
    expect(columnasRedes(280, 1)).toBe(2);
  });

  it("con letra grande pasa a menos columnas", () => {
    expect(columnasRedes(335, 1.3)).toBe(2);
    expect(columnasRedes(280, 1.6)).toBe(1);
  });

  it("con letra enorme o muy poco ancho queda 1 columna, nunca menos", () => {
    expect(columnasRedes(335, 2)).toBe(1);
    expect(columnasRedes(120, 1)).toBe(1);
    expect(columnasRedes(0, 1)).toBe(1);
  });

  it("más letra o menos ancho nunca suman columnas", () => {
    for (const ancho of [200, 248, 280, 335, 380, 420]) {
      let anterior = 3;
      for (const escala of [1, 1.1, 1.2, 1.3, 1.5, 1.8, 2]) {
        const cols = columnasRedes(ancho, escala);
        expect(cols).toBeLessThanOrEqual(anterior);
        expect(cols).toBeGreaterThanOrEqual(1);
        anterior = cols;
      }
    }
  });

  it("el ancho de cada columna reparte el ancho menos los huecos, sin pasarse", () => {
    for (const cols of [1, 2, 3] as const) {
      const w = anchoColumnaRedes(335, cols);
      expect(w * cols + 8 * (cols - 1)).toBeLessThanOrEqual(335);
      expect(w).toBeGreaterThan(0);
    }
  });
});
