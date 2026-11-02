/**
 * Conecta Supabase Auth con el store (capa imperativa, ADR-009). `iniciarAuth` lee la sesión
 * guardada en el dispositivo y sigue sus cambios; `registrarCuenta`, `entrarCuenta` y
 * `cerrarSesion` son lo que despachan las pantallas. El usuario queda en `sesion.usuario`.
 */
import * as auth from "../lib/auth";
import { aCuenta, type ResultadoAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
import { sesionCerrada } from "../store/acciones";
import { usuarioCambio } from "../store/sesion";
import type { AppThunk } from "../store";

const SIN_SUPABASE: ResultadoAuth = {
  ok: false,
  campo: null,
  mensaje: "La app no está conectada a un servidor de cuentas. Avisale al equipo.",
};

/**
 * Llamar una vez al abrir la app. Devuelve la función que corta la suscripción. También cubre
 * la sesión que vence o se revoca: el cliente emite `SIGNED_OUT` y todo lo del usuario que salió
 * (perfil, compras, aviso) vuelve al inicio, así el próximo que entre arranca limpio.
 */
export function iniciarAuth(): AppThunk<() => void> {
  return (dispatch) => {
    if (!supabase) {
      dispatch(usuarioCambio(null));
      return () => undefined;
    }
    const cliente = supabase;
    let activo = true;

    const { data } = cliente.auth.onAuthStateChange((evento, sesion) => {
      if (!activo) return;
      if (evento === "SIGNED_OUT") dispatch(sesionCerrada());
      else if (sesion) dispatch(usuarioCambio(aCuenta(sesion.user)));
    });

    // Sin red y con el token vencido getSession() no trae sesión, pero tampoco la borra: cuando
    // vuelve la conexión el cliente refresca y el listener de arriba deja entrar al usuario.
    cliente.auth
      .getSession()
      .then(({ data: { session } }) => activo && dispatch(usuarioCambio(session ? aCuenta(session.user) : null)))
      .catch(() => activo && dispatch(usuarioCambio(null)));

    return () => {
      activo = false;
      data.subscription.unsubscribe();
    };
  };
}

export function registrarCuenta(email: string, clave: string): AppThunk<Promise<ResultadoAuth>> {
  return async (dispatch) => {
    if (!supabase) return SIN_SUPABASE;
    const r = await auth.registrar(supabase.auth, email, clave);
    if (r.ok && r.cuenta) dispatch(usuarioCambio(r.cuenta));
    return r;
  };
}

export function entrarCuenta(email: string, clave: string): AppThunk<Promise<ResultadoAuth>> {
  return async (dispatch) => {
    if (!supabase) return SIN_SUPABASE;
    const r = await auth.entrar(supabase.auth, email, clave);
    if (r.ok && r.cuenta) dispatch(usuarioCambio(r.cuenta));
    return r;
  };
}

/** Devuelve el mensaje si no pudo cerrar la sesión; `null` si salió. */
export function cerrarSesion(): AppThunk<Promise<string | null>> {
  return async (dispatch) => {
    if (!supabase) {
      dispatch(sesionCerrada());
      return null;
    }
    const error = await auth.salir(supabase.auth);
    return error?.mensaje ?? null;
  };
}
