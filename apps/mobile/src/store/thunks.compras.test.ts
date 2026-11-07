import { describe, expect, it } from "vitest";
import { mediosDeEjemplo } from "../data/fixtures";
import { promosConTopeCompartido } from "../data/compras/prueba";
import { mediosDeclarados } from "../data/fixtures";
import { escenarioElegido } from "./acciones";
import { corpusInicial } from "./corpus";
import { mediosConfirmados } from "./perfil";
import { storeDePrueba } from "./prueba";
import { selectResumenCompras, selectTopes } from "./selectores";
import { porConfirmarCreada } from "./por-confirmar";
import { ahoraCambio, usuarioCambio } from "./sesion";
import { comercioElegido, montoCambiado } from "./simulacion";
import { confirmarPorConfirmar, eliminarCompra, guardarCompra, usarRecomendacion } from "./thunks";

// Spec 010, historia 1: borrar una compra corrige los topes al instante y sin red.

function conMartin(estadoInicial: Parameters<typeof storeDePrueba>[0] = null) {
  const s = storeDePrueba(estadoInicial);
  s.dispatch(mediosConfirmados(mediosDeEjemplo(mediosDeclarados.map((m) => m.id))));
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

describe("guardarCompra con id (spec 012, FR-016)", () => {
  it("guarda la compra con el id que le pasan", () => {
    const s = conMartin();
    const compra = s.dispatch(guardarCompra(borrador, null, "00000000-0000-4000-8000-0000000000aa"));
    expect(compra.id).toBe("00000000-0000-4000-8000-0000000000aa");
    expect(s.getState().compras.lista[0]?.id).toBe(compra.id);
  });

  it("con un id que ya existe devuelve la compra existente sin duplicar ni encolar", () => {
    const s = conMartin();
    const primera = s.dispatch(guardarCompra(borrador, null, "00000000-0000-4000-8000-0000000000aa"));
    const antes = { lista: s.getState().compras.lista, cola: s.getState().cola.operaciones };
    const segunda = s.dispatch(guardarCompra({ ...borrador, monto: 1 }, null, primera.id));
    expect(segunda).toBe(primera);
    expect(s.getState().compras.lista).toBe(antes.lista);
    expect(s.getState().cola.operaciones).toBe(antes.cola);
  });
});

describe("confirmarPorConfirmar (spec 012, FR-006, FR-016, SC-008)", () => {
  function conPorConfirmar(monto: number | null = 24500) {
    const s = conMartin();
    s.dispatch(usuarioCambio({ id: "u1", email: null }));
    s.dispatch(comercioElegido("coto"));
    s.dispatch(montoCambiado(monto));
    const r = s.dispatch(usarRecomendacion());
    if (r === null) throw new Error("no se creó la compra por confirmar");
    return { s, pc: r.porConfirmar };
  }

  const delBorrador = (pc: { comercioNombre: string; medioId: string; monto: number | null }) => ({
    modo: "excepcion" as const,
    comercio: pc.comercioNombre,
    fecha: "2026-10-14",
    monto: pc.monto ?? 24500,
    medioId: pc.medioId,
    textoExtraido: null,
    usarPromo: true,
  });

  it("deja una sola compra con el id de la compra por confirmar, origen excepcion, y la saca de la lista", () => {
    const { s, pc } = conPorConfirmar();
    const antes = s.getState().compras.lista.length;
    const compra = s.dispatch(confirmarPorConfirmar(pc.id, delBorrador(pc)));
    expect(compra.id).toBe(pc.id);
    expect(compra.origen).toBe("excepcion");
    expect(s.getState().compras.lista).toHaveLength(antes + 1);
    expect(s.getState().porConfirmar.lista).toEqual([]);
  });

  it("los topes recién cambian al confirmar", () => {
    const { s, pc } = conPorConfirmar();
    const antes = selectTopes(s.getState());
    s.dispatch(confirmarPorConfirmar(pc.id, delBorrador(pc)));
    expect(selectTopes(s.getState())).not.toEqual(antes);
  });

  it("confirmar dos veces deja una sola compra (SC-008)", () => {
    const { s, pc } = conPorConfirmar();
    const antes = s.getState().compras.lista.length;
    const primera = s.dispatch(confirmarPorConfirmar(pc.id, delBorrador(pc)));
    const segunda = s.dispatch(confirmarPorConfirmar(pc.id, delBorrador(pc)));
    expect(segunda).toBe(primera);
    expect(s.getState().compras.lista.filter((c) => c.id === pc.id)).toHaveLength(1);
    expect(s.getState().compras.lista).toHaveLength(antes + 1);
    expect(s.getState().cola.operaciones.filter((o) => o.tipo === "guardar")).toHaveLength(1);
  });

  it("si la compra ya estaba registrada (la app se cerró entre las dos escrituras), solo saca la por confirmar", () => {
    const { s, pc } = conPorConfirmar();
    s.dispatch(guardarCompra(delBorrador(pc), null, pc.id));
    // Simula que la compra por confirmar quedó en el disco y volvió al abrir.
    s.dispatch(porConfirmarCreada(pc));
    const antes = s.getState().compras.lista.length;
    s.dispatch(confirmarPorConfirmar(pc.id, delBorrador(pc)));
    expect(s.getState().compras.lista).toHaveLength(antes);
    expect(s.getState().porConfirmar.lista).toEqual([]);
  });

  it("con otro medio el origen es manual (FR-006)", () => {
    const { s, pc } = conPorConfirmar();
    const compra = s.dispatch(confirmarPorConfirmar(pc.id, { ...delBorrador(pc), medioId: "macro-visa-debito" }));
    expect(compra.origen).toBe("manual");
  });

  it("vencida igual se puede guardar si la hoja ya estaba abierta (Edge Cases)", () => {
    const { s, pc } = conPorConfirmar();
    s.dispatch(ahoraCambio("2026-10-20T12:00:00.000Z"));
    const compra = s.dispatch(confirmarPorConfirmar(pc.id, delBorrador(pc)));
    expect(compra.id).toBe(pc.id);
    expect(compra.origen).toBe("excepcion");
  });

  it("sin monto falla como guardarCompra y la compra por confirmar queda", () => {
    const { s, pc } = conPorConfirmar(null);
    expect(() => s.dispatch(confirmarPorConfirmar(pc.id, { ...delBorrador(pc), monto: null }))).toThrow();
    expect(s.getState().porConfirmar.lista).toHaveLength(1);
  });
});
