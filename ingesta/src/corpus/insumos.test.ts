import { describe, expect, it } from "vitest";
import { RUTAS_INSUMOS, leerCatalogoBancos, leerInsumos } from "./insumos.ts";

function lector(archivos: Record<string, unknown>) {
  return (ruta: string): string => {
    if (!(ruta in archivos)) throw new Error(`no existe ${ruta}`);
    return JSON.stringify(archivos[ruta]);
  };
}

const COMPLETOS: Record<string, unknown> = {
  [RUTAS_INSUMOS.promociones]: { version: 1, promociones: [] },
  [RUTAS_INSUMOS.exclusiones]: [],
  [RUTAS_INSUMOS.gruposTope]: {},
  [RUTAS_INSUMOS.bancos]: {
    capturadoEl: "2026-11-02",
    url: "u",
    bancos: [{ id: "b1", name: "Macro", image: "x", bcra_code: "1" }],
  },
};

describe("leerInsumos", () => {
  it("lee los cuatro archivos y deja de los bancos solo el id y el nombre", () => {
    const insumos = leerInsumos(lector(COMPLETOS));
    expect(insumos.archivo).toEqual({ version: 1, promociones: [] });
    expect(insumos.exclusiones).toEqual([]);
    expect(insumos.gruposTope).toEqual({});
    expect(insumos.bancos).toEqual([{ id: "b1", name: "Macro" }]);
  });

  it("un archivo que falta lanza un error que nombra la ruta", () => {
    const sinBancos = { ...COMPLETOS };
    delete sinBancos[RUTAS_INSUMOS.bancos];
    expect(() => leerInsumos(lector(sinBancos))).toThrow(/modo-bancos-raw\.json/);
  });

  it("un JSON roto lanza un error que nombra la ruta", () => {
    expect(() => leerInsumos((ruta) => (ruta === RUTAS_INSUMOS.exclusiones ? "{no es json" : JSON.stringify(COMPLETOS[ruta])))).toThrow(
      /exclusiones\.json/,
    );
  });

  it("un catálogo sin lista de bancos lanza un error", () => {
    const roto = { ...COMPLETOS, [RUTAS_INSUMOS.bancos]: { capturadoEl: "x" } };
    expect(() => leerInsumos(lector(roto))).toThrow(/bancos/);
  });
});

describe("leerCatalogoBancos", () => {
  it("lee solo el catálogo, con el id y el nombre", () => {
    expect(leerCatalogoBancos(lector(COMPLETOS))).toEqual([{ id: "b1", name: "Macro" }]);
  });

  it("un catálogo sin lista de bancos lanza un error", () => {
    expect(() => leerCatalogoBancos(lector({ ...COMPLETOS, [RUTAS_INSUMOS.bancos]: { capturadoEl: "x" } }))).toThrow(/bancos/);
  });
});
