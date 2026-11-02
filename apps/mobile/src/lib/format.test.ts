import { describe, expect, it } from "vitest";
import { aprox, diaDelMes, fechaCorta, fechaLarga, iniciales, montoEditable, parseMonto, pesos } from "./format";

describe("format", () => {
  it("pesos con punto de miles", () => {
    expect(pesos(24500)).toBe("$24.500");
    expect(pesos(1600)).toBe("$1.600");
    expect(pesos(900)).toBe("$900");
    expect(pesos(1000000)).toBe("$1.000.000");
  });

  it("estimados con ≈", () => {
    expect(aprox(4900)).toBe("≈$4.900");
  });

  it("parsea lo que se tipea en el campo de monto", () => {
    expect(parseMonto("24.500")).toBe(24500);
    expect(parseMonto("$ 24500")).toBe(24500);
    expect(parseMonto("")).toBeNull();
    expect(parseMonto("0")).toBeNull();
    expect(montoEditable(24500)).toBe("24.500");
    expect(montoEditable(null)).toBe("");
  });

  it("fechas en español", () => {
    expect(fechaCorta("2026-10-14")).toBe("14/10");
    expect(diaDelMes("2026-10-14")).toBe("Miércoles 14");
    expect(fechaLarga("2026-10-14")).toBe("miércoles 14 de octubre");
  });

  it("iniciales", () => {
    expect(iniciales("Lucía")).toBe("L");
    expect(iniciales("Mateo Pérez")).toBe("MP");
  });
});
