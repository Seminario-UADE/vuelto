import { describe, expect, it } from "vitest";
import { textoBase, textoReintegro } from "./textos";

describe("textoReintegro: «Te devuelven» con su base, bien puntuado", () => {
  it("con compras, la base es una cola en minúscula que va después de una coma", () => {
    const base = textoBase(1, "mes", "noviembre").texto;
    expect(textoReintegro(8000, base)).toBe("Te devuelven ≈$8.000, según 1 compra de noviembre");
  });

  it("sin compras registradas, la base es una oración entera: va aparte y sin doble punto", () => {
    const base = textoBase(0, "mes", "noviembre").texto;
    const texto = textoReintegro(10000, base);
    expect(texto).toBe("Te devuelven ≈$10.000. Sin compras registradas este mes: todavía no podemos estimar cuánto te queda");
    expect(`${texto}.`).not.toMatch(/\.\.|, [A-ZÁÉÍÓÚ]/);
  });

  it("sin base, solo la cifra estimada", () => {
    expect(textoReintegro(4900, null)).toBe("Te devuelven ≈$4.900");
  });
});
