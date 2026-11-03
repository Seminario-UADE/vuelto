import { describe, expect, it } from "vitest";
import { idDePromocion, slugBase, uuidV5 } from "./ids.ts";

const NAMESPACE_DNS = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

describe("uuidV5", () => {
  it("coincide con el vector de prueba de la RFC 4122 (namespace DNS, www.example.com)", () => {
    expect(uuidV5(NAMESPACE_DNS, "www.example.com")).toBe("2ed6657d-e927-568b-95e1-2665a8aea6a2");
  });

  it("rechaza un namespace que no es un UUID", () => {
    expect(() => uuidV5("no-es-uuid", "x")).toThrow(/namespace/i);
  });
});

describe("idDePromocion", () => {
  const UUID_V5 = /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

  it("devuelve un UUID de versión 5", () => {
    expect(idDePromocion("manual", "20-paladini-icbc-ago26")).toMatch(UUID_V5);
  });

  it("es determinista", () => {
    expect(idDePromocion("manual", "x")).toBe(idDePromocion("manual", "x"));
  });

  it("cambia con el fuenteId y con la fuente", () => {
    expect(idDePromocion("manual", "x")).not.toBe(idDePromocion("manual", "y"));
    expect(idDePromocion("manual", "x")).not.toBe(idDePromocion("modo", "x"));
  });

  it("distingue las entradas de una promo partida por su sufijo", () => {
    const a = idDePromocion("manual", "dona-catalina-nov26#b-049ad22b");
    const b = idDePromocion("manual", "dona-catalina-nov26#b-167504f6");
    expect(a).not.toBe(b);
  });

  it("rechaza un fuenteId vacío", () => {
    expect(() => idDePromocion("manual", "  ")).toThrow(/fuenteId/);
  });
});

describe("slugBase", () => {
  it("saca el sufijo de una promo partida", () => {
    expect(slugBase("dona-catalina-nov26#b-049ad22b.c-1")).toBe("dona-catalina-nov26");
    expect(slugBase("20-paladini-icbc-ago26")).toBe("20-paladini-icbc-ago26");
  });
});
