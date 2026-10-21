import { describe, expect, it } from "vitest";
import { fechaArgentina } from "./fecha";
import { compraRegistrada, promo } from "./test/fabricas";
import type { Tope } from "./tipos";
import { estadoDeTope } from "./tope";

const HOY = "2026-10-21";
const conTope = (monto: number | null, periodo: Tope["periodo"] = "mensual") =>
  promo({ tope: { monto, periodo, alcance: null, grupoTopeId: null } });

// Importes en centavos: $5.000 = 500000.
describe("estadoDeTope", () => {
  it("suma el descuento informado de las compras del mes", () => {
    const compras = [
      compraRegistrada({ id: "c1", descuentoObtenido: 1500 }),
      compraRegistrada({ id: "c2", descuentoObtenido: 2500 }),
    ];
    expect(estadoDeTope(conTope(5000), compras, HOY)).toEqual({
      tope: 500000,
      consumido: 400000,
      restante: 100000,
      base: { comprasRegistradas: 2, comprasSinDescuentoInformado: 0 },
    });
  });

  it("estima con el porcentaje el consumo de una compra sin descuento informado", () => {
    const estado = estadoDeTope(conTope(5000), [compraRegistrada({ monto: 10000 })], HOY);
    expect(estado.consumido).toBe(200000);
    expect(estado.base).toEqual({ comprasRegistradas: 1, comprasSinDescuentoInformado: 1 });
  });

  it("el consumo estimado nunca supera el tope ni deja saldo negativo", () => {
    const estado = estadoDeTope(conTope(5000), [compraRegistrada({ monto: 100000 })], HOY);
    expect(estado.consumido).toBe(500000);
    expect(estado.restante).toBe(0);
  });

  it("descuentos informados que superan el tope tampoco dejan saldo negativo", () => {
    const compras = [
      compraRegistrada({ id: "c1", descuentoObtenido: 4000 }),
      compraRegistrada({ id: "c2", descuentoObtenido: 4000 }),
    ];
    expect(estadoDeTope(conTope(5000), compras, HOY).restante).toBe(0);
  });

  it("no cuentan compras de otro mes, posteriores a hoy ni de otra promo", () => {
    const compras = [
      compraRegistrada({ id: "c1", fecha: "2026-09-30", descuentoObtenido: 1000 }),
      compraRegistrada({ id: "c2", fecha: "2026-10-22", descuentoObtenido: 1000 }),
      compraRegistrada({ id: "c3", promocionId: "otra-promo", descuentoObtenido: 1000 }),
      compraRegistrada({ id: "c4", promocionId: null, descuentoObtenido: 1000 }),
    ];
    expect(estadoDeTope(conTope(5000), compras, HOY)).toMatchObject({
      consumido: 0,
      base: { comprasRegistradas: 0, comprasSinDescuentoInformado: 0 },
    });
  });

  it("una compra de hoy cuenta", () => {
    const compras = [compraRegistrada({ fecha: HOY, descuentoObtenido: 1000 })];
    expect(estadoDeTope(conTope(5000), compras, HOY).consumido).toBe(100000);
  });

  it("un descuento informado de $0 o negativo consume $0 y cuenta como informado", () => {
    const compras = [
      compraRegistrada({ id: "c1", descuentoObtenido: 0 }),
      compraRegistrada({ id: "c2", descuentoObtenido: -500 }),
    ];
    expect(estadoDeTope(conTope(5000), compras, HOY)).toMatchObject({
      consumido: 0,
      base: { comprasRegistradas: 2, comprasSinDescuentoInformado: 0 },
    });
  });

  it("un tope de $0 está agotado desde el principio", () => {
    expect(estadoDeTope(conTope(0), [], HOY).restante).toBe(0);
  });

  it.each([null, "semanal", "por_compra"] as const)(
    "período %s se evalúa como mes calendario hasta la issue #37",
    (periodo) => {
      const compras = [compraRegistrada({ fecha: "2026-10-01", descuentoObtenido: 1000 })];
      expect(estadoDeTope(conTope(5000, periodo), compras, HOY).consumido).toBe(100000);
    },
  );

  it("sin compras, la base es cero y cero", () => {
    expect(estadoDeTope(conTope(5000), [], HOY).base).toEqual({
      comprasRegistradas: 0,
      comprasSinDescuentoInformado: 0,
    });
  });

  it("sin tope informado no hay restante ni base", () => {
    expect(estadoDeTope(conTope(null), [compraRegistrada()], HOY)).toEqual({
      tope: null,
      consumido: 0,
      restante: null,
      base: null,
    });
  });

  it("el mes se toma en hora de Argentina: 23:30 del 31/10 sigue siendo octubre", () => {
    const hoy = fechaArgentina(new Date("2026-11-01T02:30:00Z"));
    const compras = [compraRegistrada({ fecha: "2026-10-31", descuentoObtenido: 1000 })];
    expect(estadoDeTope(conTope(5000), compras, hoy).consumido).toBe(100000);
  });
});
