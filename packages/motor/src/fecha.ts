/**
 * Fechas en hora de Argentina (UTC−3, sin horario de verano). Sin `Intl`:
 * sus datos de zona horaria dependen del runtime, y el motor corre en Deno
 * (Edge Function) y se testea en Node.
 */
import type { Dia, FechaISO } from "./tipos";

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
