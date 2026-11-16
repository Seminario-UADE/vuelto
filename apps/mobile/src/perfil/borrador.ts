/**
 * El borrador del onboarding (spec 012, US5, FR-031): los medios, los comercios habituales y el
 * nombre elegidos antes de tener cuenta. Funciones puras: el reloj entra por parámetro (ADR-010).
 */
import type { MedioDePago, MedioNuevo } from "./modelo";

/** Un medio elegido sin cuenta: lo del selector y el nombre del banco, para mostrarlo. */
export type MedioDelBorrador = MedioNuevo & { nombreBanco: string | null };

export type BorradorPerfil = {
  medios: MedioDelBorrador[];
  /** Los nombres de los comercios habituales, como los guarda `comercios_habituales`. */
  comercios: string[];
  nombre: string | null;
  /** ISO: cuándo se empezó. Pasados `BORRADOR_DIAS` días se descarta (FR-031). */
  creadoEn: string;
};

export const BORRADOR_DIAS = 30;

const MS_POR_DIA = 24 * 60 * 60 * 1000;

/** Más de 30 días desde que se empezó, o una fecha que no se puede leer. */
export function borradorVencido(b: BorradorPerfil, ahora: Date): boolean {
  const desde = Date.parse(b.creadoEn);
  return Number.isNaN(desde) || ahora.getTime() - desde > BORRADOR_DIAS * MS_POR_DIA;
}

/** No queda nada por guardar: se puede descartar. */
export function borradorVacio(b: BorradorPerfil): boolean {
  return b.medios.length === 0 && b.comercios.length === 0 && b.nombre === null;
}

/**
 * Los medios del borrador con la forma de los guardados, para que el motor responda la primera
 * recomendación sin cuenta (US5). Los ids son locales: nunca llegan a Supabase.
 */
export function mediosDelBorrador(b: BorradorPerfil | null): MedioDePago[] {
  return (b?.medios ?? []).map((m, i) => ({ ...m, id: `borrador-${i}` }));
}
