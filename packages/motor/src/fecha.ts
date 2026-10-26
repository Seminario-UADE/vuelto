/**
 * Fechas en hora de Argentina (UTC−3, sin horario de verano). Sin `Intl`:
 * sus datos de zona horaria dependen del runtime, y el motor corre en Deno
 * (Edge Function) y se testea en Node.
 */
import type { Dia, FechaISO, Tope } from "./tipos.ts";

/** Los períodos que acumulan consumo: "por compra" no acumula. */
export type PeriodoAcumulable = Exclude<Tope["periodo"], "por_compra" | null>;

const DESFASE_ARGENTINA_MS = -3 * 60 * 60 * 1000;
const DIAS: readonly Dia[] = ["dom", "lun", "mar", "mie", "jue", "vie", "sab"];

function enArgentina(ahora: Date): Date {
  return new Date(ahora.getTime() + DESFASE_ARGENTINA_MS);
}

export function fechaArgentina(ahora: Date): FechaISO {
  return enArgentina(ahora).toISOString().slice(0, 10);
}

export function diaArgentina(ahora: Date): Dia {
  // getUTCDay() siempre está entre 0 y 6.
  return DIAS[enArgentina(ahora).getUTCDay()]!;
}

/** `"2026-10-31"` → `"2026-10"`. */
export function mesDe(fecha: FechaISO): string {
  return fecha.slice(0, 7);
}

const DIA_MS = 24 * 60 * 60 * 1000;

/**
 * Primer día del período de tope que contiene a `hoy`: el día 1 del mes, o el
 * lunes de la semana (semanas de lunes a domingo).
 */
export function inicioDelPeriodo(periodo: PeriodoAcumulable, hoy: FechaISO): FechaISO {
  if (periodo === "mensual") return `${hoy.slice(0, 7)}-01`;
  const fecha = new Date(`${hoy}T00:00:00Z`);
  // getUTCDay(): domingo = 0, lunes = 1.
  const diasDesdeLunes = (fecha.getUTCDay() + 6) % 7;
  return new Date(fecha.getTime() - diasDesdeLunes * DIA_MS).toISOString().slice(0, 10);
}
