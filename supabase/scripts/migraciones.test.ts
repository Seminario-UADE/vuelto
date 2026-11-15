import { describe, expect, it } from "vitest";
import { compararMigraciones, leerFilas } from "./migraciones.ts";

// Salida de `supabase migration list` con la tabla dibujada con caracteres de caja.
const TABLA_AL_DIA = `
        LOCAL      │     REMOTE     │     TIME (UTC)
  ─────────────────┼────────────────┼──────────────────────
    20261101000001 │ 20261101000001 │ 2026-11-01 00:00:01
    20261103000008 │ 20261103000008 │ 2026-11-03 00:00:08
`;

const TABLA_ATRASADA = `
        LOCAL      │     REMOTE     │     TIME (UTC)
  ─────────────────┼────────────────┼──────────────────────
    20261101000007 │ 20261101000007 │ 2026-11-01 00:00:07
    20261103000001 │                │ 2026-11-03 00:00:01
    20261110000001 │                │ 2026-11-10 00:00:01
`;

describe("compararMigraciones", () => {
  it("con todo aplicado no hay nada pendiente", () => {
    expect(compararMigraciones(TABLA_AL_DIA)).toEqual({ sinAplicar: [], soloRemotas: [], leidas: 2 });
  });

  it("lista las migraciones del repo que la base alojada no tiene", () => {
    const estado = compararMigraciones(TABLA_ATRASADA);
    expect(estado.sinAplicar).toEqual(["20261103000001", "20261110000001"]);
    expect(estado.soloRemotas).toEqual([]);
    expect(estado.leidas).toBe(3);
  });

  it("avisa de las que están en la base alojada y no en el repo", () => {
    const salida = `
   LOCAL │ REMOTE │ TIME (UTC)
  ───────┼────────┼───────────
  20261101000001 │ 20261101000001 │ 2026-11-01 00:00:01
                 │ 20261120000001 │ 2026-11-20 00:00:01
`;
    const estado = compararMigraciones(salida);
    expect(estado.soloRemotas).toEqual(["20261120000001"]);
    expect(estado.sinAplicar).toEqual([]);
  });

  it("entiende la tabla con barras verticales comunes", () => {
    const salida = `
   Local          | Remote         | Time (UTC)
  ----------------|----------------|---------------------
   20261101000001 | 20261101000001 | 2026-11-01 00:00:01
   20261103000008 |                | 2026-11-03 00:00:08
`;
    expect(compararMigraciones(salida).sinAplicar).toEqual(["20261103000008"]);
  });

  it("ignora los códigos de color", () => {
    const salida = "\u001B[1m  20261103000008 \u001B[0m│            │ 2026-11-03 00:00:08\n";
    expect(compararMigraciones(salida).sinAplicar).toEqual(["20261103000008"]);
  });

  it("una salida sin tabla no lee ninguna migración (el script lo trata como falla, no como «al día»)", () => {
    expect(compararMigraciones("Connecting to remote database...\nerror: password authentication failed")).toEqual({
      sinAplicar: [],
      soloRemotas: [],
      leidas: 0,
    });
    expect(compararMigraciones("")).toEqual({ sinAplicar: [], soloRemotas: [], leidas: 0 });
  });
});

describe("leerFilas", () => {
  it("ignora el encabezado, los separadores y las líneas que no son filas", () => {
    expect(leerFilas(TABLA_AL_DIA)).toEqual([
      { local: "20261101000001", remota: "20261101000001" },
      { local: "20261103000008", remota: "20261103000008" },
    ]);
  });
});
