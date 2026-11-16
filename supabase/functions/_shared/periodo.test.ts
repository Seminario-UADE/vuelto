import { describe, expect, it } from "vitest";
import { inicioDeConsumos, promosReferenciadasQueFaltan } from "./periodo.ts";
import { promo } from "./test/fabricas.ts";

describe("inicioDeConsumos", () => {
  it("el inicio del mes, salvo que la semana haya empezado antes", () => {
    expect(inicioDeConsumos("2026-11-15")).toBe("2026-11-01");
    // Domingo 1/11: la semana arrancó el lunes 26/10.
    expect(inicioDeConsumos("2026-11-01")).toBe("2026-10-26");
  });
});

describe("promosReferenciadasQueFaltan", () => {
  it("los ids de las compras que no están entre las promos, sin repetir ni nulos", () => {
    const consumos = [{ promocionId: "a" }, { promocionId: "b" }, { promocionId: "b" }, { promocionId: null }];
    expect(promosReferenciadasQueFaltan(consumos, [promo({ id: "a" })])).toEqual(["b"]);
    expect(promosReferenciadasQueFaltan([], [])).toEqual([]);
  });
});
