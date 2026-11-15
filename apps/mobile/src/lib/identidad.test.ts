import { describe, expect, it } from "vitest";
import { idDeReferencia } from "./identidad";

describe("idDeReferencia", () => {
  it("la misma referencia da siempre el mismo id", () => {
    const o = { compras: [1, 2] };
    expect(idDeReferencia(o)).toBe(idDeReferencia(o));
  });

  it("otra referencia da otro id, aunque tenga el mismo contenido o la misma cantidad", () => {
    expect(idDeReferencia({ compras: [1, 2] })).not.toBe(idDeReferencia({ compras: [1, 2] }));
    expect(idDeReferencia({ compras: [1, 2] })).not.toBe(idDeReferencia({ compras: [3, 4] }));
  });
});
