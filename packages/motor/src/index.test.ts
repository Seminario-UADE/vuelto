import { describe, expect, it } from "vitest";
import { normalizar } from "./index.ts";

// `normalizar` se exporta para que la ingesta compare nombres de banco con la
// misma regla que usa el motor para comparar comercios (issue #35).
describe("normalizar exportada", () => {
  it("pasa a minúsculas y recorta espacios", () => {
    expect(normalizar("  BANCOR  ")).toBe("bancor");
  });

  it("quita acentos y junta espacios", () => {
    expect(normalizar("Banco   Nación")).toBe("banco nacion");
  });
});
