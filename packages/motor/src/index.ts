/**
 * Motor de reglas de Vuelto. Funciones puras, sin dependencias de runtime ni
 * acceso a red, reloj o almacenamiento (ADR-001, constitución §II).
 */
export * from "./tipos.ts";
export * from "./categorias.ts";
export * from "./publicable.ts";
export { recomendar } from "./recomendar.ts";
export { PerfilSinMediosError } from "./errores.ts";
export { JURISDICCIONES_VALIDAS } from "./elegibilidad.ts";
/** La Edge Function calcula "hoy" y el mes con la misma conversión que el motor (issue #43). */
export { fechaArgentina } from "./fecha.ts";
