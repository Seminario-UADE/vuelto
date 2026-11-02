import { describe, expect, it } from "vitest";
import { CAMPOS_COMPARABLES, COLUMNAS_PROMOCION, aFila, comparable, valoresSql } from "./filas.ts";
import { idDePromocion } from "./ids.ts";
import { entrada } from "./test/fabricas.ts";

describe("aFila", () => {
  const fila = aFila(
    entrada({
      comercio: "Paladini",
      jurisdiccion: "caba",
      acumulable: false,
      fragmentosFuente: { acumulable: "NO ACUMULA", jurisdiccion: "CABA" },
    }),
  );

  it("pasa la entrada a las columnas de la tabla, con el id estable y la fuente del corpus", () => {
    expect(fila).toMatchObject({
      id: idDePromocion("manual", "20-paladini-icbc-ago26"),
      fuente: "manual",
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

  it("no lleva la revisión ni la marca de fixture: no son columnas", () => {
    expect(Object.keys(fila)).not.toContain("revision");
    expect(Object.keys(fila)).not.toContain("fixture");
  });

  it("la lista de columnas es exactamente la de la fila, sin sobrantes ni faltantes", () => {
    expect([...COLUMNAS_PROMOCION].sort()).toEqual(Object.keys(fila).sort());
  });
});

describe("valoresSql", () => {
  const v = valoresSql(aFila(entrada({ comercio: "D'Angelo", fragmentosFuente: { b: "2", a: null } })));

  it("escribe cada tipo de columna con su literal de Postgres", () => {
    expect(v.fuente).toBe("'manual'");
    expect(v.categoria_id).toBe("1");
    expect(v.porcentaje).toBe("20");
    expect(v.comercio).toBe("'D''Angelo'");
    expect(v.debito_redes).toBe("array['visa']::text[]");
    expect(v.vigencia_desde).toBe("'2026-08-07'::date");
    expect(v.dias).toBe("array['vie']::text[]");
    expect(v.tope_alcance).toBe("null");
    expect(v.acumulable).toBe("null");
    expect(v.dada_de_baja_en).toBe("null");
  });

  it("los fragmentos van como jsonb con las claves ordenadas", () => {
    expect(v.fragmentos_fuente).toBe(`'{"a":null,"b":"2"}'::jsonb`);
  });

  it("devuelve un valor para cada columna", () => {
    expect(Object.keys(v).sort()).toEqual([...COLUMNAS_PROMOCION].sort());
  });
});

describe("comparable", () => {
  const base = aFila(entrada());

  it("dos filas iguales son iguales", () => {
    expect(comparable(base)).toBe(comparable(structuredClone(base)));
  });

  it("un numeric que vuelve como texto es el mismo número", () => {
    expect(comparable({ ...base, porcentaje: "20.00", tope_monto: "10000.00" })).toBe(comparable(base));
  });

  it("ignora el id, la clave natural y la baja: no son contenido de la promo", () => {
    expect(comparable({ ...base, id: "otro", fuente_id: "otro", dada_de_baja_en: "2026-11-01T00:00:00Z" })).toBe(comparable(base));
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
