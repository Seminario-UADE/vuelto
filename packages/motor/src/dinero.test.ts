import { describe, expect, it } from "vitest";
import { aCentavos, aCentesimosDePunto, aPesos, aplicarPorcentaje } from "./dinero.ts";

describe("dinero", () => {
  it("convierte pesos a centavos redondeando al más cercano", () => {
    expect(aCentavos(0.29)).toBe(29);
    expect(aCentavos(10000)).toBe(1000000);
  });

  it("convierte el porcentaje a centésimos de punto", () => {
    expect(aCentesimosDePunto(20)).toBe(2000);
    expect(aCentesimosDePunto(33.3)).toBe(3330);
  });

  it("aplica el porcentaje redondeando hacia abajo al centavo", () => {
    expect(aplicarPorcentaje(1000000, 2000)).toBe(200000);
    expect(aplicarPorcentaje(300, 3330)).toBe(99);
  });

  it("convierte centavos a pesos", () => {
    expect(aPesos(150)).toBe(1.5);
  });
});
