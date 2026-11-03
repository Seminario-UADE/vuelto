import { CATEGORIAS_MODO, normalizar } from "@vuelto/motor";
import { describe, expect, it } from "vitest";

// Comprueba que el workspace resuelve `@vuelto/motor` y que la suite corre sin red.
describe("workspace ingesta", () => {
  it("importa el motor", () => {
    expect(CATEGORIAS_MODO).toHaveLength(13);
    expect(normalizar("  BANCOR  ")).toBe("bancor");
  });
});
