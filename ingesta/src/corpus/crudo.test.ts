import { describe, expect, it } from "vitest";
import { SLUG_SEGURO, bancoDeLaTarjeta, comercioDeLaTarjeta, esObjeto, legalDelCrudo, slugDelCrudo } from "./crudo.ts";

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

describe("comercioDeLaTarjeta y bancoDeLaTarjeta", () => {
  it("leen la tarjeta de /v2/slots (card.validity_place y card.participating_bank), recortados", () => {
    const tarjeta = { card: { validity_place: "  COTO ", participating_bank: "Bancos adheridos" } };
    expect(comercioDeLaTarjeta(tarjeta)).toBe("COTO");
    expect(bancoDeLaTarjeta(tarjeta)).toBe("Bancos adheridos");
  });

  it("leen también la tarjeta del listado anterior (fila 0 el comercio, fila 5 el banco)", () => {
    const tarjeta = { content: { row: [{ text: "  Paladini " }, {}, {}, {}, {}, { text: "ICBC" }] } };
    expect(comercioDeLaTarjeta(tarjeta)).toBe("Paladini");
    expect(bancoDeLaTarjeta(tarjeta)).toBe("ICBC");
  });

  it("null si falta, está en blanco o la tarjeta no tiene la forma esperada", () => {
    expect(comercioDeLaTarjeta({ card: { validity_place: "   " } })).toBeNull();
    expect(bancoDeLaTarjeta({ card: {} })).toBeNull();
    expect(bancoDeLaTarjeta({ content: { row: [{ text: "x" }] } })).toBeNull();
    expect(comercioDeLaTarjeta(null)).toBeNull();
    expect(comercioDeLaTarjeta({})).toBeNull();
    expect(comercioDeLaTarjeta({ content: { row: "x" } })).toBeNull();
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
