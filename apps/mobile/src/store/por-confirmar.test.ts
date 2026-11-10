import { describe, expect, it } from "vitest";
import { mediosDeclarados, mediosDeEjemplo } from "../data/fixtures";
import { VENCIMIENTO_POR_CONFIRMAR_MS, type CompraPorConfirmar } from "../data/por-confirmar";
import { sesionCerrada } from "./acciones";
import { compraAgregada } from "./compras";
import { mediosConfirmados } from "./perfil";
import {
  porConfirmarCreada,
  porConfirmarDescartada,
  porConfirmarPurgadas,
  selectPorConfirmarVigentes,
} from "./por-confirmar";
import { storeDePrueba } from "./prueba";
import { selectRecomendacion, selectResumenCompras, selectTopes } from "./selectores";
import { ahoraCambio, usuarioCambio } from "./sesion";
import { comercioElegido, montoCambiado } from "./simulacion";
import { descartarPorConfirmar, usarRecomendacion } from "./thunks";

// Spec 012, US1: el slice `porConfirmar` y su efecto (nulo) sobre topes y recomendaciones.

const AHORA = "2026-10-14T15:00:00.000Z";

function conMartin(usuarioId = "u1") {
  const s = storeDePrueba();
  s.dispatch(mediosConfirmados(mediosDeEjemplo(mediosDeclarados.map((m) => m.id))));
  s.dispatch(usuarioCambio({ id: usuarioId, email: null }));
  s.dispatch(ahoraCambio(AHORA));
  return s;
}

const pc = (cambios: Partial<CompraPorConfirmar> = {}): CompraPorConfirmar => ({
  id: "pc-1",
  usuarioId: "u1",
  comercioId: "coto",
  comercioNombre: "Coto",
  medioId: "galicia-visa-credito",
  monto: null,
  creadaEn: AHORA,
  ...cambios,
});

const masTarde = (ms: number) => new Date(Date.parse(AHORA) + ms).toISOString();

describe("slice porConfirmar (data-model.md)", () => {
  it("porConfirmarCreada reemplaza la del mismo comercio (FR-012) y suma las de otros", () => {
    const s = conMartin();
    s.dispatch(porConfirmarCreada(pc({ id: "a" })));
    s.dispatch(porConfirmarCreada(pc({ id: "b", comercioId: "jumbo", comercioNombre: "Jumbo" })));
    s.dispatch(porConfirmarCreada(pc({ id: "c", monto: 5000 })));
    const ids = s.getState().porConfirmar.lista.map((c) => c.id).sort();
    expect(ids).toEqual(["b", "c"]);
  });

  it("selectPorConfirmarVigentes oculta las vencidas con el reloj del store y las de otro usuario", () => {
    const s = conMartin();
    s.dispatch(porConfirmarCreada(pc({ id: "mia" })));
    s.dispatch(porConfirmarCreada(pc({ id: "ajena", usuarioId: "u2", comercioId: "jumbo" })));
    expect(selectPorConfirmarVigentes(s.getState()).map((c) => c.id)).toEqual(["mia"]);

    s.dispatch(ahoraCambio(masTarde(VENCIMIENTO_POR_CONFIRMAR_MS - 1)));
    expect(selectPorConfirmarVigentes(s.getState()).map((c) => c.id)).toEqual(["mia"]);
    s.dispatch(ahoraCambio(masTarde(VENCIMIENTO_POR_CONFIRMAR_MS)));
    expect(selectPorConfirmarVigentes(s.getState())).toEqual([]);
  });

  it("las vigentes salen de la más nueva a la más vieja", () => {
    const s = conMartin();
    s.dispatch(porConfirmarCreada(pc({ id: "vieja", creadaEn: masTarde(-60_000) })));
    s.dispatch(porConfirmarCreada(pc({ id: "nueva", comercioId: "jumbo" })));
    expect(selectPorConfirmarVigentes(s.getState()).map((c) => c.id)).toEqual(["nueva", "vieja"]);
  });

  it("porConfirmarPurgadas saca las vencidas, las de otro dueño y las ya confirmadas", () => {
    const s = conMartin();
    s.dispatch(porConfirmarCreada(pc({ id: "vigente" })));
    s.dispatch(porConfirmarCreada(pc({ id: "vencida", comercioId: "jumbo", creadaEn: masTarde(-VENCIMIENTO_POR_CONFIRMAR_MS) })));
    s.dispatch(porConfirmarCreada(pc({ id: "ajena", comercioId: "dia", usuarioId: "u2" })));
    s.dispatch(porConfirmarCreada(pc({ id: "confirmada", comercioId: "carrefour" })));
    s.dispatch(porConfirmarPurgadas({ ahora: AHORA, usuarioId: "u1", idsConfirmados: ["confirmada"] }));
    expect(s.getState().porConfirmar.lista.map((c) => c.id)).toEqual(["vigente"]);
  });

  it("sin usuario conocido, la purga no descarta por dueño", () => {
    const s = conMartin();
    s.dispatch(porConfirmarCreada(pc({ id: "ajena", usuarioId: "u2" })));
    s.dispatch(porConfirmarPurgadas({ ahora: AHORA, usuarioId: null, idsConfirmados: [] }));
    expect(s.getState().porConfirmar.lista).toHaveLength(1);
  });

  it("al entrar otro usuario se descartan las del anterior (FR-014)", () => {
    const s = conMartin();
    s.dispatch(porConfirmarCreada(pc({ id: "de-u1" })));
    s.dispatch(usuarioCambio({ id: "u2", email: null }));
    expect(s.getState().porConfirmar.lista).toEqual([]);
  });

  it("una compra agregada con el mismo id la saca de la lista (FR-016)", () => {
    const s = conMartin();
    s.dispatch(porConfirmarCreada(pc({ id: "pc-1" })));
    s.dispatch(compraAgregada({ ...s.getState().compras.lista[0]!, id: "pc-1" }));
    expect(s.getState().porConfirmar.lista).toEqual([]);
  });

  it("porConfirmarDescartada la saca sin tocar las otras", () => {
    const s = conMartin();
    s.dispatch(porConfirmarCreada(pc({ id: "a" })));
    s.dispatch(porConfirmarCreada(pc({ id: "b", comercioId: "jumbo" })));
    s.dispatch(porConfirmarDescartada("a"));
    expect(s.getState().porConfirmar.lista.map((c) => c.id)).toEqual(["b"]);
  });

  it("sesionCerrada vacía la lista", () => {
    const s = conMartin();
    s.dispatch(porConfirmarCreada(pc()));
    s.dispatch(sesionCerrada());
    expect(s.getState().porConfirmar.lista).toEqual([]);
  });
});

