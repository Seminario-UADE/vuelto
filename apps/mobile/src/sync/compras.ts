/**
 * La mezcla de las compras (spec 009 FR-015): lo que dice el servidor más lo que la cola de #44
 * (spec 010) todavía no subió. Núcleo funcional: la mezcla es `aplicarPendientes`.
 *
 * Lo local sale de la cola y no de `compras.lista`: toda compra guardada en el teléfono deja una
 * operación en la cola (con dueño), así que una compra que el servidor no devolvió y no está en la
 * cola vino de él (la borraron en otro dispositivo, o salió del período) y no se conserva. Las
 * compras de ejemplo nunca entran a la cola: se reemplazan por las del servidor.
 */
import type { Compra } from "@vuelto/motor";
import { aplicarPendientes } from "../data/compras/pendientes";
import type { Operacion } from "../data/compras/operaciones";

/**
 * `servidor ∪ pendientes de la cola`, la más nueva primero. `delServidor` llega de la más vieja a la
 * más nueva (orden `creada_en`). Lo del servidor anterior a `desde` se descarta; lo pendiente se
 * conserva aunque sea de antes (todavía no está en la cuenta).
 */
export function reconciliarCompras(
  delServidor: readonly Compra[],
  cola: readonly Operacion[],
  usuarioId: string | null,
  desde: string,
): Compra[] {
  const remotas = delServidor.filter((c) => c.fecha >= desde).reverse();
  return aplicarPendientes(remotas, [...cola], usuarioId);
}
