import { describe, expect, it } from "vitest";
import { FILA_BANCO, FILA_COMERCIO, SLUG_SEGURO, esObjeto, legalDelCrudo, slugDelCrudo, textoDeLaFila } from "./crudo.ts";

describe("esObjeto", () => {
  it("distingue un objeto de null, un arreglo y un primitivo", () => {
    expect(esObjeto({})).toBe(true);
    expect(esObjeto(null)).toBe(false);
    expect(esObjeto([])).toBe(false);
    expect(esObjeto("x")).toBe(false);
  });
});

describe("SLUG_SEGURO", () => {
  it.each(["20-paladini-icbc-ago26", "a", "x.y_z-1"])("acepta %s", (slug) => {
    expect(SLUG_SEGURO.test(slug)).toBe(true);
  });

  it.each(["../x", "a/b", "", "-a", ".a", "a b", "a\\b"])("rechaza %j", (slug) => {
    expect(SLUG_SEGURO.test(slug)).toBe(false);
  });
});

describe("textoDeLaFila", () => {
  const tarjeta = { content: { row: [{ text: "  Paladini " }, {}, {}, {}, {}, { text: "ICBC" }, { text: "   " }] } };

  it("devuelve el texto recortado de la celda pedida", () => {
    expect(textoDeLaFila(tarjeta, FILA_COMERCIO)).toBe("Paladini");
    expect(textoDeLaFila(tarjeta, FILA_BANCO)).toBe("ICBC");
  });

  it("null si la celda no existe, no tiene texto o está en blanco", () => {
    expect(textoDeLaFila(tarjeta, 1)).toBeNull();
    expect(textoDeLaFila(tarjeta, 6)).toBeNull();
    expect(textoDeLaFila(tarjeta, 99)).toBeNull();
  });

  it("null si la tarjeta no tiene la forma esperada", () => {
    expect(textoDeLaFila(null, 0)).toBeNull();
    expect(textoDeLaFila({}, 0)).toBeNull();
    expect(textoDeLaFila({ content: { row: "x" } }, 0)).toBeNull();
  });

  it("las posiciones de comercio y banco son las de la tarjeta de MODO", () => {
    expect(FILA_COMERCIO).toBe(0);
    expect(FILA_BANCO).toBe(5);
  });
});

describe("slugDelCrudo y legalDelCrudo", () => {
  it("leen el slug y la letra chica del detalle", () => {
    const crudo = { detalle: { slug: "a-b", terms_and_conditions: "<p>x</p>" } };
    expect(slugDelCrudo(crudo)).toBe("a-b");
    expect(legalDelCrudo(crudo)).toBe("<p>x</p>");
  });

  it("null y texto vacío cuando no están", () => {
    expect(slugDelCrudo({ detalle: {} })).toBeNull();
    expect(slugDelCrudo({ detalle: null })).toBeNull();
    expect(legalDelCrudo({ detalle: {} })).toBe("");
    expect(legalDelCrudo({ detalle: { terms_and_conditions: 5 } })).toBe("");
  });
});
