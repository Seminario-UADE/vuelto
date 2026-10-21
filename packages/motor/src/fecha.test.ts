import { describe, expect, it } from "vitest";
import { diaArgentina, fechaArgentina, mesDe } from "./fecha.ts";

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
