/**
 * Conecta Supabase Auth con la sesión de la app. `iniciarAuth` lee la sesión guardada en el
 * dispositivo y sigue sus cambios; `registrarCuenta`, `entrarCuenta` y `cerrarSesion` son lo
 * que llaman las pantallas. El usuario queda en `sesion.ts`, que es lo que lee la UI.
 */
import { supabase } from "../lib/supabase";
import * as auth from "../lib/auth";
import { aCuenta } from "../lib/auth";
import type { ResultadoAuth } from "../lib/auth";
import { borrarPerfilLocal } from "./perfil-local";
import { reiniciarSesion, setUsuario } from "./sesion";

const SIN_SUPABASE: ResultadoAuth = {
  ok: false,
  campo: null,
  mensaje: "La app no está conectada a un servidor de cuentas. Avisale al equipo.",
};

/** Lo del dispositivo pertenece al usuario que salió: el próximo que entre arranca limpio. */
async function limpiarDispositivo(): Promise<void> {
  reiniciarSesion();
  await borrarPerfilLocal();
}

/**
 * Llamar una vez al abrir la app. Devuelve la función que corta la suscripción. También
 * cubre la sesión que vence o se revoca (el cliente emite `SIGNED_OUT`).
 */
export function iniciarAuth(): () => void {
  if (!supabase) {
    setUsuario(null);
    return () => undefined;
  }
  const cliente = supabase;
  let activo = true;

  const { data } = cliente.auth.onAuthStateChange((evento, sesion) => {
    if (!activo) return;
    if (evento === "SIGNED_OUT") {
      setUsuario(null);
      void limpiarDispositivo();
    } else if (sesion) {
      setUsuario(aCuenta(sesion.user));
    }
  });

  // Sin red y con el token vencido getSession() no trae sesión, pero tampoco la borra: cuando
  // vuelve la conexión el cliente refresca y el listener de arriba deja entrar al usuario.
  cliente.auth
    .getSession()
    .then(({ data: { session } }) => activo && setUsuario(session ? aCuenta(session.user) : null))
    .catch(() => activo && setUsuario(null));

  return () => {
    activo = false;
    data.subscription.unsubscribe();
  };
}

export async function registrarCuenta(email: string, clave: string): Promise<ResultadoAuth> {
  if (!supabase) return SIN_SUPABASE;
  const r = await auth.registrar(supabase.auth, email, clave);
  if (r.ok && r.cuenta) setUsuario(r.cuenta);
  return r;
}

export async function entrarCuenta(email: string, clave: string): Promise<ResultadoAuth> {
  if (!supabase) return SIN_SUPABASE;
  const r = await auth.entrar(supabase.auth, email, clave);
  if (r.ok && r.cuenta) setUsuario(r.cuenta);
  return r;
}

/** Devuelve el mensaje si no pudo cerrar la sesión; `null` si salió. */
export async function cerrarSesion(): Promise<string | null> {
  if (!supabase) {
    setUsuario(null);
    await limpiarDispositivo();
    return null;
  }
  const error = await auth.salir(supabase.auth);
  return error?.mensaje ?? null;
}