describe("usarRecomendacion (FR-002, FR-004, FR-012)", () => {
  it("crea la compra por confirmar con el comercio, el medio y el monto, y limpia la simulación", () => {
    const s = conMartin();
    s.dispatch(comercioElegido("coto"));
    s.dispatch(montoCambiado(10000));
    const r = s.dispatch(usarRecomendacion());
    expect(r).not.toBeNull();
    expect(r?.reemplazo).toBe(false);
    expect(r?.porConfirmar).toMatchObject({
      usuarioId: "u1",
      comercioId: "coto",
      comercioNombre: "Coto",
      medioId: "galicia-visa-credito",
      monto: 10000,
      creadaEn: AHORA,
    });
    expect(s.getState().simulacion).toEqual({ comercioId: null, monto: null });
    expect(selectPorConfirmarVigentes(s.getState())).toHaveLength(1);
  });

  it("otra vez en el mismo comercio avisa que reemplazó", () => {
    const s = conMartin();
    s.dispatch(comercioElegido("coto"));
    s.dispatch(usarRecomendacion());
    s.dispatch(comercioElegido("coto"));
    const r = s.dispatch(usarRecomendacion());
    expect(r?.reemplazo).toBe(true);
    expect(s.getState().porConfirmar.lista).toHaveLength(1);
  });

  it("sin comercio simulado o sin usuario no hace nada", () => {
    expect(conMartin().dispatch(usarRecomendacion())).toBeNull();
    const s = storeDePrueba();
    s.dispatch(mediosConfirmados(mediosDeEjemplo(mediosDeclarados.map((m) => m.id))));
    s.dispatch(comercioElegido("coto"));
    expect(s.dispatch(usarRecomendacion())).toBeNull();
    expect(s.getState().porConfirmar.lista).toEqual([]);
  });
});

/**
 * SC-003: topes, bases, totales y recomendación exactamente iguales. Se comparan dos stores
 * con el mismo estado de partida y el mismo reloj: uno hace el caso y el otro no.
 */
describe("SC-003: una compra por confirmar no cambia topes, bases, totales ni recomendación", () => {
  type Store = ReturnType<typeof conMartin>;

  function lectura(s: Store, comercioId: string, monto: number | null) {
    s.dispatch(comercioElegido(comercioId));
    s.dispatch(montoCambiado(monto));
    return {
      topes: selectTopes(s.getState()),
      resumen: selectResumenCompras(s.getState()),
      recomendacion: selectRecomendacion(s.getState()),
    };
  }

  function comparar(caso: (s: Store) => void, monto: number | null = 10000) {
    const control = conMartin();
    const conCaso = conMartin();
    caso(conCaso);
    // Mismo reloj en los dos: el caso «vencida» lo adelanta.
    control.dispatch(ahoraCambio(conCaso.getState().sesion.ahora));
    for (const comercioId of ["coto", "jumbo"]) {
      expect(lectura(conCaso, comercioId, monto)).toEqual(lectura(control, comercioId, monto));
    }
  }

  const usar = (s: Store, comercioId: string, monto: number | null) => {
    s.dispatch(comercioElegido(comercioId));
    s.dispatch(montoCambiado(monto));
    const r = s.dispatch(usarRecomendacion());
    expect(r).not.toBeNull();
    return r!;
  };

  it("creada con monto", () => {
    comparar((s) => usar(s, "coto", 24500));
  });

  it("creada sin monto", () => {
    comparar((s) => usar(s, "coto", null), null);
  });

  it("reemplazada", () => {
    comparar((s) => {
      usar(s, "coto", 5000);
      expect(usar(s, "coto", 9000).reemplazo).toBe(true);
    });
  });

  it("vencida", () => {
    comparar((s) => {
      usar(s, "coto", 24500);
      s.dispatch(ahoraCambio(masTarde(VENCIMIENTO_POR_CONFIRMAR_MS)));
      expect(selectPorConfirmarVigentes(s.getState())).toEqual([]);
    });
  });

  it("descartada", () => {
    comparar((s) => {
      const { porConfirmar } = usar(s, "coto", 24500);
      expect(s.dispatch(descartarPorConfirmar(porConfirmar.id))?.id).toBe(porConfirmar.id);
      expect(s.getState().porConfirmar.lista).toEqual([]);
    });
  });

  it("«Revisá» cerrada sin guardar (no se despacha nada más)", () => {
    comparar((s) => {
      usar(s, "coto", 24500);
      // Revisá precarga con el borrador, pero cerrar la hoja no despacha nada: la compra sigue.
      expect(selectPorConfirmarVigentes(s.getState())).toHaveLength(1);
    });
  });
});
