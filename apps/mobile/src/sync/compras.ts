/**
 * La mezcla de las compras (spec 009 FR-015): lo que dice el servidor, más las compras locales que
 * todavía no confirmó. Núcleo funcional; la escritura y la cola de subida son de #44.
 */
import type { Compra } from "@vuelto/motor";
import type { EstadoCompras } from "../store/acciones";

/**
 * `servidor ∪ (pendientes que el servidor no devolvió)`. `delServidor` llega de la más vieja a la
 * más nueva (orden `creada_en`); el resultado va de la más nueva a la más vieja, como el resto de
 * la app. Lo del servidor anterior a `desde` se descarta; una pendiente se conserva siempre.
 */
export function mezclarCompras(actual: EstadoCompras, delServidor: readonly Compra[], desde: string): EstadoCompras {
  const enServidor = new Set(delServidor.map((c) => c.id));
  const pendientes = actual.pendientes.filter((id) => !enServidor.has(id));
  const esPendiente = new Set(pendientes);

  const locales = actual.lista.filter((c) => esPendiente.has(c.id));
  const remotas = delServidor.filter((c) => c.fecha >= desde).reverse();

  // Orden estable: más nueva primero; a igual fecha, las locales antes que las del servidor.
  const lista = [...locales, ...remotas].sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0));
  return { ...actual, lista, pendientes };
}
