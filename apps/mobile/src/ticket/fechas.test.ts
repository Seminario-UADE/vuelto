import { describe, expect, it } from "vitest";
import { diaPermitido, diasDelMes, mesDe, otroMes, puedeIrAlMes } from "./fechas";

const HOY = "2026-11-14";

describe("diaPermitido (FR-010)", () => {
  it("con compra por confirmar: entre el día de la simulación y hoy, incluidos", () => {
    const rango = { desde: "2026-11-10", hoy: HOY };
    expect(diaPermitido("2026-11-09", rango)).toBe(false);
    expect(diaPermitido("2026-11-10", rango)).toBe(true);
    expect(diaPermitido("2026-11-12", rango)).toBe(true);
    expect(diaPermitido("2026-11-14", rango)).toBe(true);
    expect(diaPermitido("2026-11-15", rango)).toBe(false);
  });

  it("si la simulación fue hoy, el único día es hoy", () => {
    const rango = { desde: HOY, hoy: HOY };
    expect(diaPermitido("2026-11-13", rango)).toBe(false);
    expect(diaPermitido(HOY, rango)).toBe(true);
  });

  it("sin compra por confirmar: cualquier día hasta hoy, nunca uno futuro", () => {
    const rango = { desde: null, hoy: HOY };
    expect(diaPermitido("2019-03-05", rango)).toBe(true);
    expect(diaPermitido(HOY, rango)).toBe(true);
    expect(diaPermitido("2026-11-15", rango)).toBe(false);
  });

  it("una fecha que no existe no se permite", () => {
    expect(diaPermitido("2026-02-30", { desde: null, hoy: HOY })).toBe(false);
  });
});

describe("diasDelMes (el calendario)", () => {
  it("noviembre de 2026: 30 días, el 1 es domingo, y los permitidos según el rango", () => {
    const dias = diasDelMes("2026-11", { desde: "2026-11-10", hoy: HOY });
    expect(dias).toHaveLength(30);
    expect(dias[0]).toEqual({ dia: "2026-11-01", diaDeLaSemana: 0, permitido: false });
    expect(dias.filter((d) => d.permitido).map((d) => d.dia)).toEqual([
      "2026-11-10",
      "2026-11-11",
      "2026-11-12",
      "2026-11-13",
      "2026-11-14",
    ]);
  });

  it("febrero de un año bisiesto y no bisiesto", () => {
    expect(diasDelMes("2028-02", { desde: null, hoy: "2028-12-31" })).toHaveLength(29);
    expect(diasDelMes("2027-02", { desde: null, hoy: "2027-12-31" })).toHaveLength(28);
  });

  it("los bordes de año: diciembre de 2026 queda entero en el pasado si hoy es enero de 2027", () => {
    const dias = diasDelMes("2026-12", { desde: null, hoy: "2027-01-02" });
    expect(dias.every((d) => d.permitido)).toBe(true);
    expect(dias.at(-1)?.dia).toBe("2026-12-31");
  });
});

describe("los meses del calendario", () => {
  it("mesDe y otroMes, también en los bordes de año", () => {
    expect(mesDe("2026-11-14")).toBe("2026-11");
    expect(otroMes("2026-12", 1)).toBe("2027-01");
    expect(otroMes("2027-01", -1)).toBe("2026-12");
    expect(otroMes("2026-11", -1)).toBe("2026-10");
  });

  it("con compra por confirmar: no se va antes del mes de la simulación ni después del de hoy", () => {
    const rango = { desde: "2026-10-30", hoy: "2026-11-02" };
    expect(puedeIrAlMes("2026-09", rango)).toBe(false);
    expect(puedeIrAlMes("2026-10", rango)).toBe(true);
    expect(puedeIrAlMes("2026-11", rango)).toBe(true);
    expect(puedeIrAlMes("2026-12", rango)).toBe(false);
  });

  it("sin compra por confirmar: cualquier mes hasta el de hoy", () => {
    const rango = { desde: null, hoy: "2026-11-14" };
    expect(puedeIrAlMes("2020-01", rango)).toBe(true);
    expect(puedeIrAlMes("2026-12", rango)).toBe(false);
  });
});
