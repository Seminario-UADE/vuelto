import { describe, expect, it } from "vitest";
import { comprasOctubre } from "../data/fixtures";
import { escenarioElegido, sesionCerrada } from "./acciones";
import { compraAgregada } from "./compras";
import { contactoAgregado, contactoQuitado } from "./contactos";
import { mediosElegidos, onboardingTerminado } from "./perfil";
import { avisoMostrado, cuentaGuardada } from "./sesion";
import { comercioElegido, montoCambiado } from "./simulacion";
import { storeDePrueba } from "./prueba";

describe("simulacion", () => {
  it("monto ≤ 0, NaN o null queda null", () => {
    const s = storeDePrueba();
    for (const m of [0, -5, Number.NaN, null]) {
      s.dispatch(montoCambiado(m));
      expect(s.getState().simulacion.monto).toBeNull();
    }
    s.dispatch(montoCambiado(10000));
    expect(s.getState().simulacion.monto).toBe(10000);
  });

  it("otro comercio borra el monto; el mismo lo conserva", () => {
    const s = storeDePrueba();
    s.dispatch(comercioElegido("coto"));
    s.dispatch(montoCambiado(5000));
    s.dispatch(comercioElegido("coto"));
    expect(s.getState().simulacion).toEqual({ comercioId: "coto", monto: 5000 });
    s.dispatch(comercioElegido("ypf"));
    expect(s.getState().simulacion).toEqual({ comercioId: "ypf", monto: null });
  });
});

describe("escenarios de desarrollo (FR-014)", () => {
  it("mes sin compras vacía las compras; normal vuelve a las de ejemplo", () => {
    const s = storeDePrueba();
    s.dispatch(escenarioElegido("mes-vacio"));
    expect(s.getState().compras.lista).toEqual([]);
    expect(s.getState().sesion.escenario).toBe("mes-vacio");
    s.dispatch(escenarioElegido("normal"));
    expect(s.getState().compras.lista).toEqual(comprasOctubre);
  });
});

describe("contactos", () => {
  it("agregar no duplica; quitar lo saca", () => {
    const s = storeDePrueba();
    const tomas = { id: "tomas", nombre: "Tomás", iniciales: "T", vinculadoDesde: "2026-10-14" };
    s.dispatch(contactoAgregado(tomas));
    s.dispatch(contactoAgregado(tomas));
    s.dispatch(contactoQuitado("mateo"));
    expect(s.getState().contactos.lista.map((c) => c.id)).toEqual(["lucia", "tomas"]);
  });
});

describe("cerrar sesión", () => {
  it("vuelve todo al inicio salvo el reloj", () => {
    const s = storeDePrueba();
    s.dispatch(mediosElegidos(["galicia-visa-credito"]));
    s.dispatch(onboardingTerminado());
    s.dispatch(cuentaGuardada({ email: "martin@ejemplo.com", proveedor: "email" }));
    s.dispatch(avisoMostrado("hola"));
    s.dispatch(compraAgregada({ ...comprasOctubre[0]!, id: "n11" }));
    s.dispatch(comercioElegido("coto"));
    const ahora = s.getState().sesion.ahora;
    s.dispatch(sesionCerrada());
    const e = s.getState();
    expect(e.perfil.onboardingCompleto).toBe(false);
    expect(e.perfil.medios).toEqual([]);
    expect(e.sesion.cuenta).toBeNull();
    expect(e.sesion.aviso).toBeNull();
    expect(e.compras.lista).toEqual(comprasOctubre);
    expect(e.simulacion.comercioId).toBeNull();
    expect(e.sesion.ahora).toBe(ahora);
  });
});
