/**
 * El acceso de la app a la tabla `compras` de la cuenta, detrás de una interfaz (ADR-009,
 * contracts/repositorio-compras.md). Hay una versión en memoria para los tests y una sobre
 * Supabase que sigue desconectada hasta #40, #41 y #42.
 */
import type { FilaCompra } from "./fila";

export type ResultadoEnvio =
  | { tipo: "exito" }
  /** Sin red, plazo vencido, servidor caído o sesión vencida: se reintenta en el próximo disparador. */
  | { tipo: "transitorio" }
  /** El servidor la rechazó por inválida. `causa` es un código corto, nunca datos del usuario. */
  | { tipo: "rechazada"; causa: string };

export type OpcionesEnvio = { signal: AbortSignal };

export interface RepositorioCompras {
  /** Idempotente por `fila.id`: guardar dos veces la misma fila deja una sola. */
  guardar(fila: FilaCompra, opciones: OpcionesEnvio): Promise<ResultadoEnvio>;
  /** Idempotente: borrar algo que no existe es éxito. */
  borrar(id: string, opciones: OpcionesEnvio): Promise<ResultadoEnvio>;
}

/** Lo que el vaciado necesita saber de la sesión y de los mapeos de la cuenta. */
export type ContextoSubida = {
  /** Usuario de la sesión de Supabase (#40); `null` si no hay sesión: no se envía nada. */
  userId: string | null;
  /** uuid de `medios_de_pago` del usuario para un medio de la app (#41); `null` si no tiene. */
  medioRemoto(medioAppId: string): string | null;
  /** uuid de `promociones` del corpus del servidor para una promo de la app (#42); `null` si no está. */
  promoRemota(promoAppId: string): string | null;
};

/** La subida conectada: repositorio, contexto y plazo de cada envío. */
export type Subida = {
  repositorio: RepositorioCompras;
  contexto(): ContextoSubida;
  /** Plazo de cada envío; por defecto 10 s (FR-012). */
  plazoMs?: number;
};

export const PLAZO_DE_ENVIO_MS = 10_000;
