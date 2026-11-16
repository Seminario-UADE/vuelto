import { describe, expect, it } from "vitest";
import type { PedidoGrupo } from "../data/contracts";
import { cantidadDeIntegrantes, pedidoParaServidor } from "./pedido";

const pedido: PedidoGrupo = {
  comercio: { id: "la-parolaccia", nombre: "La Parolaccia", inicial: "L", rubro: "gastronomia", categoriaId: 2, frecuente: false },
  canal: "online",
  monto: 41000,
  contactos: ["u-lucia"],
  sinCuenta: [{ posicion: 0, nombre: "Sofía" }, { posicion: 3, nombre: "Tomi" }],
};

describe("pedidoParaServidor (FR-024, D5)", () => {
  it("sin fecha y con la cantidad de sin cuenta, nunca sus nombres", () => {
    const p = pedidoParaServidor(pedido);
    expect(p).toEqual({
      compra: { comercio: "La Parolaccia", categoriaId: 2, canal: "online", monto: 41000 },
      contactos: ["u-lucia"],
      sinCuenta: 2,
    });
    expect(JSON.stringify(p)).not.toMatch(/Sofía|Tomi/);
  });

  it("cuenta a quien pide", () => {
    expect(cantidadDeIntegrantes(pedido)).toBe(4);
  });
});
