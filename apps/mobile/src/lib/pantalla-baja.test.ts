import { describe, expect, it } from "vitest";
import { ALTO_PANTALLA_BAJA, esPantallaBaja } from "./pantalla-baja";

describe("esPantallaBaja", () => {
  it("un iPhone SE (667) es baja", () => expect(esPantallaBaja(667)).toBe(true));
  it("un iPhone grande (852) no", () => expect(esPantallaBaja(852)).toBe(false));
  it("el umbral exacto ya no es baja", () => {
    expect(esPantallaBaja(ALTO_PANTALLA_BAJA - 1)).toBe(true);
    expect(esPantallaBaja(ALTO_PANTALLA_BAJA)).toBe(false);
  });
});
