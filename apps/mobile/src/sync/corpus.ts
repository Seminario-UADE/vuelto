/**
 * La mezcla del corpus (spec 009): núcleo funcional, sin red ni reloj. Recibe lo que bajó la
 * sincronización y devuelve el corpus nuevo, o `null` si no hay nada que cambiar.
 */
import type { Promocion } from "@vuelto/motor";
import type { EstadoCorpus } from "../store/acciones";
import type { FilaPromocion } from "./contratos";
import { compararMarcas } from "./marcas";
import { aplicarBaja, filaAPromocion } from "./mapeo";

export interface OpcionesCorpus {
  /** Primer día del período en curso: lo que venció antes ya no puede tener compras del período. */
  inicioPeriodo: string;
  /** Ids de las promos del período que hoy tiene el servidor (FR-009). */
  idsDelServidor: ReadonlySet<string>;
  /** El reloj real al terminar (ISO). */
  ahora: string;
}

/** La más reciente de dos marcas (ver `compararMarcas`). */
export function masReciente(a: string | null, b: string | null): string | null {
  if (a === null) return b;
  if (b === null) return a;
  return compararMarcas(a, b) >= 0 ? a : b;
}

/**
 * `null` = no cambiar nada: la primera sincronización que devuelve cero promos no reemplaza el
 * corpus de ejemplo ni mueve la marca (FR-013).
 */
export function aplicarPromociones(
  actual: EstadoCorpus,
  filas: readonly FilaPromocion[],
  o: OpcionesCorpus,
): EstadoCorpus | null {
  const primera = actual.marca === null;
  if (primera && filas.length === 0) return null;

  const mapa = new Map<string, Promocion>(primera ? [] : actual.promociones.map((p) => [p.id, p]));
  let descartadas = 0;
  let marca = actual.marca;

  for (const f of filas) {
    marca = masReciente(marca, f.actualizada_en);
    const promo = filaAPromocion(f);
    if (promo !== null) {
      mapa.set(promo.id, promo);
      continue;
    }
    descartadas++;
    const anterior = mapa.get(f.id);
    // La baja se procesa antes de validar el resto de la fila (FR-010): la promo que había queda vencida.
    if (f.dada_de_baja_en !== null && anterior) mapa.set(f.id, aplicarBaja(anterior, f.dada_de_baja_en));
    // Una actualización inválida saca la versión anterior: más vale no recomendar que recomendar con datos viejos.
    else mapa.delete(f.id);
  }

  // La primera sincronización no reemplaza el corpus de ejemplo si ninguna fila sirvió (FR-013): no hay
  // nada mejor que ofrecer, y la marca y el reloj no se mueven.
  if (primera && mapa.size === 0) return null;

  const promociones = [...mapa.values()].filter(
    (p) => o.idsDelServidor.has(p.id) && p.vigencia.hasta >= o.inicioPeriodo,
  );

  return { promociones, marca, sincronizadoEn: o.ahora, descartadas };
}
