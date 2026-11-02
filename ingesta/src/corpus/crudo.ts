/**
 * Lectura de un crudo de MODO (`supabase/seed/crudo/<slug>.json`): la tarjeta del
 * listado y el detalle de la promo, tal cual. Lo usan el mapeo, el relevamiento,
 * el borrador y la cobertura.
 */

export type Objeto = Record<string, unknown>;

export const esObjeto = (x: unknown): x is Objeto => typeof x === "object" && x !== null && !Array.isArray(x);

/** Un slug que sirve de nombre de archivo: sin barras ni puntos al principio. */
export const SLUG_SEGURO = /^[a-z0-9][a-z0-9._-]*$/i;

/** Posiciones de la fila de la tarjeta del listado: `row[0]` es el comercio y `row[5]` el banco (`name_bank`). */
export const FILA_COMERCIO = 0;
export const FILA_BANCO = 5;

/** Texto recortado de una celda de la fila de la tarjeta, o `null` si falta o está en blanco. */
export function textoDeLaFila(tarjeta: unknown, indice: number): string | null {
  if (!esObjeto(tarjeta) || !esObjeto(tarjeta.content) || !Array.isArray(tarjeta.content.row)) return null;
  const celda: unknown = tarjeta.content.row[indice];
  if (!esObjeto(celda) || typeof celda.text !== "string" || celda.text.trim() === "") return null;
  return celda.text.trim();
}

export function slugDelCrudo(crudo: { detalle: unknown }): string | null {
  return esObjeto(crudo.detalle) && typeof crudo.detalle.slug === "string" ? crudo.detalle.slug : null;
}

/** El HTML de la letra chica del detalle, o `""` si no trae. */
export function legalDelCrudo(crudo: { detalle: unknown }): string {
  return esObjeto(crudo.detalle) && typeof crudo.detalle.terms_and_conditions === "string"
    ? crudo.detalle.terms_and_conditions
    : "";
}
