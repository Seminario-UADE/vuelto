import { describe, expect, it } from "vitest";
import { SLUG_SEGURO, bancoDeLaTarjeta, comercioDeLaTarjeta, esObjeto, jsonCanonico } from "./crudo.ts";

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

describe("jsonCanonico", () => {
  it("ordena las claves de cada objeto, también las anidadas, y respeta el orden de las listas", () => {
    expect(jsonCanonico({ b: 1, a: { d: [3, { f: 1, e: 2 }], c: null } })).toBe('{"a":{"c":null,"d":[3,{"e":2,"f":1}]},"b":1}');
  });

  it("dos objetos iguales con las claves en otro orden dan el mismo texto", () => {
    expect(jsonCanonico({ x: 1, y: 2 })).toBe(jsonCanonico({ y: 2, x: 1 }));
  });
});
