import { describe, expect, it } from "vitest";
import type { Operacion } from "./operaciones";
import { aplicarPendientes } from "./pendientes";
import { compraDePrueba } from "./prueba";

// contracts/aplicar-pendientes.md

const U = "u-ana";
const id = (n: number) => `a2000000-0000-4000-8000-${n.toString().padStart(12, "0")}`;
const base = { encoladaEn: "2026-10-14T15:00:00.000Z", fecha: "2026-10-14", estado: { tipo: "pendiente" } } as const;
const guardar = (n: number, extra: Partial<Operacion> = {}): Operacion =>
  ({ ...base, id: `op${n}`, dueno: U, tipo: "guardar", compra: compraDePrueba({ id: id(n) }), ...extra }) as Operacion;
const borrar = (n: number, extra: Partial<Operacion> = {}): Operacion =>
  ({ ...base, id: `ob${n}`, dueno: U, tipo: "borrar", compraId: id(n), ...extra }) as Operacion;

const servidor = (...ns: number[]) => ns.map((n) => compraDePrueba({ id: id(n), fecha: "2026-10-10" }));

describe("aplicarPendientes (FR-018)", () => {
  it("sin cola devuelve lo del servidor", () => {
    expect(aplicarPendientes(servidor(1, 2), [], U).map((c) => c.id)).toEqual([id(1), id(2)]);
  });

  it("una guardada pendiente que el servidor no tiene se agrega una sola vez", () => {
    const r = aplicarPendientes(servidor(1), [guardar(2), guardar(2, { id: "dup" })], U);
    expect(r.map((c) => c.id).sort()).toEqual([id(1), id(2)]);
  });

  it("una que ya subió (mismo id) no se duplica y gana la copia local", () => {
    const local = compraDePrueba({ id: id(1), monto: 9999 });
    const r = aplicarPendientes(servidor(1), [{ ...guardar(1), compra: local } as Operacion], U);
    expect(r).toHaveLength(1);
    expect(r[0]?.monto).toBe(9999);
  });

  it("un borrado pendiente oculta la fila del servidor", () => {
    expect(aplicarPendientes(servidor(1, 2), [borrar(1)], U).map((c) => c.id)).toEqual([id(2)]);
  });

  it("las rechazadas y las bloqueadas se conservan: siguen siendo compras del usuario", () => {
    const r = aplicarPendientes(
      servidor(1),
      [
        guardar(2, { estado: { tipo: "rechazada", causa: "23514" } }),
        guardar(3, { estado: { tipo: "bloqueada", motivo: "medio" } }),
      ],
      U,
    );
    expect(r.map((c) => c.id).sort()).toEqual([id(1), id(2), id(3)]);
  });

  it("las operaciones de otro dueño se ignoran; las sin dueño valen", () => {
    const r = aplicarPendientes(servidor(1), [guardar(2, { dueno: "u-beto" }), guardar(3, { dueno: null })], U);
    expect(r.map((c) => c.id).sort()).toEqual([id(1), id(3)]);
  });

  it("sin sesión solo valen las sin dueño", () => {
    const r = aplicarPendientes([], [guardar(2), guardar(3, { dueno: null })], null);
    expect(r.map((c) => c.id)).toEqual([id(3)]);
  });

  it("el resultado no repite ids y va con la más nueva primero", () => {
    const nueva = compraDePrueba({ id: id(9), fecha: "2026-10-20" });
    const r = aplicarPendientes(servidor(1, 2), [{ ...guardar(9), compra: nueva } as Operacion, guardar(1)], U);
    expect(new Set(r.map((c) => c.id)).size).toBe(r.length);
    expect(r[0]?.id).toBe(id(9));
  });
});
