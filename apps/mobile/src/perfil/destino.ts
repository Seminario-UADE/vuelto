import type { EstadoPerfilSlice } from "../store/perfil";

/**
 * Adónde manda `(tabs)/_layout` a quien llega a las pestañas (ADR-008 §1, issue #137). Es una función
 * pura de la sesión y del perfil, sin reloj ni red, para que el orden de las decisiones se pueda
 * testear: primero la sesión, después el perfil, y recién con el perfil listo la invitación que se
 * abrió antes de tener cuenta o medios.
 */
export type DestinoTabs =
  | { tipo: "bienvenida" }
  | { tipo: "esperar" }
  | { tipo: "error-de-carga" }
  | { tipo: "onboarding" }
  | { tipo: "invitacion"; token: string }
  | { tipo: "tabs" };

export function destinoDeTabs(hayUsuario: boolean, perfil: EstadoPerfilSlice): DestinoTabs {
  if (!hayUsuario) return { tipo: "bienvenida" };
  const sinMedios = !perfil.onboardingCompleto || perfil.medios.length === 0;
  if (sinMedios) {
    // Sin nada guardado en este celular, hasta saber si ya tiene medios en Supabase no se decide
    // (si los tiene, no repite el onboarding).
    if (perfil.carga === "sin-leer" || perfil.carga === "leyendo") return { tipo: "esperar" };
    // No se pudo leer: no se sabe si tiene medios, así que no se lo manda a repetir el onboarding (FR-010).
    if (perfil.carga === "sin-conexion" || perfil.carga === "servidor-desactualizado" || perfil.carga === "error") {
      return { tipo: "error-de-carga" };
    }
    return { tipo: "onboarding" };
  }
  if (perfil.invitacionPendiente) return { tipo: "invitacion", token: perfil.invitacionPendiente };
  return { tipo: "tabs" };
}

/**
 * Adónde manda `/i/[token]` a quien abre una invitación sin poder aceptarla todavía. Con sesión va a
 * la raíz: `(tabs)/_layout` espera el perfil, hace el onboarding si falta y vuelve a la invitación.
 */
export function rutaPreviaALaInvitacion(hayUsuario: boolean): "/bienvenida" | "/" {
  return hayUsuario ? "/" : "/bienvenida";
}
