/**
 * Motor de reglas de Vuelto. Funciones puras, sin dependencias de runtime ni
 * acceso a red, reloj o almacenamiento (ADR-001, constitución §II).
 */
export * from "./tipos";
export * from "./categorias";
export * from "./publicable";
export { recomendar } from "./recomendar";
export { PerfilSinMediosError } from "./errores";
export { JURISDICCIONES_VALIDAS } from "./elegibilidad";
