import type { Compra } from "@vuelto/motor";
import { describe, expect, it } from "vitest";
import type { EstadoCompras } from "../store/acciones";
import { mezclarCompras } from "./compras";
import { filaACompra } from "./mapeo";
import { filaCompra, ID } from "./prueba";

const DESDE = "2026-11-01";
const c = (n: number, fecha = "2026-11-02"): Compra => filaACompra(filaCompra(n, { fecha }))!;
const local = (id: string, fecha = "2026-11-02"): Compra => ({ ...c(0, fecha), id });
const estado = (lista: Compra[], pendientes: string[] = []): EstadoCompras => ({ lista, pendientes, duenoId: "u" });
const ids = (e: EstadoCompras) => e.lista.map((x) => x.id);

describe("mezclarCompras (FR-015)", () => {
  it("servidor ∪ pendientes que el servidor no devolvió, sin duplicados", () => {
    const actual = estado([local("n1")], ["n1"]);
    const r = mezclarCompras(actual, [c(1), c(2)], DESDE);
    expect(new Set(ids(r))).toEqual(new Set(["n1", ID(1001), ID(1002)]));
    expect(r.pendientes).toEqual(["n1"]);
  });

  it("si el servidor devuelve la compra pendiente, queda la del servidor y sale de pendientes", () => {
    const actual = estado([local(ID(1001))], [ID(1001)]);
    const r = mezclarCompras(actual, [c(1)], DESDE);
    expect(ids(r)).toEqual([ID(1001)]);
    expect(r.lista[0]).toEqual(c(1));
    expect(r.pendientes).toEqual([]);
  });

  it("las compras de ejemplo (no pendientes) se reemplazan por las del servidor", () => {
    const actual = estado([local("c10"), local("c9")], []);
    expect(ids(mezclarCompras(actual, [c(1)], DESDE))).toEqual([ID(1001)]);
  });

  it("una pendiente de fuera del período se conserva; una del servidor de fuera se descarta", () => {
    const actual = estado([local("n1", "2026-10-20")], ["n1"]);
    const r = mezclarCompras(actual, [c(1, "2026-10-25")], DESDE);
    expect(ids(r)).toEqual(["n1"]);
  });

  it("la más nueva primero: las del servidor llegan en orden creada_en ascendente", () => {
    const r = mezclarCompras(estado([]), [c(1, "2026-11-01"), c(2, "2026-11-02"), c(3, "2026-11-02")], DESDE);
    expect(ids(r)).toEqual([ID(1003), ID(1002), ID(1001)]);
  });

  it("no toca duenoId (lo fija el reducer con el usuario de la sesión)", () => {
    expect(mezclarCompras(estado([]), [], DESDE).duenoId).toBe("u");
  });
});
