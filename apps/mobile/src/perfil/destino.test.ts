import { describe, expect, it } from "vitest";
import { mediosDeEjemplo } from "../data/fixtures";
import { cargaCambio, invitacionGuardada, mediosLeidos, onboardingTerminado } from "../store/perfil";
import { storeDePrueba } from "../store/prueba";
import { sesionCerrada } from "../store/acciones";
import { usuarioCambio } from "../store/sesion";
import { destinoDeTabs, rutaPreviaALaInvitacion } from "./destino";

// Issue #137 (hallazgo G-07): quien abre una invitación y elige «Ya tengo cuenta» no la pierde.

const cuenta = { id: "u1", email: "ana@ejemplo.com" };
const destino = (s: ReturnType<typeof storeDePrueba>) =>
  destinoDeTabs(s.getState().sesion.usuario !== null, s.getState().perfil);

describe("invitación pendiente con «Ya tengo cuenta» (G-07)", () => {
  it("sin sesión, la invitación se guarda y se va a Bienvenida", () => {
    const s = storeDePrueba();
    s.dispatch(invitacionGuardada("tok"));
    expect(rutaPreviaALaInvitacion(false)).toBe("/bienvenida");
    expect(destino(s)).toEqual({ tipo: "bienvenida" });
  });

  it("al entrar con una cuenta que ya tiene medios, se abre la invitación guardada", () => {
    const s = storeDePrueba();
    s.dispatch(invitacionGuardada("tok"));
    s.dispatch(usuarioCambio(cuenta));
    // Hasta leer los medios de la cuenta no se decide (ni onboarding ni invitación).
    s.dispatch(cargaCambio("leyendo"));
    expect(destino(s)).toEqual({ tipo: "esperar" });
    s.dispatch(mediosLeidos(mediosDeEjemplo(["galicia-visa-credito"])));
    expect(destino(s)).toEqual({ tipo: "invitacion", token: "tok" });
  });

  it("la pantalla de aceptación la limpia al abrirse: se consume una sola vez", () => {
    const s = storeDePrueba();
    s.dispatch(invitacionGuardada("tok"));
    s.dispatch(usuarioCambio(cuenta));
    s.dispatch(mediosLeidos(mediosDeEjemplo(["galicia-visa-credito"])));
    expect(destino(s)).toEqual({ tipo: "invitacion", token: "tok" });
    // `/i/[token]` con sesión y perfil listo hace esto y no la vuelve a guardar.
    s.dispatch(invitacionGuardada(null));
    expect(s.getState().perfil.invitacionPendiente).toBeNull();
    expect(destino(s)).toEqual({ tipo: "tabs" });
  });

  it("sin medios en la cuenta, primero el onboarding; la invitación sigue guardada para el final", () => {
    const s = storeDePrueba();
    s.dispatch(invitacionGuardada("tok"));
    s.dispatch(usuarioCambio(cuenta));
    s.dispatch(mediosLeidos([]));
    expect(destino(s)).toEqual({ tipo: "onboarding" });
    expect(s.getState().perfil.invitacionPendiente).toBe("tok");
    s.dispatch(mediosLeidos(mediosDeEjemplo(["galicia-visa-credito"])));
    s.dispatch(onboardingTerminado());
    expect(destino(s)).toEqual({ tipo: "invitacion", token: "tok" });
  });

  it("si no se pudo leer el perfil no se decide ni se pierde la invitación", () => {
    const s = storeDePrueba();
    s.dispatch(invitacionGuardada("tok"));
    s.dispatch(usuarioCambio(cuenta));
    s.dispatch(cargaCambio("sin-conexion"));
    expect(destino(s)).toEqual({ tipo: "error-de-carga" });
    expect(s.getState().perfil.invitacionPendiente).toBe("tok");
  });

  it("abrir el link con sesión pero sin perfil listo va a la raíz, no a Bienvenida", () => {
    expect(rutaPreviaALaInvitacion(true)).toBe("/");
  });

  it("cerrar sesión descarta la invitación pendiente", () => {
    const s = storeDePrueba();
    s.dispatch(invitacionGuardada("tok"));
    s.dispatch(usuarioCambio(cuenta));
    s.dispatch(sesionCerrada());
    expect(s.getState().perfil.invitacionPendiente).toBeNull();
  });
});
