/**
 * Lectura de un crudo de MODO (`supabase/seed/crudo/<slug>.json`): la tarjeta del
 * listado y el detalle de la promo, tal cual. Lo usan el mapeo, el relevamiento,
 * el borrador y la cobertura.
 */

export type Objeto = Record<string, unknown>;

export const esObjeto = (x: unknown): x is Objeto => typeof x === "object" && x !== null && !Array.isArray(x);

/** Un slug que sirve de nombre de archivo: sin barras ni puntos al principio. */
export const SLUG_SEGURO = /^[a-z0-9][a-z0-9._-]*$/i;

/** Texto recortado, o `null` si no es texto o está en blanco. */
function textoLimpio(x: unknown): string | null {
  return typeof x === "string" && x.trim() !== "" ? x.trim() : null;
}

/**
 * Un rótulo de la tarjeta del listado. La tarjeta de `/v2/slots` lo trae en
 * `card.<campo>`; la del listado anterior (`/slots`, crudos previos al cambio)
 * en la fila `content.row[<fila>]`.
 */
function rotuloDeLaTarjeta(tarjeta: unknown, campo: string, fila: number): string | null {
  if (!esObjeto(tarjeta)) return null;
  if (esObjeto(tarjeta.card)) return textoLimpio(tarjeta.card[campo]);
  if (!esObjeto(tarjeta.content) || !Array.isArray(tarjeta.content.row)) return null;
  const celda: unknown = tarjeta.content.row[fila];
  return esObjeto(celda) ? textoLimpio(celda.text) : null;
}

/** El comercio que muestra la tarjeta del listado («COTO», «Farmacity»), o `null`. */
export const comercioDeLaTarjeta = (tarjeta: unknown): string | null => rotuloDeLaTarjeta(tarjeta, "validity_place", 0);

/** El banco que muestra la tarjeta del listado («ICBC», «Bancos adheridos»), o `null`. */
export const bancoDeLaTarjeta = (tarjeta: unknown): string | null => rotuloDeLaTarjeta(tarjeta, "participating_bank", 5);

export function slugDelCrudo(crudo: { detalle: unknown }): string | null {
  return esObjeto(crudo.detalle) && typeof crudo.detalle.slug === "string" ? crudo.detalle.slug : null;
}

/** El HTML de la letra chica del detalle, o `""` si no trae. */
export function legalDelCrudo(crudo: { detalle: unknown }): string {
  return esObjeto(crudo.detalle) && typeof crudo.detalle.terms_and_conditions === "string"
    ? crudo.detalle.terms_and_conditions
    : "";
}
