import { describe, expect, it } from "vitest";
import { fechaArgentina } from "./fecha.ts";
import { compraRegistrada, promo } from "./test/fabricas.ts";
import type { Compra, Promocion, Tope } from "./tipos.ts";
import { calcularSaldos } from "./tope.ts";

const HOY = "2026-10-21";
const conTope = (monto: number | null, periodo: Tope["periodo"] = "mensual", id = "promo-galicia") =>
  promo({ id, tope: { monto, periodo, alcance: null, grupoTopeId: null } });

const saldoDe = (p: Promocion, compras: Compra[], hoy = HOY) =>
  calcularSaldos([p], compras, hoy).get(p.id);

// Importes en centavos: $5.000 = 500000.
describe("calcularSaldos: saldo propio", () => {
  it("suma el descuento informado de las compras del mes", () => {
    const compras = [
      compraRegistrada({ id: "c1", descuentoObtenido: 1500 }),
      compraRegistrada({ id: "c2", descuentoObtenido: 2500 }),
    ];
    expect(saldoDe(conTope(5000), compras)).toEqual({
      tope: 500000,
      periodo: "mensual",
      consumido: 400000,
      restante: 100000,
      base: { comprasRegistradas: 2, comprasSinDescuentoInformado: 0 },
    });
  });

  it("estima con el porcentaje el consumo de una compra sin descuento informado", () => {
    const saldo = saldoDe(conTope(5000), [compraRegistrada({ monto: 10000 })]);
    expect(saldo?.consumido).toBe(200000);
    expect(saldo?.base).toEqual({ comprasRegistradas: 1, comprasSinDescuentoInformado: 1 });
  });

  it("el consumo estimado nunca supera el tope ni deja saldo negativo", () => {
    const saldo = saldoDe(conTope(5000), [compraRegistrada({ monto: 100000 })]);
    expect(saldo?.consumido).toBe(500000);
    expect(saldo?.restante).toBe(0);
  });

  it("descuentos informados que superan el tope tampoco dejan saldo negativo", () => {
    const compras = [
      compraRegistrada({ id: "c1", descuentoObtenido: 4000 }),
      compraRegistrada({ id: "c2", descuentoObtenido: 4000 }),
    ];
    expect(saldoDe(conTope(5000), compras)?.restante).toBe(0);
  });

  it("no cuentan compras de otro mes, posteriores a hoy ni de otra promo", () => {
    const compras = [
      compraRegistrada({ id: "c1", fecha: "2026-09-30", descuentoObtenido: 1000 }),
      compraRegistrada({ id: "c2", fecha: "2026-10-22", descuentoObtenido: 1000 }),
      compraRegistrada({ id: "c3", promocionId: "otra-promo", descuentoObtenido: 1000 }),
      compraRegistrada({ id: "c4", promocionId: null, descuentoObtenido: 1000 }),
    ];
    expect(saldoDe(conTope(5000), compras)).toMatchObject({
      consumido: 0,
      base: { comprasRegistradas: 0, comprasSinDescuentoInformado: 0 },
    });
  });

  it("una compra de hoy cuenta", () => {
    const compras = [compraRegistrada({ fecha: HOY, descuentoObtenido: 1000 })];
    expect(saldoDe(conTope(5000), compras)?.consumido).toBe(100000);
  });

  it("un descuento informado de $0 o negativo consume $0 y cuenta como informado", () => {
    const compras = [
      compraRegistrada({ id: "c1", descuentoObtenido: 0 }),
      compraRegistrada({ id: "c2", descuentoObtenido: -500 }),
    ];
    expect(saldoDe(conTope(5000), compras)).toMatchObject({
      consumido: 0,
      base: { comprasRegistradas: 2, comprasSinDescuentoInformado: 0 },
    });
  });

  it("un tope de $0 está agotado desde el principio", () => {
    expect(saldoDe(conTope(0), [])?.restante).toBe(0);
  });

  it("período no informado se evalúa como mensual", () => {
    const compras = [compraRegistrada({ fecha: "2026-10-01", descuentoObtenido: 1000 })];
    expect(saldoDe(conTope(5000, null), compras)).toMatchObject({ periodo: "mensual", consumido: 100000 });
  });

  it("sin compras, la base es cero y cero", () => {
    expect(saldoDe(conTope(5000), [])?.base).toEqual({
      comprasRegistradas: 0,
      comprasSinDescuentoInformado: 0,
    });
  });

  it("sin tope informado no hay saldo", () => {
    expect(saldoDe(conTope(null), [compraRegistrada()])).toBeUndefined();
  });

  it("el mes se toma en hora de Argentina: 23:30 del 31/10 sigue siendo octubre", () => {
    const hoy = fechaArgentina(new Date("2026-11-01T02:30:00Z"));
    const compras = [compraRegistrada({ fecha: "2026-10-31", descuentoObtenido: 1000 })];
    expect(saldoDe(conTope(5000), compras, hoy)?.consumido).toBe(100000);
  });

  it("cada promo con tope tiene su propio saldo", () => {
    const a = conTope(5000, "mensual", "a");
    const b = conTope(5000, "mensual", "b");
    const compras = [compraRegistrada({ promocionId: "a", descuentoObtenido: 1000 })];
    const saldos = calcularSaldos([a, b], compras, HOY);
    expect(saldos.get("a")?.consumido).toBe(100000);
    expect(saldos.get("b")?.consumido).toBe(0);
  });
});

describe("calcularSaldos: períodos (US1)", () => {
  it("semanal: cuenta desde el lunes de la semana de la consulta", () => {
    const compras = [compraRegistrada({ fecha: "2026-10-19", descuentoObtenido: 4000 })];
    expect(saldoDe(conTope(6000, "semanal"), compras)).toMatchObject({
      periodo: "semanal",
      restante: 200000,
      base: { comprasRegistradas: 1, comprasSinDescuentoInformado: 0 },
    });
  });

  it("semanal: la compra del domingo anterior no cuenta", () => {
    const compras = [compraRegistrada({ fecha: "2026-10-18", descuentoObtenido: 6000 })];
    expect(saldoDe(conTope(6000, "semanal"), compras)).toMatchObject({ consumido: 0, restante: 600000 });
  });

  it("semana que cruza de mes: la compra del 31/10 cuenta el 1/11 si es semanal, no si es mensual", () => {
    const compras = [compraRegistrada({ fecha: "2026-10-31", descuentoObtenido: 1000 })];
    expect(saldoDe(conTope(6000, "semanal"), compras, "2026-11-01")?.consumido).toBe(100000);
    expect(saldoDe(conTope(6000, "mensual"), compras, "2026-11-01")?.consumido).toBe(0);
  });

  it("una promo con tope por compra no tiene saldo", () => {
    expect(saldoDe(conTope(3000, "por_compra"), [compraRegistrada()])).toBeUndefined();
  });
});
