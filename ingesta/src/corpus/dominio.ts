/**
 * Valores cerrados del dominio, en runtime. Reflejan los tipos de
 * `@vuelto/motor` (`Red`, `Dia`, `Jurisdiccion`, `CanalPromo`, `Tope`): un JSON
 * importado no tiene esas uniones literales, así que se comprueban acá.
 *
 * Cada lista sale de un `Record` sobre el tipo del motor: si el motor suma una
 * red, un día o un canal y acá falta, no compila (a diferencia de `satisfies`
 * sobre una lista, que solo prueba que lo que hay es válido, no que esté completo).
 */
import type { CanalPromo, Dia, Jurisdiccion, Red, Tope } from "@vuelto/motor";

const REDES_DEL_CONTRATO: Record<Red, true> = {
  visa: true,
  master: true,
  american_express: true,
  dinners_club: true,
  maestro: true,
  cabal: true,
  naranja: true,
  confiable: true,
  tarjeta_sol: true,
};
export const REDES = Object.keys(REDES_DEL_CONTRATO) as Red[];

const DIAS_DEL_CONTRATO: Record<Dia, true> = { lun: true, mar: true, mie: true, jue: true, vie: true, sab: true, dom: true };
/** En el orden de la semana. */
export const DIAS = Object.keys(DIAS_DEL_CONTRATO) as Dia[];

/** Las jurisdicciones que pueden figurar en el corpus: `otra_provincia` queda afuera (decisión 2 de la spec). */
const JURISDICCIONES_DEL_CONTRATO: Record<Exclude<Jurisdiccion, "otra_provincia">, true> = { nacional: true, pba: true, caba: true };
export const JURISDICCIONES_DEL_CORPUS = Object.keys(JURISDICCIONES_DEL_CONTRATO) as Exclude<Jurisdiccion, "otra_provincia">[];

const CANALES_DEL_CONTRATO: Record<CanalPromo, true> = { presencial: true, online: true, ambos: true };
export const CANALES = Object.keys(CANALES_DEL_CONTRATO) as CanalPromo[];

const PERIODOS_DEL_CONTRATO: Record<NonNullable<Tope["periodo"]>, true> = { mensual: true, semanal: true, por_compra: true };
export const PERIODOS = Object.keys(PERIODOS_DEL_CONTRATO) as NonNullable<Tope["periodo"]>[];

const ALCANCES_DEL_CONTRATO: Record<NonNullable<Tope["alcance"]>, true> = { compartido: true, exclusivo: true };
export const ALCANCES = Object.keys(ALCANCES_DEL_CONTRATO) as NonNullable<Tope["alcance"]>[];

/** `YYYY-MM-DD` que existe en el calendario (rechaza `2026-02-30`). */
export function esFechaISO(valor: unknown): valor is string {
  if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const fecha = new Date(`${valor}T00:00:00Z`);
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor;
}
