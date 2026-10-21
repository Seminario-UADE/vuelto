/**
 * Tope consumido de una promo y la base del estimado (FR-016, FR-017,
 * FR-020). Cada promo por separado y en el mes calendario: los grupos de
 * tope compartido y los períodos semanal y por compra los suma la issue #37;
 * la issue #38 reutiliza este cálculo para «Mis topes».
 */
import { aCentavos, aCentesimosDePunto, aplicarPorcentaje } from "./dinero";
import { mesDe } from "./fecha";
import type { BaseEstimacion, Compra, FechaISO, Promocion } from "./tipos";

/** Importes en centavos. `tope`, `restante` y `base` son `null` si la promo no informa tope. */
export interface EstadoDeTope {
  tope: number | null;
  consumido: number;
  restante: number | null;
  base: BaseEstimacion | null;
}

/** Agrupa una sola vez las compras por promo, para no recorrerlas por cada promo. */
export function comprasPorPromocion(compras: Compra[]): Map<string, Compra[]> {
  const porPromo = new Map<string, Compra[]>();
  for (const c of compras) {
    if (c.promocionId === null) continue;
    const lista = porPromo.get(c.promocionId);
    if (lista) lista.push(c);
    else porPromo.set(c.promocionId, [c]);
  }
  return porPromo;
}

/**
 * `hoy` es la fecha de `ahora` en hora de Argentina. Cuentan las compras con
 * esta promo, del mismo mes y no posteriores a hoy.
 */
export function estadoDeTope(promo: Promocion, compras: Compra[], hoy: FechaISO): EstadoDeTope {
  if (promo.tope.monto === null) return { tope: null, consumido: 0, restante: null, base: null };

  const tope = aCentavos(promo.tope.monto);
  const centesimos = aCentesimosDePunto(promo.porcentaje);
  const mes = mesDe(hoy);
  const delPeriodo = compras.filter(
    (c) => c.promocionId === promo.id && mesDe(c.fecha) === mes && c.fecha <= hoy,
  );

  let suma = 0;
  let sinDescuento = 0;
  for (const c of delPeriodo) {
    if (c.descuentoObtenido === null) {
      sinDescuento++;
      suma += Math.min(aplicarPorcentaje(aCentavos(c.monto), centesimos), tope);
    } else {
      suma += Math.max(aCentavos(c.descuentoObtenido), 0);
    }
  }

  const consumido = Math.min(suma, tope);
  return {
    tope,
    consumido,
    restante: tope - consumido,
    base: { comprasRegistradas: delPeriodo.length, comprasSinDescuentoInformado: sinDescuento },
  };
}
