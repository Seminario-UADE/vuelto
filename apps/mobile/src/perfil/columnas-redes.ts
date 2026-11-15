/**
 * Cuántas columnas tiene la grilla de redes de la tarjeta (issue #128). Función pura: se testea sola.
 * Las 9 redes entran en 3 × 3 cuando el nombre más largo de una sola palabra («Mastercard») cabe en
 * un cuadrado. Si no cabe, baja a 2 columnas y, con letra muy grande, a 1 (una fila por red): así
 * ninguna red se corta ni se parte a media palabra.
 */

/** Hueco entre cuadrados: es `space.sm` del tema. */
export const HUECO_REDES = 8;
/** Margen interno horizontal de cada cuadrado, a cada lado. */
export const MARGEN_CUADRADO_REDES = 8;
/** Ancho de «Mastercard» en `label` (13 pt) con letra del sistema normal, con un poco de aire. */
const ANCHO_PALABRA_LARGA = 80;

/** Ancho de cada cuadrado para `columnas` columnas en un contenedor de `ancho`. */
export function anchoColumnaRedes(ancho: number, columnas: number): number {
  return Math.max(0, Math.floor((ancho - HUECO_REDES * (columnas - 1)) / columnas));
}

/** 3, 2 o 1 columnas, según el ancho disponible y la escala de letra del sistema (`fontScale`). */
export function columnasRedes(ancho: number, fontScale: number): 1 | 2 | 3 {
  const necesario = ANCHO_PALABRA_LARGA * Math.max(1, fontScale);
  for (const columnas of [3, 2] as const) {
    if (anchoColumnaRedes(ancho, columnas) - MARGEN_CUADRADO_REDES * 2 >= necesario) return columnas;
  }
  return 1;
}
