import { describe, expect, it } from "vitest";
import { estimarTopes } from "@vuelto/motor";
import { claveDeTope } from "../data/calculo";
import { promosConTopeCompartido } from "../data/compras/prueba";
import { mediosDeclarados, mediosDeEjemplo } from "../data/fixtures";
import { escenarioElegido } from "./acciones";
import { corpusInicial } from "./corpus";
import { mediosConfirmados } from "./perfil";
import { storeDePrueba } from "./prueba";
import { selectComprasDeTope, selectEntradasMotor, selectTopes } from "./selectores";
import { eliminarCompra, guardarCompra } from "./thunks";

// Issue #45: tocar un tope muestra las compras que lo consumieron, sin red.

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

describe("selectComprasDeTope", () => {
  it("mismas promos y compras → las mismas compras que cuenta estimarTopes()", () => {
    const s = conMartin();
    const { promociones, compras, perfil, ahora } = selectEntradasMotor(s.getState());
    const directo = estimarTopes(promociones, compras, perfil, ahora);
    const topes = selectTopes(s.getState()).medios;
    expect(topes.length).toBeGreaterThan(0);
    for (const t of topes) {
      const est = directo.find((e) => claveDeTope(e) === t.clave);
      const r = selectComprasDeTope(s.getState(), t.clave);
      expect(r?.compras.map((c) => c.id).sort()).toEqual(est?.compraIds);
      // La lista y el "según N compras" de la tarjeta salen del mismo cálculo (Principio V).
      if (t.base.tipo === "compras") expect(r?.compras).toHaveLength(t.base.cantidad);
      expect(r?.tope.consejo).toBeNull();
    }
  });

  it("es memoizado: el mismo estado y el mismo tope devuelven la misma referencia", () => {
    const s = conMartin();
    const clave = selectTopes(s.getState()).medios[0]?.clave ?? "";
    expect(selectComprasDeTope(s.getState(), clave)).toBe(selectComprasDeTope(s.getState(), clave));
  });

  it("un tope compartido agrupa sus promos y lista las compras de todas", () => {
    const s = conMartin({ corpus: { ...corpusInicial, promociones: promosConTopeCompartido() } });
    s.dispatch(escenarioElegido("mes-vacio"));
    const miercoles = s.dispatch(guardarCompra(borrador));
    const jueves = s.dispatch(guardarCompra({ ...borrador, fecha: "2026-10-08", monto: 10000 }));
    const r = selectComprasDeTope(s.getState(), "grupo:galicia-mensual");
    expect(r?.tope.promociones).toHaveLength(2);
    expect(r?.compras.map((c) => c.id).sort()).toEqual([miercoles.id, jueves.id].sort());
    expect(r?.tope.base).toMatchObject({ tipo: "compras", cantidad: 2 });
  });

  it("guardar y borrar una compra actualiza la lista y la base al instante", () => {
    const s = conMartin({ corpus: { ...corpusInicial, promociones: promosConTopeCompartido() } });
    s.dispatch(escenarioElegido("mes-vacio"));
    const clave = "grupo:galicia-mensual";
    expect(selectComprasDeTope(s.getState(), clave)?.compras).toEqual([]);
    expect(selectComprasDeTope(s.getState(), clave)?.tope.base.tipo).toBe("sin-compras");

    const compra = s.dispatch(guardarCompra(borrador));
    expect(selectComprasDeTope(s.getState(), clave)?.compras.map((c) => c.id)).toEqual([compra.id]);

    s.dispatch(eliminarCompra(compra.id));
    expect(selectComprasDeTope(s.getState(), clave)?.compras).toEqual([]);
    expect(selectComprasDeTope(s.getState(), clave)?.tope.base.tipo).toBe("sin-compras");
  });

  it("una compra sin promo del tope no aparece", () => {
    const s = conMartin({ corpus: { ...corpusInicial, promociones: promosConTopeCompartido() } });
    s.dispatch(escenarioElegido("mes-vacio"));
    s.dispatch(guardarCompra({ ...borrador, usarPromo: false }));
    expect(selectComprasDeTope(s.getState(), "grupo:galicia-mensual")?.compras).toEqual([]);
  });

  it("una compra con un medio que ya no está en el perfil se lista igual: la lista nunca contradice la base", () => {
    const s = conMartin({ corpus: { ...corpusInicial, promociones: promosConTopeCompartido() } });
    s.dispatch(escenarioElegido("mes-vacio"));
    const compra = s.dispatch(guardarCompra(borrador));
    const rara = { ...compra, id: "medio-desconocido", medioDePagoId: "uuid-de-un-medio-sin-mapear" };
    const r = selectComprasDeTope(storeDePrueba({ ...s.getState(), compras: { lista: [compra, rara] } }).getState(), "grupo:galicia-mensual");
    expect(r?.compras.map((c) => c.id)).toEqual([compra.id, rara.id]);
    expect(r?.compras[1]?.medio.nombre).toBe("Medio que sacaste de tu perfil");
    expect(r?.tope.base).toMatchObject({ tipo: "compras", cantidad: 2 });
  });

  it("un tope que no está devuelve null", () => {
    expect(selectComprasDeTope(conMartin().getState(), "promo:no-existe")).toBeNull();
  });
});
