import { describe, expect, it } from "vitest";
import { mediosDeEjemplo } from "../data/fixtures";
import { mediosDeclarados, ticketDeEjemplo } from "../data/fixtures";
import { escenarioElegido } from "./acciones";
import { comerciosLeidos, mediosConfirmados } from "./perfil";
import {
  selectComercioSimulado,
  selectComerciosFrecuentes,
  selectPerfilVista,
  selectRecomendacion,
  selectResumenCompras,
  selectTopes,
} from "./selectores";
import { comercioElegido, montoCambiado } from "./simulacion";
import { guardarCompra } from "./thunks";
import { storeDePrueba } from "./prueba";

// Reglas que las pantallas dan por sentadas, ahora sobre el store: estimados con base
// (Principio V), cuentas que cierran entre pantallas y lo que pidió rules-guardian en la spec 006.

function conMartin() {
  const s = storeDePrueba();
  s.dispatch(mediosConfirmados(mediosDeEjemplo(mediosDeclarados.map((m) => m.id))));
  return s;
}

const borrador = {
  modo: "excepcion" as const,
  comercio: "Coto",
  fecha: "2026-10-14",
  monto: 24500,
  medioId: "galicia-visa-credito",
  textoExtraido: null,
  usarPromo: true,
};

describe("perfil del onboarding (FR-002 de la spec 006)", () => {
  it("medios y comercios frecuentes salen de lo que eligió el usuario", () => {
    const s = storeDePrueba();
    s.dispatch(mediosConfirmados(mediosDeEjemplo(["bbva-visa-credito"])));
    s.dispatch(
      comerciosLeidos([
        { id: "c1", nombre: "YPF" },
        { id: "c2", nombre: "Shell" },
      ]),
    );
    expect(selectPerfilVista(s.getState()).medios.map((m) => m.nombreCorto)).toEqual(["BBVA"]);
    expect(selectComerciosFrecuentes(s.getState()).map((c) => c.nombre)).toEqual(["YPF", "Shell"]);
  });

  it("un habitual escrito a mano se puede tocar, sin rubro inventado ni recomendación", () => {
    const s = storeDePrueba();
    s.dispatch(mediosConfirmados(mediosDeEjemplo(["bbva-visa-credito"])));
    s.dispatch(comerciosLeidos([{ id: "c1", nombre: "Panadería Juan" }]));
    const [libre] = selectComerciosFrecuentes(s.getState());
    expect(libre).toMatchObject({ nombre: "Panadería Juan", categoriaId: null });
    s.dispatch(comercioElegido(libre!.id));
    // Inicio avisa «No conocemos promos para…» en vez de quedar en blanco (issue #47).
    expect(selectComercioSimulado(s.getState())?.nombre).toBe("Panadería Juan");
    expect(selectRecomendacion(s.getState())).toBeNull();
  });

  it("un habitual con espacios o mayúsculas de más se reconoce como el del catálogo", () => {
    const s = storeDePrueba();
    s.dispatch(comerciosLeidos([{ id: "c1", nombre: "  ypf " }]));
    expect(selectComerciosFrecuentes(s.getState())[0]?.categoriaId).not.toBeNull();
  });

  it("si saltó los comercios, los frecuentes de ejemplo", () => {
    expect(selectComerciosFrecuentes(storeDePrueba().getState()).length).toBeGreaterThan(0);
  });
});

describe("compras", () => {
  it("todas son del mes en curso y la guardada aparece primera", () => {
    const s = conMartin();
    expect(selectResumenCompras(s.getState()).compras).toHaveLength(10);
    s.dispatch(guardarCompra(borrador));
    const { compras } = selectResumenCompras(s.getState());
    expect(compras[0]).toMatchObject({ comercio: { nombre: "Coto" }, reintegro: 4900, origen: "excepcion" });
    for (const c of compras) expect(c.fecha.startsWith("2026-10-")).toBe(true);
  });

  it("'te devolvieron' tiene la misma base en Topes y en Mis compras", () => {
    const s = conMartin();
    s.dispatch(guardarCompra(borrador));
    expect(selectTopes(s.getState()).devolvieron).toEqual(selectResumenCompras(s.getState()).devolvieron);
    expect(selectTopes(s.getState()).devolvieron.base.texto).toBe("según 11 compras de octubre");
  });

  it("un comercio fuera del catálogo no tiene rubro inventado ni reintegro", () => {
    const s = conMartin();
    s.dispatch(guardarCompra({ ...borrador, comercio: "Almacén de Juan", monto: 5000 }));
    const c = selectResumenCompras(s.getState()).compras[0];
    expect(c?.comercio.rubro).toBe("otro");
    expect(c?.reintegro).toBeNull();
  });

  it("la compra por ticket guarda el texto extraído, nunca la imagen", () => {
    const s = conMartin();
    s.dispatch(guardarCompra({ ...borrador, modo: "ticket", textoExtraido: ticketDeEjemplo("2026-10-14").textoExtraido }));
    expect(s.getState().compras.lista[0]?.textoExtraido).toContain("TOTAL");
    expect(JSON.stringify(s.getState().compras)).not.toMatch(/imagen|image|base64|uri/i);
  });
});

describe("mes sin compras (Principio V)", () => {
  it("ningún tope tiene cifra y todos dicen que no hay compras", () => {
    const s = conMartin();
    s.dispatch(escenarioElegido("mes-vacio"));
    const t = selectTopes(s.getState());
    expect(t.medios.every((m) => m.disponible === null && m.cifra === null && m.base.tipo === "sin-compras")).toBe(
      true,
    );
  });

  it("la recomendación toma el tope entero, sin cifra de tope a la vista", () => {
    const s = conMartin();
    s.dispatch(escenarioElegido("mes-vacio"));
    s.dispatch(comercioElegido("coto"));
    s.dispatch(montoCambiado(100000));
    const r = selectRecomendacion(s.getState());
    expect(r?.reintegro).toBe(10000);
    expect(r?.topeDisponible).toBeNull();
    expect(r?.topeDespues).toBeNull();
    expect(r?.base?.tipo).toBe("sin-compras");
  });
});

describe("recomendación con monto", () => {
  it("el reintegro nunca supera el tope disponible", () => {
    const s = conMartin();
    s.dispatch(comercioElegido("coto"));
    s.dispatch(montoCambiado(100000));
    expect(selectRecomendacion(s.getState())).toMatchObject({ reintegro: 6500, topeDespues: { disponible: 0 } });
  });

  it("Coto con $24.500: ≈$4.900, te sale ≈$19.600 y quedan ≈$1.600", () => {
    const s = conMartin();
    s.dispatch(comercioElegido("coto"));
    s.dispatch(montoCambiado(24500));
    expect(selectRecomendacion(s.getState())).toMatchObject({
      reintegro: 4900,
      teSale: 19600,
      topeDespues: { disponible: 1600 },
    });
  });
});
