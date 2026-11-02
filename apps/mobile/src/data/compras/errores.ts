/**
 * `clasificarError` (spec 010, FR-012, contracts/repositorio-compras.md): qué hacer con la
 * respuesta de un envío. Lo que no se reconoce se reintenta: es mejor insistir que descartar
 * una compra del usuario por un código raro.
 */
import type { ResultadoEnvio } from "./repositorio";

export type ErrorDeEnvio = {
  /** Código de Postgres (`23514`…), si lo hay. */
  codigo?: string | null;
  /** Estado HTTP de la respuesta, si la hubo. */
  estado?: number | null;
  /** No se pudo ni conectar. */
  red?: boolean;
  /** El plazo venció y se abortó el envío. */
  aborto?: boolean;
};

const RECHAZADOS = new Set([
  "22P02", // uuid o texto inválido
  "23514", // check: monto, origen, descuento
  "23503", // medio o promo inexistentes, o de otro usuario
  "23502", // null en una columna obligatoria
  "42501", // RLS: otra cuenta
]);

export function clasificarError(error: ErrorDeEnvio | null): ResultadoEnvio {
  if (error === null) return { tipo: "exito" };
  if (error.red || error.aborto) return { tipo: "transitorio" };
  if (error.codigo && RECHAZADOS.has(error.codigo)) return { tipo: "rechazada", causa: error.codigo };
  return { tipo: "transitorio" };
}
