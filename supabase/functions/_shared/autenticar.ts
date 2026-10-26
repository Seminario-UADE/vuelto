/**
 * Autenticación de las Edge Functions (ADR-009, spec 004 FR-018).
 *
 * El gateway de Supabase verifica la firma del JWT, pero la anon key también
 * es un JWT válido y no identifica a ningún usuario. Por eso cada función
 * pide el usuario a Supabase Auth (`getUser`) antes de leer cualquier dato.
 */
import type { UsuarioId } from "./repositorios.ts";

export interface Autenticador {
  /** `null` si no hay usuario logueado: sin header, token inválido o anon key. */
  usuarioDe(req: Request): Promise<UsuarioId | null>;
}

/**
 * Lo único que se usa del cliente de Supabase. Tipado estructural: el cliente
 * real (`createClient` de `@supabase/supabase-js`) lo cumple, y en Node no
 * hace falta instalar el SDK para chequear tipos ni testear.
 */
export interface ClienteAuth {
  auth: {
    getUser(jwt: string): Promise<{
      data: { user: { id: string } | null };
      /** `status` HTTP de Supabase Auth; `undefined` o 0 si ni siquiera respondió. */
      error: { status: number | undefined } | null;
    }>;
  };
}

/** Supabase Auth no respondió: no se sabe si hay usuario. El handler responde 500, no 401. */
export class AutenticacionNoDisponibleError extends Error {
  constructor() {
    super("Supabase Auth no está disponible.");
    this.name = "AutenticacionNoDisponibleError";
  }
}

const PREFIJO = "Bearer ";

export class AutenticadorSupabase implements Autenticador {
  constructor(private readonly cliente: ClienteAuth) {}

  /**
   * `null` si Auth rechaza el token (4xx: inválido, vencido o anon key sin
   * usuario). Si Auth falla o no responde, lanza `AutenticacionNoDisponibleError`:
   * pedirle al usuario que vuelva a iniciar sesión no lo arreglaría.
   */
  async usuarioDe(req: Request): Promise<UsuarioId | null> {
    const header = req.headers.get("Authorization");
    if (header === null || !header.startsWith(PREFIJO)) return null;

    let respuesta: Awaited<ReturnType<ClienteAuth["auth"]["getUser"]>>;
    try {
      respuesta = await this.cliente.auth.getUser(header.slice(PREFIJO.length));
    } catch {
      throw new AutenticacionNoDisponibleError();
    }
    const { data, error } = respuesta;
    if (error === null) return data.user?.id ?? null;
    const rechazoDelToken = error.status !== undefined && error.status >= 400 && error.status < 500;
    if (rechazoDelToken) return null;
    throw new AutenticacionNoDisponibleError();
  }
}
