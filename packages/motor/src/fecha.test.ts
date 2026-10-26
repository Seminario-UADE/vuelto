import { describe, expect, it } from "vitest";
import { diaArgentina, diaSiguiente, fechaArgentina, finDelPeriodo, inicioDelPeriodo, mesDe, nombreDelMes } from "./fecha.ts";

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

describe("finDelPeriodo, diaSiguiente y nombreDelMes (issue #38)", () => {
  it.each([
    ["mensual", "2026-10-21", "2026-10-31"],
    ["mensual", "2026-02-10", "2026-02-28"],
    ["semanal", "2026-10-21", "2026-10-25"],
    ["semanal", "2026-10-01", "2026-10-04"],
  ] as const)("%s de %s termina el %s", (periodo, hoy, fin) => {
    expect(finDelPeriodo(periodo, hoy)).toBe(fin);
  });

  it("el día siguiente cambia de mes y de año", () => {
    expect(diaSiguiente("2026-10-31")).toBe("2026-11-01");
    expect(diaSiguiente("2026-12-31")).toBe("2027-01-01");
  });

  it("nombre del mes en español y en minúscula", () => {
    expect(nombreDelMes("2026-10-21")).toBe("octubre");
    expect(nombreDelMes("2026-01-05")).toBe("enero");
  });
});
