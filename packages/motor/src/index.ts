/**
 * Motor de reglas de Vuelto. Funciones puras, sin dependencias de runtime ni
 * acceso a red, reloj o almacenamiento (ADR-001, constitución §II).
 */
export * from "./tipos.ts";
export * from "./categorias.ts";
export * from "./publicable.ts";
export { recomendar } from "./recomendar.ts";
export { estimarTopes, formatearEstimacion } from "./estimar.ts";
export { GrupoInvalidoError, PerfilSinMediosError, type MotivoGrupoInvalido } from "./errores.ts";
/** Gasto en grupo (spec 013): la decisión y la división. */
export { MAXIMO_INTEGRANTES, recomendarGrupo } from "./grupo.ts";
export { dividir } from "./division.ts";
export { JURISDICCIONES_VALIDAS, normalizar } from "./elegibilidad.ts";
/**
 * La Edge Function y la app calculan "hoy", los períodos y los textos de fecha
 * con las mismas funciones que el motor (issues #43, #37 y #81).
 */
export {
  diaArgentina,
  diaMesSinCeros,
  diaSiguiente,
  fechaArgentina,
  finDelPeriodo,
  inicioDelPeriodo,
  nombreDelMes,
} from "./fecha.ts";
