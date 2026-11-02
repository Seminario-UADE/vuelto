/**
 * Qué compra es de ejemplo y qué id es un UUID. Las de ejemplo (`comprasOctubre`) se pueden
 * borrar de la lista local, pero nunca entran a la cola ni se mandan al servidor (spec 010,
 * Edge Cases). El criterio es la pertenencia a los datos de ejemplo, no el formato del id.
 */
import { comprasOctubre } from "../fixtures";

const IDS_DE_EJEMPLO: ReadonlySet<string> = new Set(comprasOctubre.map((c) => c.id));

export function esDeEjemplo(id: string): boolean {
  return IDS_DE_EJEMPLO.has(id);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** La columna `compras.id` es `uuid`: un id que no lo es no se puede subir. */
export function esUuid(id: string): boolean {
  return UUID.test(id);
}
