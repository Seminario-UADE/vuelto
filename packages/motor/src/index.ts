/**
 * Motor de reglas de Vuelto. Funciones puras, sin dependencias de runtime ni
 * acceso a red, reloj o almacenamiento (ADR-001, constitución §II).
 */
export * from "./tipos.ts";
export * from "./categorias.ts";
export * from "./publicable.ts";
export { recomendar } from "./recomendar.ts";
export { estimarTopes, formatearEstimacion } from "./estimar.ts";
export { PerfilSinMediosError } from "./errores.ts";
export { JURISDICCIONES_VALIDAS } from "./elegibilidad.ts";
