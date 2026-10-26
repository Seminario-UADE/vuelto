/**
 * Fechas en hora de Argentina (UTC−3, sin horario de verano). Sin `Intl`:
 * sus datos de zona horaria dependen del runtime, y el motor corre en Deno
 * (Edge Function) y se testea en Node.
 */
import type { Dia, FechaISO, PeriodoAcumulable } from "./tipos.ts";

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

function sumarDias(fecha: FechaISO, dias: number): FechaISO {
  return new Date(new Date(`${fecha}T00:00:00Z`).getTime() + dias * DIA_MS).toISOString().slice(0, 10);
}

/** Último día del período de tope que contiene a `hoy`: fin de mes, o el domingo. */
export function finDelPeriodo(periodo: PeriodoAcumulable, hoy: FechaISO): FechaISO {
  if (periodo === "semanal") return sumarDias(inicioDelPeriodo("semanal", hoy), 6);
  const [anio, mes] = hoy.split("-").map(Number);
  // Día 0 del mes siguiente = último día de este mes.
  return new Date(Date.UTC(anio ?? 0, mes ?? 0, 0)).toISOString().slice(0, 10);
}

export function diaSiguiente(fecha: FechaISO): FechaISO {
  return sumarDias(fecha, 1);
}

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
] as const;

/** `"2026-10-21"` → `"octubre"`. */
export function nombreDelMes(fecha: FechaISO): string {
  return MESES[Number(fecha.slice(5, 7)) - 1] ?? "";
}

/** `"2026-10-20"` → `"20/10"`, con ceros: el formato de los motivos de descarte. */
export function diaMesConCeros(fecha: FechaISO): string {
  return `${fecha.slice(8, 10)}/${fecha.slice(5, 7)}`;
}

/** `"2026-11-01"` → `"1/11"`, sin ceros: el formato de «vuelve el» (DESIGN.md). */
export function diaMesSinCeros(fecha: FechaISO): string {
  return `${Number(fecha.slice(8, 10))}/${Number(fecha.slice(5, 7))}`;
}
