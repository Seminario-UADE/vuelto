import type { BorradorPromocion, Promocion } from "./tipos.ts";

/**
 * Decisión del PO (issue #33, RF-16): sin estos campos una promo no se
 * publica. La ingesta descarta el borrador, sin cola de revisión.
 */
export const CAMPOS_OBLIGATORIOS_PROMO = [
  "bancoId",
  "categoriaId",
  "porcentaje",
  "vigencia.desde",
  "vigencia.hasta",
  "tarjetas",
] as const;

export type CampoObligatorioPromo = (typeof CAMPOS_OBLIGATORIOS_PROMO)[number];

/** Campos obligatorios ausentes, para registrar por qué se descartó un borrador. */
export function camposFaltantes(borrador: BorradorPromocion): CampoObligatorioPromo[] {
  // Record: si se suma un campo a la lista, no compila hasta definir su chequeo.
  const ausente: Record<CampoObligatorioPromo, boolean> = {
    bancoId: borrador.bancoId === null,
    categoriaId: borrador.categoriaId === null,
    porcentaje: borrador.porcentaje === null,
    "vigencia.desde": borrador.vigencia.desde === null,
    "vigencia.hasta": borrador.vigencia.hasta === null,
    // Sin ninguna red en ningún tipo, la promo no le aplica a nadie.
    tarjetas:
      borrador.tarjetas === null ||
      (borrador.tarjetas.debito.length === 0 && borrador.tarjetas.credito.length === 0),
  };
  return CAMPOS_OBLIGATORIOS_PROMO.filter((campo) => ausente[campo]);
}

/** Valores que, si aparecen, son un error de lectura: la promo no se publica (issue #46). */
export const CAMPOS_INVALIDOS_PROMO = ["tope.monto"] as const;

export type CampoInvalidoPromo = (typeof CAMPOS_INVALIDOS_PROMO)[number];

/** Campos con un valor imposible, para registrar por qué se descartó un borrador. */
export function camposInvalidos(borrador: BorradorPromocion): CampoInvalidoPromo[] {
  const invalido: Record<CampoInvalidoPromo, boolean> = {
    // Una promo con tope de $0 no devuelve nada: es un error del extractor.
    "tope.monto": borrador.tope.monto !== null && borrador.tope.monto <= 0,
  };
  return CAMPOS_INVALIDOS_PROMO.filter((campo) => invalido[campo]);
}

export function esPromocionPublicable(borrador: BorradorPromocion): borrador is Promocion {
  return camposFaltantes(borrador).length === 0 && camposInvalidos(borrador).length === 0;
}
