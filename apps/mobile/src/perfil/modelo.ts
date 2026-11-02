/**
 * Perfil: bancos, tarjetas y redes que declara el usuario (issue #41).
 * Funciones puras, sin React Native: se testean solas.
 * Plan: `specs/001-perfil-billeteras/plan.md`.
 */

/**
 * Los mismos valores que `Red` y `TipoTarjeta` de `@vuelto/motor` (un test lo
 * comprueba). Cuando la #81 sume el motor a la app, se reemplazan por
 * `import type` (decisión 2 del plan).
 */
export const REDES = [
  "visa",
  "master",
  "american_express",
  "dinners_club",
  "maestro",
  "cabal",
  "naranja",
  "confiable",
  "tarjeta_sol",
] as const;
export type Red = (typeof REDES)[number];

export const TIPOS_TARJETA = ["debito", "credito"] as const;
export type TipoTarjeta = (typeof TIPOS_TARJETA)[number];

/** Etiqueta visible de cada red (tabla de la spec). */
export const ETIQUETAS_RED: Record<Red, string> = {
  visa: "Visa",
  master: "Mastercard",
  american_express: "American Express",
  dinners_club: "Diners Club",
  maestro: "Maestro",
  cabal: "Cabal",
  naranja: "Naranja",
  confiable: "Confiable",
  tarjeta_sol: "Tarjeta Sol",
};

export const ETIQUETAS_TIPO: Record<TipoTarjeta, string> = {
  debito: "Débito",
  credito: "Crédito",
};

/** Banco del catálogo de MODO. */
export type Banco = {
  id: string;
  nombre: string;
  /** `null`: la base todavía no lo informa; se ordena como no priorizado (decisión 9). */
  onHubList: boolean | null;
};

/** Un medio ya guardado, con el nombre del banco que viene en el mismo pedido. */
export type MedioDePago = {
  id: string;
  bancoId: string;
  nombreBanco: string | null;
  tipo: TipoTarjeta;
  red: Red;
};

/** Lo que el selector arma antes de guardar. */
export type MedioNuevo = {
  bancoId: string;
  tipo: TipoTarjeta;
  red: Red;
};

/** La misma tripleta banco + tipo + red ya está (FR-004). */
export function esDuplicado(medios: readonly MedioNuevo[], nuevo: MedioNuevo): boolean {
  return medios.some((m) => m.bancoId === nuevo.bancoId && m.tipo === nuevo.tipo && m.red === nuevo.red);
}

/** El onboarding necesita al menos un medio completo (FR-007). */
export function puedeConfirmar(nuevos: readonly MedioNuevo[]): boolean {
  return nuevos.length >= 1;
}

/** El perfil no puede quedar vacío (FR-009). */
export function puedeSacar(medios: readonly unknown[]): boolean {
  return medios.length >= 2;
}

export type CasoDeError = "duplicado" | "banco_inexistente" | "sesion_vencida" | "sin_conexion" | "otro";

export const MENSAJES_ERROR: Record<CasoDeError, string> = {
  duplicado: "Esa tarjeta ya está en tu perfil",
  banco_inexistente: "Ese banco ya no está disponible",
  sesion_vencida: "Tu sesión venció. Volvé a entrar para seguir",
  sin_conexion: "Necesitás conexión para editar tu perfil",
  otro: "No pudimos guardar el cambio. Probá de nuevo",
};

/** Lo que importa de una respuesta fallida de Supabase. */
export type Fallo = {
  /** HTTP; 0 si el pedido no llegó. */
  status: number;
  /** Código de Postgres o de PostgREST, si vino. */
  code: string | null;
};

export function clasificarError({ status, code }: Fallo): CasoDeError {
  if (code === "23505") return "duplicado";
  if (code === "23503") return "banco_inexistente";
  if (status === 401) return "sesion_vencida";
  if (status === 0) return "sin_conexion";
  return "otro";
}
