/**
 * Perfil: bancos, tarjetas y redes que declara el usuario (issue #41).
 * Funciones puras, sin React Native: se testean solas.
 * Plan: `specs/001-perfil-billeteras/plan.md`.
 */

import type { Red, TipoTarjeta } from "@vuelto/motor";

export type { Red, TipoTarjeta };

/**
 * Etiqueta visible de cada red (tabla de la spec). `Record<Red, _>` obliga a cubrir todas las
 * redes del motor: si el motor suma una, esto no compila.
 */
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

export const REDES = Object.keys(ETIQUETAS_RED) as Red[];
export const TIPOS_TARJETA = Object.keys(ETIQUETAS_TIPO) as TipoTarjeta[];

/** Para lo que llega como texto (el servicio del ticket, los parámetros de una ruta). */
export function esRed(v: unknown): v is Red {
  return typeof v === "string" && Object.hasOwn(ETIQUETAS_RED, v);
}

export function esTipoTarjeta(v: unknown): v is TipoTarjeta {
  return typeof v === "string" && Object.hasOwn(ETIQUETAS_TIPO, v);
}

/** Banco del catálogo de MODO. */
export type Banco = {
  id: string;
  nombre: string;
  /** `null`: la base todavía no lo informa; se ordena como no priorizado (decisión 9). */
  onHubList: boolean | null;
};

/**
 * Un medio ya guardado en `medios_de_pago`, con el nombre del banco que viene en el mismo pedido.
 * Es lo que guarda el slice `perfil`: el motor lo usa tal cual (id, banco, tipo y red) y las
 * pantallas arman su nombre con `medioVista`.
 */
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
export function puedeSacar(medios: readonly MedioDePago[]): boolean {
  return medios.length >= 2;
}

export type CasoDeError =
  | "duplicado"
  | "banco_inexistente"
  | "ultimo_medio"
  | "sesion_vencida"
  | "sin_conexion"
  | "servidor_desactualizado"
  | "otro";

export const MENSAJES_ERROR: Record<CasoDeError, string> = {
  duplicado: "Esa tarjeta ya está en tu perfil",
  banco_inexistente: "Ese banco ya no está disponible",
  ultimo_medio: "Necesitás al menos un medio de pago: agregá otro antes de sacar este",
  sesion_vencida: "Tu sesión venció. Volvé a entrar para seguir",
  sin_conexion: "Necesitás conexión para editar tu perfil",
  servidor_desactualizado: "El servidor no está al día con la app. Probá más tarde y, si sigue pasando, avisanos",
  otro: "No pudimos guardar el cambio. Probá de nuevo",
};

/** Lo que importa de una respuesta fallida de Supabase. */
export type Fallo = {
  /** HTTP; 0 si el pedido no llegó. */
  status: number;
  /** Código de Postgres o de PostgREST, si vino. */
  code: string | null;
};

/**
 * Códigos de «la base no tiene lo que la app le pide»: columna, tabla, función o relación
 * inexistentes (Postgres `42703`, `42P01`, `42883`; PostgREST `PGRST200`, `PGRST202`, `PGRST204`,
 * `PGRST205`). Pasa cuando un PR trajo una migración que la base alojada todavía no tiene (issue #127).
 */
const CODIGOS_SERVIDOR_DESACTUALIZADO = new Set([
  "42703",
  "42P01",
  "42883",
  "PGRST200",
  "PGRST202",
  "PGRST204",
  "PGRST205",
]);

export function clasificarError({ status, code }: Fallo): CasoDeError {
  if (code === "23505") return "duplicado";
  if (code === "23503") return "banco_inexistente";
  // El trigger de la base (VM001): FR-009 aunque la copia local esté vieja.
  if (code === "VM001") return "ultimo_medio";
  if (status === 401) return "sesion_vencida";
  if (status === 0) return "sin_conexion";
  if (code !== null && CODIGOS_SERVIDOR_DESACTUALIZADO.has(code)) return "servidor_desactualizado";
  // Permiso denegado con la sesión vigente: falta un GRANT o una política que trae una migración.
  // Es una heurística: también lo causaría un permiso mal puesto, no solo una migración pendiente.
  if (status === 403 && code === "42501") return "servidor_desactualizado";
  return "otro";
}

// ─── Nombre del usuario (spec 012, FR-027) ───

/** Máximo del nombre para mostrar, sin contar los espacios de los costados. Lo valida también la base. */
export const NOMBRE_MAXIMO = 40;

export type NombreValidado = { ok: true; nombre: string } | { ok: false; mensaje: string };

/** De 1 a `NOMBRE_MAXIMO` caracteres, sin contar los espacios de los costados. Devuelve el recortado. */
export function validarNombre(texto: string): NombreValidado {
  const nombre = texto.trim();
  if (nombre === "") return { ok: false, mensaje: "Escribí tu nombre" };
  if (nombre.length > NOMBRE_MAXIMO) return { ok: false, mensaje: `Hasta ${NOMBRE_MAXIMO} caracteres` };
  return { ok: true, nombre };
}

// ─── Comercios habituales (issue #47) ───

/** Una fila de `comercios_habituales`: solo el nombre, como lo escribió el usuario. */
export type ComercioHabitual = { id: string; nombre: string };

/** Igual que el índice único de la base: sin espacios de más y sin mayúsculas; los acentos cuentan. */
export function normalizarComercio(nombre: string): string {
  return nombre.trim().replace(/\s+/g, " ").toLowerCase();
}

/** «Coto», «coto» y « Coto » son el mismo comercio (el índice único de la base, #34). */
export function nombreRepetido(nombres: readonly string[], nombre: string): boolean {
  const n = normalizarComercio(nombre);
  return nombres.some((x) => normalizarComercio(x) === n);
}

export function comercioRepetido(comercios: readonly { nombre: string }[], nombre: string): boolean {
  return nombreRepetido(
    comercios.map((c) => c.nombre),
    nombre,
  );
}

export const MENSAJE_COMERCIO_REPETIDO = "Ese comercio ya está en tu perfil";
