import { describe, expect, it } from "vitest";
import { space } from "../theme";
import { margenBajoLaCapsula } from "./margen-tab-bar";

describe("margenBajoLaCapsula", () => {
  it("sin zona segura deja el margen de siempre", () => {
    expect(margenBajoLaCapsula(0)).toBe(space.md);
  });

  it("con el indicador de inicio de un iPhone (34 pt) baja la cápsula, pero no hasta el borde", () => {
    expect(margenBajoLaCapsula(34)).toBe(34 - space.md);
    expect(margenBajoLaCapsula(34)).toBeLessThan(34);
    expect(margenBajoLaCapsula(34)).toBeGreaterThanOrEqual(13); // sigue por encima del indicador
  });

  it("nunca baja del margen mínimo con zonas seguras chicas", () => {
    expect(margenBajoLaCapsula(20)).toBe(space.md);
  });
});
