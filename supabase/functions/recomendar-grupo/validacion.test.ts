import { describe, expect, it } from "vitest";
import { validarPedidoGrupo } from "./validacion.ts";

const YO = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const LUCIA = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const MATEO = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

const compra = { comercio: "La Parolaccia", categoriaId: 2, canal: "presencial", monto: 41000 };
const body = (datos: Record<string, unknown> = {}) => ({ compra, contactos: [LUCIA], sinCuenta: 1, ...datos });
const campo = (b: unknown) => {
  const r = validarPedidoGrupo(b, YO);
  return r.ok ? null : r.campo;
};

describe("validarPedidoGrupo (contracts/recomendar-grupo.md)", () => {
  it("acepta un pedido válido y normaliza los ids a minúsculas", () => {
    const r = validarPedidoGrupo(body({ contactos: [LUCIA.toUpperCase()] }), YO);
    expect(r).toEqual({
      ok: true,
      pedido: { compra: { ...compra, canal: "presencial" }, contactos: [LUCIA], sinCuenta: 1 },
    });
  });

  it("body que no es objeto o con campos de más", () => {
    expect(campo(null)).toBe("body");
    expect(campo([])).toBe("body");
    expect(campo(body({ fecha: "2026-11-15" }))).toBe("fecha");
  });

  it("la compra: monto entero > 0, canal, categoría entera, comercio", () => {
    expect(campo(body({ compra: { ...compra, monto: 0 } }))).toBe("compra.monto");
    expect(campo(body({ compra: { ...compra, monto: 10.5 } }))).toBe("compra.monto");
    expect(campo(body({ compra: { ...compra, monto: "41000" } }))).toBe("compra.monto");
    expect(campo(body({ compra: { ...compra, canal: "telefono" } }))).toBe("compra.canal");
    expect(campo(body({ compra: { ...compra, categoriaId: 2.5 } }))).toBe("compra.categoriaId");
    expect(campo(body({ compra: { ...compra, comercio: "" } }))).toBe("compra.comercio");
    expect(campo(body({ compra: "x" }))).toBe("compra.body");
    expect(validarPedidoGrupo(body({ compra: { ...compra, comercio: null } }), YO).ok).toBe(true);
  });

  it("contactos: uuid, sin repetidos (sin importar mayúsculas) y sin quien pide", () => {
    expect(campo(body({ contactos: "x" }))).toBe("contactos");
    expect(campo(body({ contactos: ["no-es-uuid"] }))).toBe("contactos");
    expect(campo(body({ contactos: [LUCIA, LUCIA.toUpperCase()] }))).toBe("contactos");
    expect(campo(body({ contactos: [YO] }))).toBe("contactos");
  });

  it("sinCuenta: entero ≥ 0", () => {
    expect(campo(body({ sinCuenta: -1 }))).toBe("sinCuenta");
    expect(campo(body({ sinCuenta: 1.5 }))).toBe("sinCuenta");
    expect(campo(body({ sinCuenta: "2" }))).toBe("sinCuenta");
  });

  it("el grupo tiene entre 2 y 12 integrantes, quien pide incluido", () => {
    expect(campo(body({ contactos: [], sinCuenta: 0 }))).toBe("grupo");
    expect(campo(body({ contactos: [LUCIA, MATEO], sinCuenta: 10 }))).toBe("grupo");
    expect(validarPedidoGrupo(body({ contactos: [LUCIA, MATEO], sinCuenta: 9 }), YO).ok).toBe(true);
    expect(validarPedidoGrupo(body({ contactos: [], sinCuenta: 1 }), YO).ok).toBe(true);
  });
});
