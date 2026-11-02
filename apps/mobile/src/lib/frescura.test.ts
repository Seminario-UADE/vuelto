import { describe, expect, it } from "vitest";
import { textoFrescura } from "./frescura";

const AHORA = new Date("2026-11-02T15:00:00.000Z");
const hace = (ms: number) => new Date(AHORA.getTime() - ms).toISOString();
const MIN = 60_000;
const HORA = 60 * MIN;
const DIA = 24 * HORA;

describe("textoFrescura (FR-019)", () => {
  it("menos de una hora: unos minutos", () => {
    expect(textoFrescura(AHORA, hace(10 * MIN))).toBe("Promos actualizadas hace unos minutos");
    expect(textoFrescura(AHORA, hace(59 * MIN))).toBe("Promos actualizadas hace unos minutos");
    expect(textoFrescura(AHORA, hace(0))).toBe("Promos actualizadas hace unos minutos");
  });

  it("de 1 a 23 horas, redondeo hacia abajo y con plural", () => {
    expect(textoFrescura(AHORA, hace(60 * MIN))).toBe("Promos actualizadas hace 1 hora");
    expect(textoFrescura(AHORA, hace(HORA + 20 * MIN))).toBe("Promos actualizadas hace 1 hora");
    expect(textoFrescura(AHORA, hace(5 * HORA))).toBe("Promos actualizadas hace 5 horas");
    expect(textoFrescura(AHORA, hace(23 * HORA + 59 * MIN))).toBe("Promos actualizadas hace 23 horas");
  });

  it("24 horas o más: días", () => {
    expect(textoFrescura(AHORA, hace(24 * HORA))).toBe("Promos actualizadas hace 1 día");
    expect(textoFrescura(AHORA, hace(26 * HORA))).toBe("Promos actualizadas hace 1 día");
    expect(textoFrescura(AHORA, hace(3 * DIA))).toBe("Promos actualizadas hace 3 días");
  });

  it("una diferencia negativa (el teléfono cambió la hora) se trata como cero", () => {
    expect(textoFrescura(AHORA, hace(-2 * HORA))).toBe("Promos actualizadas hace unos minutos");
  });

  it("sin sincronización (datos de ejemplo) no hay leyenda", () => {
    expect(textoFrescura(AHORA, null)).toBeNull();
  });

  it("una fecha que no se puede leer no inventa un texto", () => {
    expect(textoFrescura(AHORA, "ayer")).toBeNull();
  });
});
