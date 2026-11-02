/**
 * La hora de Argentina para la capa de datos y el reloj de la app. UTC−3 sin horario de
 * verano, como `packages/motor/src/fecha.ts`: el desfase está escrito solo acá en la app.
 */
const DESFASE_ARGENTINA = "-03:00";
const DESFASE_ARGENTINA_MS = -3 * 3_600_000;
const DIA_MS = 86_400_000;

/** El mediodía de una fecha en Argentina: el instante con que se evalúa una compra de ese día. */
export function mediodia(fecha: string): Date {
  return new Date(`${fecha}T12:00:00${DESFASE_ARGENTINA}`);
}

/** Cuánto falta para la próxima medianoche de Argentina (lo usa `useReloj`). */
export function msHastaLaMedianoche(ahora: Date): number {
  const enArgentina = ahora.getTime() + DESFASE_ARGENTINA_MS;
  return DIA_MS - (((enArgentina % DIA_MS) + DIA_MS) % DIA_MS);
}
