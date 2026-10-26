import { describe, expect, it } from "vitest";
import { diaArgentina, fechaArgentina, inicioDelPeriodo, mesDe } from "./fecha.ts";

describe("fecha en hora de Argentina", () => {
  it("23:30 del 31/10 en Argentina sigue siendo sábado 31 de octubre", () => {
    const ahora = new Date("2026-11-01T02:30:00Z");
    expect(fechaArgentina(ahora)).toBe("2026-10-31");
    expect(diaArgentina(ahora)).toBe("sab");
    expect(mesDe(fechaArgentina(ahora))).toBe("2026-10");
  });

  it("medianoche en Argentina ya es el día siguiente", () => {
    const ahora = new Date("2026-10-21T03:00:00Z");
    expect(fechaArgentina(ahora)).toBe("2026-10-21");
    expect(diaArgentina(ahora)).toBe("mie");
  });
});

describe("inicioDelPeriodo", () => {
  it("mensual: el día 1 del mes", () => {
    expect(inicioDelPeriodo("mensual", "2026-10-21")).toBe("2026-10-01");
  });

  it.each([
    ["2026-10-21", "2026-10-19", "miércoles"],
    ["2026-10-19", "2026-10-19", "lunes"],
    ["2026-10-25", "2026-10-19", "domingo"],
    ["2026-11-01", "2026-10-26", "domingo que cruza de mes"],
  ])("semanal: %s empieza el lunes %s (%s)", (hoy, lunes) => {
    expect(inicioDelPeriodo("semanal", hoy)).toBe(lunes);
  });
});
