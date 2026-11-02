import { describe, expect, it } from "vitest";
import { comprasOctubre } from "../fixtures";
import { esDeEjemplo, esUuid } from "./ejemplo";

describe("esDeEjemplo (R10)", () => {
  it("es verdadero para los ids de comprasOctubre", () => {
    for (const c of comprasOctubre) expect(esDeEjemplo(c.id)).toBe(true);
  });

  it("es falso para un UUID y para un id guardado antes de la feature", () => {
    expect(esDeEjemplo("00000000-0000-4000-8000-000000000001")).toBe(false);
    expect(esDeEjemplo("n3")).toBe(false);
  });
});

describe("esUuid", () => {
  it("acepta un UUID v4 y rechaza lo demás", () => {
    expect(esUuid("a2000000-0000-4000-8000-000000000001")).toBe(true);
    expect(esUuid("n3")).toBe(false);
    expect(esUuid("c1")).toBe(false);
    expect(esUuid("")).toBe(false);
  });
});
