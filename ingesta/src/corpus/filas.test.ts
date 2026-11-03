import { describe, expect, it } from "vitest";
import { CAMPOS_COMPARABLES, COLUMNAS_PROMOCION, aFila, comparable, jsonOrdenado } from "./filas.ts";
import { idDePromocion } from "./ids.ts";
import { promocion } from "./test/fabricas.ts";

const CAPTURA = "11111111-1111-4111-8111-111111111111";

describe("aFila", () => {
  const fila = aFila(
    promocion({
      comercio: "Paladini",
      jurisdiccion: "caba",
      acumulable: false,
      fragmentosFuente: { acumulable: "NO ACUMULA", jurisdiccion: "CABA" },
    }),
    CAPTURA,
  );

  it("pasa la promo a las columnas de la tabla, con el id estable, la fuente y su captura", () => {
    expect(fila).toMatchObject({
      id: idDePromocion("modo", "20-paladini-icbc-ago26"),
      fuente: "modo",
      captura_cruda_id: CAPTURA,
      fuente_id: "20-paladini-icbc-ago26",
      banco_id: "bcfcac03-6f79-4995-bfab-7b8916b0747a",
      categoria_id: 1,
      debito_redes: ["visa"],
      credito_redes: ["visa", "master"],
      vigencia_desde: "2026-08-07",
      tope_monto: 10000,
      tope_periodo: "mensual",
      jurisdiccion: "caba",
      acumulable: false,
      dada_de_baja_en: null,
    });
  });

  it("la lista de columnas es exactamente la de la fila, sin sobrantes ni faltantes", () => {
    expect([...COLUMNAS_PROMOCION].sort()).toEqual(Object.keys(fila).sort());
  });
});

describe("comparable", () => {
  const base = aFila(promocion(), CAPTURA);

  it("dos filas iguales son iguales", () => {
    expect(comparable(base)).toBe(comparable(structuredClone(base)));
  });

  it("un numeric que vuelve como texto es el mismo número", () => {
    expect(comparable({ ...base, porcentaje: "20.00", tope_monto: "10000.00" })).toBe(comparable(base));
  });

  it("ignora el id, la clave natural, la captura y la baja: no son contenido de la promo", () => {
    expect(
      comparable({ ...base, id: "otro", fuente_id: "otro", captura_cruda_id: "otra", dada_de_baja_en: "2026-11-01T00:00:00Z" }),
    ).toBe(comparable(base));
  });

  it("un cambio en cualquier campo cambia el resultado", () => {
    const numericos = ["porcentaje", "tope_monto", "monto_minimo"];
    for (const campo of CAMPOS_COMPARABLES) {
      const cambiada = { ...base } as Record<string, unknown>;
      if (campo === "fragmentos_fuente") cambiada[campo] = { x: "y" };
      else if (numericos.includes(campo)) cambiada[campo] = 98765;
      else if (Array.isArray(base[campo])) cambiada[campo] = ["zzz"];
      else cambiada[campo] = `${String(base[campo])}!`;
      expect(comparable(cambiada as unknown as typeof base), campo).not.toBe(comparable(base));
    }
  });

  it("las claves de los fragmentos en otro orden son lo mismo", () => {
    const a = { ...base, fragmentos_fuente: { a: "1", b: "2" } };
    const b = { ...base, fragmentos_fuente: { b: "2", a: "1" } };
    expect(comparable(a)).toBe(comparable(b));
  });
});

describe("jsonOrdenado", () => {
  it("ordena las claves y conserva los null", () => {
    expect(jsonOrdenado({ b: "2", a: null })).toBe('{"a":null,"b":"2"}');
  });
});
