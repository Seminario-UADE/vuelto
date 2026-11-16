import { describe, expect, it } from "vitest";
import { dividir } from "./division.ts";

// Spec 016, FR-006 y D3: pesos enteros, el resto de a $1 a los primeros del orden recibido.
describe("dividir", () => {
  it("US1-11: $10.000 entre 3 → el $1 extra va al primero", () => {
    expect(dividir(10000, 3)).toEqual([3334, 3333, 3333]);
  });

  it("US1-12: $36.000 entre 4 → $9.000 cada uno", () => {
    expect(dividir(36000, 4)).toEqual([9000, 9000, 9000, 9000]);
  });

  it("US1-13: $8.000 entre 3 → el resto de $2 a los dos primeros", () => {
    expect(dividir(8000, 3)).toEqual([2667, 2667, 2666]);
  });

  it("US1-16: total 0 → nadie pone nada", () => {
    expect(dividir(0, 4)).toEqual([0, 0, 0, 0]);
  });

  it("SC-002: la suma es el total y ninguna parte difiere de otra en más de $1", () => {
    for (let total = 0; total <= 500; total++) {
      for (let n = 2; n <= 12; n++) {
        const partes = dividir(total, n);
        expect(partes).toHaveLength(n);
        expect(partes.reduce((a, b) => a + b, 0)).toBe(total);
        expect(Math.max(...partes) - Math.min(...partes)).toBeLessThanOrEqual(1);
        expect(partes.every((p) => Number.isInteger(p) && p >= 0)).toBe(true);
      }
    }
  });

  it("rechaza un total negativo o no entero y una cantidad que no es un entero ≥ 1", () => {
    expect(() => dividir(-1, 3)).toThrow(RangeError);
    expect(() => dividir(10.5, 3)).toThrow(RangeError);
    expect(() => dividir(100, 0)).toThrow(RangeError);
    expect(() => dividir(100, 2.5)).toThrow(RangeError);
  });
});
