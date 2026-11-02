import { describe, expect, it } from "vitest";
import {
  adoptar,
  aplicarResultado,
  bloquear,
  compactar,
  contarPendientes,
  declinar,
  descartarViejas,
  encolarBorrado,
  encolarGuardado,
  marcarEnviando,
  reconciliar,
  reintentar,
  siguienteLote,
  type Operacion,
} from "./operaciones";
import { compraDePrueba, generadorDeIds } from "./prueba";

const U = "u-ana";
const AHORA = "2026-10-14T15:00:00.000Z";
const id = (n: number) => `a2000000-0000-4000-8000-${n.toString().padStart(12, "0")}`;
const compra = (n: number, cambios = {}) => compraDePrueba({ id: id(n), ...cambios });

const guardado = (ops: Operacion[], n: number, dueno: string | null = U) =>
  encolarGuardado(ops, { idOp: `g${n}`, compra: compra(n), dueno, ahora: AHORA });
const borrado = (ops: Operacion[], n: number, dueno: string | null = U) =>
  compactar(encolarBorrado(ops, { idOp: `b${n}`, compraId: id(n), fecha: "2026-10-14", dueno, ahora: AHORA }));
const estados = (ops: Operacion[]) => ops.map((o) => `${o.tipo}:${o.estado.tipo}`);

describe("encolar", () => {
  it("guardar agrega una operación pendiente con la compra completa y su dueño", () => {
    const ops = guardado([], 1);
    expect(ops).toEqual([
      {
        id: "g1",
        tipo: "guardar",
        dueno: U,
        fecha: "2026-10-14",
        encoladaEn: AHORA,
        estado: { tipo: "pendiente" },
        compra: compra(1),
      },
    ]);
  });

  it("encolar el borrado no toca el guardado: la anulación es un paso aparte (cierre entre escrituras)", () => {
    const ops = encolarBorrado(guardado([], 1), { idOp: "b1", compraId: id(1), fecha: "2026-10-14", dueno: U, ahora: AHORA });
    expect(estados(ops)).toEqual(["guardar:pendiente", "borrar:pendiente"]);
    expect(compactar(ops)).toEqual([]);
  });

  it("guardar y borrar antes de enviar se anulan, sin dejar nada que mandar (FR-011, SC-003)", () => {
    expect(borrado(guardado([], 1), 1)).toEqual([]);
  });

  it("un guardar rechazado o bloqueado nunca llegó al servidor: borrar lo quita sin encolar", () => {
    const rechazada = aplicarResultado(guardado([], 1), "g1", { tipo: "rechazada", causa: "23514" });
    expect(borrado(rechazada, 1)).toEqual([]);
    expect(borrado(bloquear(guardado([], 1), "g1", "medio"), 1)).toEqual([]);
  });

  it("con el guardar en envío, el borrado queda detrás (no se descarta el guardado)", () => {
    const enviando = marcarEnviando(guardado([], 1), "g1");
    expect(estados(borrado(enviando, 1))).toEqual(["guardar:enviando", "borrar:pendiente"]);
  });

  it("borrar algo que no tiene guardar en la cola (ya subida) encola un borrado", () => {
    expect(estados(borrado([], 1))).toEqual(["borrar:pendiente"]);
  });

  it("no duplica el borrado", () => {
    expect(borrado(borrado([], 1), 1)).toHaveLength(1);
  });
});

describe("siguienteLote (FR-009, SC-008)", () => {
  it("solo las del dueño de la sesión; las sin dueño esperan la adopción", () => {
    const ops = guardado(guardado(guardado([], 1, U), 2, "u-beto"), 3, null);
    expect(siguienteLote(ops, U).map((o) => o.id)).toEqual(["g1"]);
  });

  it("sin usuario no hay nada que enviar", () => {
    expect(siguienteLote(guardado([], 1), null)).toEqual([]);
  });

  it("una sola operación por compra, y el borrado espera a que termine el guardar", () => {
    const ops = borrado(marcarEnviando(guardado([], 1), "g1"), 1);
    expect(siguienteLote(ops, U)).toEqual([]);
    const terminado = aplicarResultado(ops, "g1", { tipo: "exito" });
    expect(siguienteLote(terminado, U).map((o) => o.id)).toEqual(["b1"]);
  });

  it("una rechazada, una bloqueada por decisión o una en envío no traban a las demás", () => {
    let ops = guardado(guardado(guardado(guardado([], 1), 2), 3), 4);
    ops = aplicarResultado(ops, "g1", { tipo: "rechazada", causa: "23514" });
    ops = bloquear(ops, "g2", "decision");
    ops = marcarEnviando(ops, "g3");
    expect(siguienteLote(ops, U).map((o) => o.id)).toEqual(["g4"]);
  });

  it("las bloqueadas por medio o promo se vuelven a evaluar: pueden haber llegado los mapeos", () => {
    const ops = bloquear(bloquear(guardado(guardado([], 1), 2), "g1", "medio"), "g2", "promo");
    expect(siguienteLote(ops, U).map((o) => o.id)).toEqual(["g1", "g2"]);
  });
});

