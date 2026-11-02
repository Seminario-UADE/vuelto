/**
 * La ventana de compras que se sincroniza (FR-014): el período de tope en curso, o sea el más
 * temprano entre el inicio del mes y el de la semana. Es la misma regla que `comprasDelPeriodo`
 * (`data/calculo.ts`), así lo que se baja, lo que se guarda y lo que cuenta el motor coinciden.
 * La aritmética de fechas es del motor; acá no se reimplementa.
 */
import { fechaArgentina, inicioDelPeriodo } from "@vuelto/motor";

export interface Ventana {
  /** La fecha de hoy en Argentina. */
  hoy: string;
  /** Primer día del período en curso. */
  desde: string;
}

export function ventanaDeCompras(ahora: Date): Ventana {
  const hoy = fechaArgentina(ahora);
  const mes = inicioDelPeriodo("mensual", hoy);
  const semana = inicioDelPeriodo("semanal", hoy);
  return { hoy, desde: mes < semana ? mes : semana };
}
