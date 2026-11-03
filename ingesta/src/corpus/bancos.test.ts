import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ALIAS_BANCOS } from "./bancos-alias.ts";
import { contrastar, indexarCatalogo, resolverBanco } from "./bancos.ts";
import type { BancoCatalogo } from "./tipos.ts";

const CATALOGO: BancoCatalogo[] = [
  { id: "id-macro", name: "Macro" },
  { id: "id-hipotecario", name: "Hipotecario" },
  { id: "id-nacion", name: "Banco Nación" },
  { id: "id-comafi", name: "Comafi" },
  { id: "id-credicoop", name: "Credicoop" },
  { id: "id-columbia", name: "Banco Columbia" },
  { id: "id-ciudad", name: "Ciudad" },
  { id: "id-buepp", name: "Buepp" },
  { id: "id-bancor", name: "Bancor" },
];

describe("resolverBanco — comparación normalizada", () => {
  it.each(["Bancor", "BANCOR", "  bancor ", "BaNcOr"])("%j resuelve a Bancor", (nombre) => {
    expect(resolverBanco(nombre, CATALOGO)?.id).toBe("id-bancor");
  });

  it("ignora acentos y espacios de más", () => {
    expect(resolverBanco("banco   nacion", CATALOGO)?.id).toBe("id-nacion");
    expect(resolverBanco("Macro ", CATALOGO)?.id).toBe("id-macro");
  });
});

describe("resolverBanco — alias explícitos", () => {
  it.each([
    ["Banco Macro", "id-macro"],
    ["Banco Hipotecario", "id-hipotecario"],
    ["BNA", "id-nacion"],
    ["Banco Comafi", "id-comafi"],
    ["Banco Credicoop", "id-credicoop"],
    ["Columbia", "id-columbia"],
  ])("%s resuelve por alias", (nombre, id) => {
    expect(resolverBanco(nombre, CATALOGO)?.id).toBe(id);
  });

  it("el alias también ignora mayúsculas y acentos", () => {
    expect(resolverBanco("  banco  MACRO", CATALOGO)?.id).toBe("id-macro");
  });
});

describe("resolverBanco — lo que no se resuelve", () => {
  it.each([
    ["Bancos adheridos", "no es un banco"],
    ["Ciudad / Buepp", "son dos bancos del catálogo: ambiguo"],
    ["Macro Selecta", "es un nivel de cliente, no se resuelve por alias"],
    ["Banco Inventado", "no existe"],
    ["", "vacío"],
  ])("%j da null (%s)", (nombre) => {
    expect(resolverBanco(nombre, CATALOGO)).toBeNull();
  });

  it("no resuelve por coincidencia parcial", () => {
    expect(resolverBanco("Mac", CATALOGO)).toBeNull();
    expect(resolverBanco("Banco", CATALOGO)).toBeNull();
  });
});

describe("indexarCatalogo — ambigüedad = excluir", () => {
  it("lanza si dos entradas del catálogo normalizan igual", () => {
    const repetido = [...CATALOGO, { id: "id-macro-2", name: "MACRO" }];
    expect(() => indexarCatalogo(repetido)).toThrow(/ambig/i);
    expect(() => resolverBanco("Macro", repetido)).toThrow(/ambig/i);
  });

  it("lanza si un alias apunta a un nombre que el catálogo no tiene", () => {
    expect(() => resolverBanco("Banco Macro", CATALOGO, { "banco macro": "Banco Renombrado" })).toThrow(/alias/i);
  });

  it("un alias que coincide con un nombre del catálogo es un error de la tabla", () => {
    expect(() => resolverBanco("x", CATALOGO, { macro: "Hipotecario" })).toThrow(/alias/i);
  });
});

describe("contrastar — el nombre del listado frente al id del detalle", () => {
  it("coincide cuando el nombre resuelve al mismo banco que el detalle", () => {
    expect(contrastar("Banco Macro", "id-macro", CATALOGO)).toEqual({ coincide: true, mensaje: null });
  });

  it("informa la discrepancia si el nombre apunta a otro banco", () => {
    const r = contrastar("Banco Macro", "id-comafi", CATALOGO);
    expect(r.coincide).toBe(false);
    expect(r.mensaje).toContain("Macro");
    expect(r.mensaje).toContain("Comafi");
  });

  it("informa si el nombre del listado no se resuelve", () => {
    const r = contrastar("Bancos adheridos", "id-macro", CATALOGO);
    expect(r.coincide).toBe(false);
    expect(r.mensaje).toContain("Bancos adheridos");
  });

  it("informa si el id del detalle no está en el catálogo", () => {
    const r = contrastar("Macro", "id-desconocido", CATALOGO);
    expect(r.coincide).toBe(false);
    expect(r.mensaje).toContain("id-desconocido");
  });
});

describe("contra el catálogo real de MODO (docs/product/data/modo-bancos-raw.json)", () => {
  const real = JSON.parse(
    readFileSync(new URL("../../../docs/product/data/modo-bancos-raw.json", import.meta.url), "utf8"),
  ) as { bancos: BancoCatalogo[] };

  it("tiene 82 bancos y ningún nombre ambiguo", () => {
    expect(real.bancos).toHaveLength(82);
    expect(() => indexarCatalogo(real.bancos)).not.toThrow();
  });

  it("todos los alias de la tabla apuntan a un banco que existe", () => {
    for (const [alias, destino] of Object.entries(ALIAS_BANCOS)) {
      const banco = resolverBanco(alias, real.bancos);
      expect(banco, `el alias "${alias}" → "${destino}" no resuelve`).not.toBeNull();
    }
  });

  it("resuelve los nombres que traen las promos de Supermercados y Farmacias del 2026-11-02", () => {
    const vistos = [
      "Macro", "Supervielle", "ICBC", "Credicoop", "Hipotecario", "BBVA", "YOY", "Comafi", "BNA", "Columbia",
      "Santander", "Banco Hipotecario", "Banco Macro", "Banco Comafi", "Banco Credicoop", "Macro ", "Comafi ",
    ];
    for (const nombre of vistos) {
      expect(resolverBanco(nombre, real.bancos), `"${nombre}" no resuelve`).not.toBeNull();
    }
    for (const nombre of ["Bancos adheridos", "Ciudad / Buepp", "Ciudad/Buepp", "Macro Selecta"]) {
      expect(resolverBanco(nombre, real.bancos), `"${nombre}" no debería resolver`).toBeNull();
    }
  });
});
