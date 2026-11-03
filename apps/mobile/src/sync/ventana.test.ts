import { describe, expect, it } from "vitest";
import { ventanaDeCompras } from "./ventana";

/** Un instante en hora de Argentina (UTC−3). */
const ar = (iso: string) => new Date(`${iso}-03:00`);

describe("ventanaDeCompras (SC-003, FR-014)", () => {
  it("febrero de 2026 (28 días): un viernes, el período empieza el lunes de esa semana o el día 1, el más temprano", () => {
    // 2026-02-27 es viernes: lunes 23, mes desde el 1 ⇒ el 1.
    expect(ventanaDeCompras(ar("2026-02-27T12:00:00"))).toEqual({ hoy: "2026-02-27", desde: "2026-02-01" });
  });

  it("febrero de 2028 (29 días, bisiesto)", () => {
    expect(ventanaDeCompras(ar("2028-02-29T12:00:00"))).toEqual({ hoy: "2028-02-29", desde: "2028-02-01" });
  });

  it("abril (30 días) y mayo (31 días)", () => {
    expect(ventanaDeCompras(ar("2026-04-30T12:00:00")).desde).toBe("2026-04-01");
    expect(ventanaDeCompras(ar("2026-05-31T12:00:00")).desde).toBe("2026-05-01");
  });

  it("un lunes que cruza de mes: la semana empieza en el mes anterior y gana por ser más temprana", () => {
    // 2026-06-01 es lunes: semana desde el 1/6, mes desde el 1/6 ⇒ el 1/6.
    expect(ventanaDeCompras(ar("2026-06-01T12:00:00")).desde).toBe("2026-06-01");
    // 2026-07-01 es miércoles: la semana empieza el lunes 29/6, antes que el 1/7.
    expect(ventanaDeCompras(ar("2026-07-01T12:00:00")).desde).toBe("2026-06-29");
  });

  it("el borde del día se decide con la hora de Argentina, no la de UTC", () => {
    // 00:00 del 1/7 en Argentina = 03:00 UTC del 1/7.
    expect(ventanaDeCompras(ar("2026-07-01T00:00:00")).hoy).toBe("2026-07-01");
    // 23:59 del 30/6 en Argentina = 02:59 UTC del 1/7: sigue siendo 30/6 en Argentina.
    expect(ventanaDeCompras(ar("2026-06-30T23:59:00")).hoy).toBe("2026-06-30");
    expect(ventanaDeCompras(ar("2026-06-30T23:59:00")).desde).toBe("2026-06-01");
  });
});