describe("transiciones", () => {
  it("éxito quita la operación; transitorio la vuelve a pendiente; rechazada guarda la causa", () => {
    const enviando = marcarEnviando(guardado([], 1), "g1");
    expect(aplicarResultado(enviando, "g1", { tipo: "exito" })).toEqual([]);
    expect(estados(aplicarResultado(enviando, "g1", { tipo: "transitorio" }))).toEqual(["guardar:pendiente"]);
    expect(aplicarResultado(enviando, "g1", { tipo: "rechazada", causa: "23503" })[0]?.estado).toEqual({
      tipo: "rechazada",
      causa: "23503",
    });
  });

  it("reintentar vuelve una rechazada a pendiente", () => {
    const r = aplicarResultado(guardado([], 1), "g1", { tipo: "rechazada", causa: "23514" });
    expect(estados(reintentar(r, "g1"))).toEqual(["guardar:pendiente"]);
  });

  it("un id desconocido no cambia nada", () => {
    const ops = guardado([], 1);
    expect(aplicarResultado(ops, "no-existe", { tipo: "exito" })).toEqual(ops);
  });
});

describe("dueño (R5)", () => {
  it("adoptar le da las sin dueño al usuario; las de otro no cambian", () => {
    const ops = guardado(guardado([], 1, null), 2, "u-beto");
    const r = adoptar(ops, U);
    expect(r.map((o) => o.dueno)).toEqual([U, "u-beto"]);
  });

  it("declinar las deja solo en el teléfono: bloqueadas por decisión y sin dueño", () => {
    const r = declinar(guardado([], 1, null));
    expect(r[0]).toMatchObject({ dueno: null, estado: { tipo: "bloqueada", motivo: "decision" } });
    expect(siguienteLote(adoptar(r, U), U)).toEqual([]);
  });
});

describe("descartarViejas (FR-019)", () => {
  it("quita las de compras de más de 90 días y conserva la del día 90", () => {
    const hoy = "2026-10-14";
    const en = (fecha: string, n: number): Operacion => ({ ...guardado([], n)[0]!, fecha });
    const dia90 = "2026-07-16";
    const dia91 = "2026-07-15";
    const r = descartarViejas([en(dia91, 1), en(dia90, 2), en(hoy, 3)], hoy);
    expect(r.map((o) => o.id)).toEqual(["g2", "g3"]);
  });
});

describe("contarPendientes (FR-016)", () => {
  it("cuenta todos los guardados y borrados que el servidor todavía no tiene, también los solo-en-el-teléfono", () => {
    let ops = borrado(guardado(guardado([], 1), 2), 9);
    ops = bloquear(ops, "g2", "decision");
    expect(contarPendientes(ops)).toEqual({ guardados: 2, borrados: 1 });
  });
});

describe("reconciliar (FR-007, FR-013)", () => {
  const hoy = "2026-10-14";
  const contexto = (ids = generadorDeIds("11111111-1111-4111-8111-")) => ({
    generarId: ids,
    dueno: U,
    ahora: AHORA,
    hoy,
  });

  it("un guardar cuya compra no está en la lista la restaura", () => {
    const r = reconciliar([], guardado([], 1), contexto());
    expect(r.lista.map((c) => c.id)).toEqual([id(1)]);
  });

  it("un borrar cuya compra sigue en la lista la saca", () => {
    const r = reconciliar([compra(1)], borrado([], 1), contexto());
    expect(r.lista).toEqual([]);
  });

  it("un guardar seguido de su borrado no restaura la compra", () => {
    const enviando = marcarEnviando(guardado([], 1), "g1");
    const r = reconciliar([], borrado(enviando, 1), contexto());
    expect(r.lista).toEqual([]);
  });

  it("migra una compra con id nN: recibe un UUID nuevo y se encola una vez", () => {
    const vieja = compraDePrueba({ id: "n11" });
    const r = reconciliar([vieja], [], contexto());
    expect(r.lista).toHaveLength(1);
    expect(r.lista[0]?.id).toBe("11111111-1111-4111-8111-000000000001");
    expect(r.operaciones).toHaveLength(1);
    expect(r.operaciones[0]).toMatchObject({ tipo: "guardar", dueno: U, estado: { tipo: "pendiente" } });
    // Una segunda pasada ya no encuentra nada que migrar.
    const otra = reconciliar(r.lista, r.operaciones, contexto());
    expect(otra.operaciones).toHaveLength(1);
    expect(otra.lista.map((c) => c.id)).toEqual(r.lista.map((c) => c.id));
  });

  it("las compras de ejemplo no se migran ni se encolan", () => {
    const r = reconciliar([compraDePrueba({ id: "c1" })], [], contexto());
    expect(r.lista.map((c) => c.id)).toEqual(["c1"]);
    expect(r.operaciones).toEqual([]);
  });

  it("descarta las operaciones de más de 90 días", () => {
    const vieja: Operacion = { ...guardado([], 1)[0]!, fecha: "2026-01-01" };
    expect(reconciliar([], [vieja], contexto()).operaciones).toEqual([]);
  });
});
