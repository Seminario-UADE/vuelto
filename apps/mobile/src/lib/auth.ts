/**
 * Login y registro con email y contraseña (Supabase Auth). Funciones sobre un cliente
 * inyectado, sin React ni estado: las usa `src/data/auth.ts`, que las conecta con el
 * cliente real y con la sesión de la app. Los errores salen siempre en español, con qué
 * pasó y cómo seguir (DESIGN.md §5).
 */
import type { AuthError, SupabaseClient, User } from "@supabase/supabase-js";

export type ClienteAuth = Pick<SupabaseClient["auth"], "signUp" | "signInWithPassword" | "signOut">;

export type Cuenta = { id: string; email: string | null };

/** `campo` dice qué input marcar en rojo; `null` es un error del formulario entero. */
export type ErrorAuth = { campo: "email" | "clave" | null; mensaje: string };

export type ResultadoAuth =
  | { ok: true; cuenta: Cuenta }
  /** El proyecto exige confirmar el email: la cuenta existe pero todavía no hay sesión. */
  | { ok: true; cuenta: null; confirmarEmail: true }
  | ({ ok: false } & ErrorAuth);

/** Mínimo de la contraseña. Supabase local exige 6; pedimos más. */
export const CLAVE_MINIMA = 8;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const EMAIL_INVALIDO: ErrorAuth = { campo: "email", mensaje: "Revisá el email: falta algo antes o después de la @." };
const YA_REGISTRADO: ErrorAuth = { campo: "email", mensaje: "Ya hay una cuenta con ese email. Entrá con tu contraseña." };

export function validarEmail(email: string): ErrorAuth | null {
  return EMAIL.test(email.trim()) ? null : EMAIL_INVALIDO;
}

export function validarClave(clave: string): ErrorAuth | null {
  if (clave.length === 0) return { campo: "clave", mensaje: "Poné una contraseña." };
  if (clave.length < CLAVE_MINIMA) {
    return { campo: "clave", mensaje: `La contraseña es muy corta: usá al menos ${CLAVE_MINIMA} caracteres.` };
  }
  return null;
}

const SIN_CONEXION: ErrorAuth = {
  campo: null,
  mensaje: "No pudimos conectarnos. Revisá tu conexión e intentá de nuevo.",
};

/** Traduce un error de Supabase Auth por su `code`, que es estable (el `message` no). */
export function errorEnEspanol(error: Pick<AuthError, "name" | "status"> & { code?: string }): ErrorAuth {
  switch (error.code) {
    case "invalid_credentials":
      return { campo: null, mensaje: "El email o la contraseña no coinciden. Revisalos e intentá de nuevo." };
    case "user_already_exists":
    case "email_exists":
      return YA_REGISTRADO;
    case "weak_password":
      return { campo: "clave", mensaje: "La contraseña es muy débil. Probá con una más larga, mezclando letras y números." };
    case "email_not_confirmed":
      return { campo: null, mensaje: "Todavía no confirmaste tu email. Abrí el link que te mandamos y volvé a entrar." };
    case "email_address_invalid":
    case "validation_failed":
      return EMAIL_INVALIDO;
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return { campo: null, mensaje: "Hiciste muchos intentos seguidos. Esperá unos minutos y probá de nuevo." };
    case "signup_disabled":
      return { campo: null, mensaje: "Por ahora no se pueden crear cuentas nuevas." };
  }
  if (error.name === "AuthRetryableFetchError" || error.status === 0) return SIN_CONEXION;
  return { campo: null, mensaje: "Algo salió mal de nuestro lado. Probá de nuevo en un rato." };
}

export const aCuenta = (u: Pick<User, "id" | "email">): Cuenta => ({ id: u.id, email: u.email ?? null });

async function conRed<T>(pedido: () => Promise<T>): Promise<T | ErrorAuth> {
  try {
    return await pedido();
  } catch {
    return SIN_CONEXION;
  }
}

function validar(email: string, clave: string): ErrorAuth | null {
  return validarEmail(email) ?? validarClave(clave);
}

export async function registrar(auth: ClienteAuth, email: string, clave: string): Promise<ResultadoAuth> {
  const invalido = validar(email, clave);
  if (invalido) return { ok: false, ...invalido };

  const r = await conRed(() => auth.signUp({ email: email.trim(), password: clave }));
  if ("mensaje" in r) return { ok: false, ...r };
  if (r.error) return { ok: false, ...errorEnEspanol(r.error) };
  const { user, session } = r.data;
  // Con confirmación de email activa, registrar un email que ya existe no da error (para no
  // revelar quién tiene cuenta): devuelve un usuario sin identidades.
  if (user && user.identities?.length === 0) return { ok: false, ...YA_REGISTRADO };
  if (!session || !user) return { ok: true, cuenta: null, confirmarEmail: true };
  return { ok: true, cuenta: aCuenta(user) };
}

export async function entrar(auth: ClienteAuth, email: string, clave: string): Promise<ResultadoAuth> {
  // Al entrar solo se exige que haya algo: el largo mínimo es una regla de crear la contraseña.
  const invalido = validarEmail(email) ?? (clave.length === 0 ? validarClave(clave) : null);
  if (invalido) return { ok: false, ...invalido };

  const r = await conRed(() => auth.signInWithPassword({ email: email.trim(), password: clave }));
  if ("mensaje" in r) return { ok: false, ...r };
  if (r.error) return { ok: false, ...errorEnEspanol(r.error) };
  return { ok: true, cuenta: aCuenta(r.data.user) };
}

/** Cierra la sesión de este dispositivo. No revoca las de otros celulares del mismo usuario. */
export async function salir(auth: ClienteAuth): Promise<ErrorAuth | null> {
  const r = await conRed(() => auth.signOut({ scope: "local" }));
  if ("mensaje" in r) return r;
  return r.error ? errorEnEspanol(r.error) : null;
}
