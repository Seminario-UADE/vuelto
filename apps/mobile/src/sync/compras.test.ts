import type { Compra } from "@vuelto/motor";
import { describe, expect, it } from "vitest";
import { comprasOctubre } from "../data/fixtures";
import { reconciliarCompras } from "./compras";
import { filaACompra } from "./mapeo";
import { filaCompra, ID } from "./prueba";

const DESDE = "2026-11-01";
const c = (n: number, fecha = "2026-11-02"): Compra => filaACompra(filaCompra(n, { fecha }))!;
const local = (id: string, fecha = "2026-11-02"): Compra => ({ ...c(0, fecha), id });
const ids = (l: Compra[]) => l.map((x) => x.id);

describe("reconciliarCompras (FR-015, la costura con #44)", () => {
  it("servidor ∪ compras locales que el servidor no devolvió, sin duplicados", () => {
    const r = reconciliarCompras([c(1), c(2)], [local("n1")], DESDE);
    expect(new Set(ids(r))).toEqual(new Set(["n1", ID(1001), ID(1002)]));
    expect(r).toHaveLength(3);
  });

  it("si el servidor devuelve la compra local con el mismo id, queda una sola: la del servidor", () => {
    const r = reconciliarCompras([c(1)], [local(ID(1001))], DESDE);
    expect(ids(r)).toEqual([ID(1001)]);
    expect(r[0]).toEqual(c(1));
  });

  it("las compras de ejemplo se reemplazan por las del servidor (no se confunden con compras locales)", () => {
    const r = reconciliarCompras([c(1)], comprasOctubre, DESDE);
    expect(ids(r)).toEqual([ID(1001)]);
  });

  it("sin compras en el servidor, las de ejemplo desaparecen y las locales quedan", () => {
    expect(ids(reconciliarCompras([], [...comprasOctubre, local("n1")], DESDE))).toEqual(["n1"]);
  });

  it("lo del servidor anterior a la ventana se descarta; una local de antes se conserva", () => {
    const r = reconciliarCompras([c(1, "2026-10-25")], [local("n1", "2026-10-20")], DESDE);
    expect(ids(r)).toEqual(["n1"]);
  });

  it("la más nueva primero: las del servidor llegan en orden creada_en ascendente", () => {
    const r = reconciliarCompras([c(1, "2026-11-01"), c(2, "2026-11-02"), c(3, "2026-11-02")], [], DESDE);
    expect(ids(r)).toEqual([ID(1003), ID(1002), ID(1001)]);
  });

  it("a igual fecha, las locales van antes que las del servidor", () => {
    const r = reconciliarCompras([c(1)], [local("n1")], DESDE);
    expect(ids(r)).toEqual(["n1", ID(1001)]);
  });

  it("una compra con UUID que ya no está en el servidor vino de él (borrada en otro dispositivo): no se conserva", () => {
    const r = reconciliarCompras([], [local(ID(1001))], DESDE);
    expect(r).toEqual([]);
  });

  it("una compra guardada en el teléfono (id n<número>) sí se conserva", () => {
    expect(ids(reconciliarCompras([], [local("n7")], DESDE))).toEqual(["n7"]);
  });
});
