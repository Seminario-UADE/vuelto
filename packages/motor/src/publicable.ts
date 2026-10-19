import type { BorradorPromocion, Promocion } from "./tipos";

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

export function esPromocionPublicable(borrador: BorradorPromocion): borrador is Promocion {
  return camposFaltantes(borrador).length === 0;
}
