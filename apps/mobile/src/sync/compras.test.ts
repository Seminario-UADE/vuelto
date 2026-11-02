import type { Compra } from "@vuelto/motor";
import { describe, expect, it } from "vitest";
import type { Operacion } from "../data/compras/operaciones";
import { reconciliarCompras } from "./compras";
import { filaACompra } from "./mapeo";
import { filaCompra, ID } from "./prueba";

const DESDE = "2026-11-01";
const YO = "usuario-1";
const c = (n: number, fecha = "2026-11-02"): Compra => filaACompra(filaCompra(n, { fecha }))!;
const base = (id: string, fecha: string, dueno: string | null) => ({
  id: `op-${id}`,
  dueno,
  fecha,
  encoladaEn: `${fecha}T12:00:00.000Z`,
  estado: { tipo: "pendiente" as const },
});
const guardar = (id: string, fecha = "2026-11-02", dueno: string | null = YO): Operacion => ({
  ...base(id, fecha, dueno),
  tipo: "guardar",
  compra: { ...c(0, fecha), id },
});
const borrar = (id: string, fecha = "2026-11-02", dueno: string | null = YO): Operacion => ({
  ...base(`b-${id}`, fecha, dueno),
  tipo: "borrar",
  compraId: id,
});
const ids = (l: Compra[]) => l.map((x) => x.id);

describe("reconciliarCompras (FR-015, sobre la cola de #44)", () => {
  it("servidor ∪ guardados pendientes de la cola, sin duplicados", () => {
    const r = reconciliarCompras([c(1), c(2)], [guardar("local-1")], YO, DESDE);
    expect(new Set(ids(r))).toEqual(new Set(["local-1", ID(1001), ID(1002)]));
    expect(r).toHaveLength(3);
  });

  it("si el servidor ya tiene la compra pendiente, queda una sola: la copia local", () => {
    const r = reconciliarCompras([c(1)], [guardar(ID(1001))], YO, DESDE);
    expect(ids(r)).toEqual([ID(1001)]);
  });

  it("un borrado pendiente saca la compra aunque el servidor todavía la devuelva", () => {
    expect(reconciliarCompras([c(1), c(2)], [borrar(ID(1001))], YO, DESDE).map((x) => x.id)).toEqual([ID(1002)]);
  });

  it("sin compras en el servidor ni en la cola, la lista queda vacía (las de ejemplo no sobreviven)", () => {
    expect(reconciliarCompras([], [], YO, DESDE)).toEqual([]);
  });

  it("lo del servidor anterior a la ventana se descarta; un pendiente de antes se conserva", () => {
    const r = reconciliarCompras([c(1, "2026-10-25")], [guardar("local-1", "2026-10-20")], YO, DESDE);
    expect(ids(r)).toEqual(["local-1"]);
  });

  it("la más nueva primero: las del servidor llegan en orden creada_en ascendente", () => {
    const r = reconciliarCompras([c(1, "2026-11-01"), c(2, "2026-11-02"), c(3, "2026-11-02")], [], YO, DESDE);
    expect(ids(r)).toEqual([ID(1003), ID(1002), ID(1001)]);
  });

  it("a igual fecha, las pendientes van antes que las del servidor", () => {
    expect(ids(reconciliarCompras([c(1)], [guardar("local-1")], YO, DESDE))).toEqual(["local-1", ID(1001)]);
  });

  it("una compra que no está en el servidor ni en la cola vino de él (borrada en otro dispositivo): no se conserva", () => {
    expect(reconciliarCompras([], [], YO, DESDE)).toEqual([]);
  });

  it("los pendientes de otra cuenta no entran; los que no tienen dueño, sí", () => {
    const r = reconciliarCompras([], [guardar("de-otro", "2026-11-02", "usuario-2"), guardar("sin-dueno", "2026-11-02", null)], YO, DESDE);
    expect(ids(r)).toEqual(["sin-dueno"]);
  });
});
