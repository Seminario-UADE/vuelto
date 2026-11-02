/**
 * La mezcla de las compras (spec 009 FR-015): lo que dice el servidor más lo guardado en el teléfono
 * que el servidor todavía no devolvió. Núcleo funcional; la escritura y la cola de subida son de #44.
 *
 * ES LA ÚNICA COSTURA CON #44. Hoy conserva las compras locales que no son de ejemplo. Cuando la cola
 * de #44 (spec 010, `aplicarPendientes`) llegue a `main`, el cuerpo pasa a ser
 * `aplicarPendientes(servidor, cola.operaciones, usuarioId)`: la cola tiene dueño y persiste las
 * pendientes aparte. Limitaciones de este cuerpo provisorio: no distingue dueños y una compra local de
 * fuera del período no sobrevive a un reinicio (`aPersistir` filtra por período).
 */
import type { Compra } from "@vuelto/motor";
import { comprasOctubre } from "../data/fixtures";

const IDS_DE_EJEMPLO: ReadonlySet<string> = new Set(comprasOctubre.map((c) => c.id));
/** Las compras que vienen de la base tienen un UUID; las que hoy se guardan en el teléfono, `n<número>`. */
const ES_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * `servidor ∪ (compras locales que el servidor no devolvió)`, la más nueva primero. `delServidor` llega
 * de la más vieja a la más nueva (orden `creada_en`). Lo del servidor anterior a `desde` se descarta;
 * las compras de ejemplo se reemplazan por las del servidor. Una compra con UUID que ya no está en el
 * servidor vino de él (la borraron en otro dispositivo, o salió del período): no se conserva.
 */
export function reconciliarCompras(delServidor: readonly Compra[], actuales: readonly Compra[], desde: string): Compra[] {
  const enServidor = new Set(delServidor.map((c) => c.id));
  const locales = actuales.filter((c) => !IDS_DE_EJEMPLO.has(c.id) && !ES_UUID.test(c.id) && !enServidor.has(c.id));
  const remotas = delServidor.filter((c) => c.fecha >= desde).reverse();
  // Orden estable: más nueva primero; a igual fecha, las locales antes que las del servidor.
  return [...locales, ...remotas].sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0));
}
