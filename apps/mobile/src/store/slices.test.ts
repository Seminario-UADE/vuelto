import { describe, expect, it } from "vitest";
import { mediosDeEjemplo } from "../data/fixtures";
import { comprasOctubre } from "../data/fixtures";
import { escenarioElegido, sesionCerrada } from "./acciones";
import { preferenciaCambiada } from "./apariencia";
import { compraAgregada } from "./compras";
import { contactoAgregado, contactoQuitado } from "./contactos";
import { mediosConfirmados, nombreCambiado, onboardingTerminado } from "./perfil";
import { avisoMostrado, usuarioCambio } from "./sesion";
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
    expect(s.getState().simulacion).toEqual({ comercioId: "coto", monto: 5000, canal: "presencial" });
    s.dispatch(comercioElegido("ypf"));
    expect(s.getState().simulacion).toEqual({ comercioId: "ypf", monto: null, canal: "presencial" });
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

describe("nombre del usuario (spec 012, FR-029, SC-005)", () => {
  it("el estado inicial no trae ningún nombre", () => {
    expect(storeDePrueba().getState().perfil.nombre).toBeNull();
  });

  it("un escenario de demo carga «Martín» a propósito si no había nombre", () => {
    const s = storeDePrueba();
    s.dispatch(escenarioElegido("normal"));
    expect(s.getState().perfil.nombre).toBe("Martín");
  });

  it("un escenario de demo no pisa un nombre que el usuario cargó", () => {
    const s = storeDePrueba();
    s.dispatch(nombreCambiado("Sofía"));
    s.dispatch(escenarioElegido("mes-vacio"));
    expect(s.getState().perfil.nombre).toBe("Sofía");
  });

  it("cerrar sesión borra el nombre", () => {
    const s = storeDePrueba();
    s.dispatch(nombreCambiado("Sofía"));
    s.dispatch(sesionCerrada());
    expect(s.getState().perfil.nombre).toBeNull();
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

describe("usuario autenticado", () => {
  it("arranca sin usuario y sin saber si hay sesión guardada", () => {
    const e = storeDePrueba().getState().sesion;
    expect(e.usuario).toBeNull();
    expect(e.authLista).toBe(false);
  });

  it("al leer la sesión guardada queda lista, con o sin usuario", () => {
    const con = storeDePrueba();
    con.dispatch(usuarioCambio({ id: "u1", email: "ana@mail.com" }));
    expect(con.getState().sesion).toMatchObject({ usuario: { id: "u1", email: "ana@mail.com" }, authLista: true });

    const sin = storeDePrueba();
    sin.dispatch(usuarioCambio(null));
    expect(sin.getState().sesion).toMatchObject({ usuario: null, authLista: true });
  });
});

describe("cerrar sesión", () => {
  it("vuelve todo al inicio salvo el reloj", () => {
    const s = storeDePrueba();
    s.dispatch(mediosConfirmados(mediosDeEjemplo(["galicia-visa-credito"])));
    s.dispatch(onboardingTerminado());
    s.dispatch(usuarioCambio({ id: "u1", email: "martin@ejemplo.com" }));
    s.dispatch(avisoMostrado("hola"));
    s.dispatch(compraAgregada({ ...comprasOctubre[0]!, id: "n11" }));
    s.dispatch(comercioElegido("coto"));
    const ahora = s.getState().sesion.ahora;
    s.dispatch(sesionCerrada());
    const e = s.getState();
    expect(e.perfil.onboardingCompleto).toBe(false);
    expect(e.perfil.medios).toEqual([]);
    expect(e.sesion.usuario).toBeNull();
    expect(e.sesion.authLista).toBe(true);
    expect(e.sesion.aviso).toBeNull();
    expect(e.compras.lista).toEqual(comprasOctubre);
    expect(e.simulacion.comercioId).toBeNull();
    expect(e.sesion.ahora).toBe(ahora);
  });
});

describe("apariencia", () => {
  it("arranca siguiendo al sistema y guarda la preferencia elegida", () => {
    const s = storeDePrueba();
    expect(s.getState().apariencia.preferencia).toBe("sistema");
    s.dispatch(preferenciaCambiada("oscuro"));
    expect(s.getState().apariencia.preferencia).toBe("oscuro");
  });

  it("cerrar sesión no la borra: es del dispositivo, no de la cuenta", () => {
    const s = storeDePrueba();
    s.dispatch(preferenciaCambiada("claro"));
    s.dispatch(sesionCerrada());
    expect(s.getState().apariencia.preferencia).toBe("claro");
  });
});
