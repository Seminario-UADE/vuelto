import { describe, expect, it } from "vitest";
import { promosConTopeCompartido } from "../data/compras/prueba";
import { mediosDeclarados } from "../data/fixtures";
import { escenarioElegido } from "./acciones";
import { corpusInicial } from "./corpus";
import { mediosElegidos } from "./perfil";
import { storeDePrueba } from "./prueba";
import { selectResumenCompras, selectTopes } from "./selectores";
import { eliminarCompra, guardarCompra } from "./thunks";

// Spec 010, historia 1: borrar una compra corrige los topes al instante y sin red.

function conMartin(estadoInicial: Parameters<typeof storeDePrueba>[0] = null) {
  const s = storeDePrueba(estadoInicial);
  s.dispatch(mediosElegidos(mediosDeclarados.map((m) => m.id)));
  return s;
}

const borrador = {
  modo: "manual" as const,
  comercio: "Coto",
  fecha: "2026-10-14",
  monto: 24500,
  medioId: "galicia-visa-credito",
  textoExtraido: null,
  usarPromo: true,
};

describe("eliminarCompra (FR-001, FR-002)", () => {
  it("saca la compra y los topes y totales vuelven a como estaban", () => {
    const s = conMartin();
    const antes = { topes: selectTopes(s.getState()), resumen: selectResumenCompras(s.getState()) };
    const compra = s.dispatch(guardarCompra(borrador));
    expect(selectTopes(s.getState())).not.toEqual(antes.topes);

    const borrada = s.dispatch(eliminarCompra(compra.id));
    expect(borrada?.id).toBe(compra.id);
    expect(s.getState().compras.lista.some((c) => c.id === compra.id)).toBe(false);
    expect(selectTopes(s.getState())).toEqual(antes.topes);
    expect(selectResumenCompras(s.getState())).toEqual(antes.resumen);
  });

  it("con un tope compartido, la base baja en uno y sin compras dice que no hay base", () => {
    // El corpus ya no se carga con una acción suelta (spec 009): entra como estado inicial.
    const s = conMartin({ corpus: { ...corpusInicial, promociones: promosConTopeCompartido() } });
    s.dispatch(escenarioElegido("mes-vacio"));
    const sinCompras = selectTopes(s.getState());
    expect(sinCompras.medios.every((m) => m.base.tipo === "sin-compras")).toBe(true);

    const compra = s.dispatch(guardarCompra(borrador));
    const conUna = selectTopes(s.getState());
    const galicia = conUna.medios.find((m) => m.medio.id === "galicia-visa-credito");
    expect(galicia?.base.tipo).toBe("compras");

    s.dispatch(eliminarCompra(compra.id));
    expect(selectTopes(s.getState())).toEqual(sinCompras);
  });

  it("una compra de ejemplo también se puede sacar de la lista local", () => {
    const s = conMartin();
    const antes = s.getState().compras.lista.length;
    s.dispatch(eliminarCompra("c10"));
    expect(s.getState().compras.lista).toHaveLength(antes - 1);
  });

  it("un id que no existe no cambia nada y devuelve null", () => {
    const s = conMartin();
    const antes = s.getState().compras;
    expect(s.dispatch(eliminarCompra("no-existe"))).toBeNull();
    expect(s.getState().compras).toBe(antes);
  });
});
