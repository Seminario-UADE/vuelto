/**
 * `aplicarPendientes` (spec 010, FR-018, contracts/aplicar-pendientes.md): mezcla lo que baja
 * del servidor con lo que todavía está en la cola del teléfono. La usa la sincronización (#42).
 */
import type { Compra } from "@vuelto/motor";
import type { Operacion } from "./operaciones";

/** Una operación vale para esta sesión si es suya o si todavía no tiene dueño. */
const esDeLaSesion = (o: Operacion, userId: string | null): boolean => o.dueno === null || o.dueno === userId;

export function aplicarPendientes(filasDelServidor: Compra[], cola: Operacion[], userId: string | null): Compra[] {
  const propias = cola.filter((o) => esDeLaSesion(o, userId));
  const borradas = new Set(propias.flatMap((o) => (o.tipo === "borrar" ? [o.compraId] : [])));
  const locales = new Map<string, Compra>();
  for (const o of propias) if (o.tipo === "guardar" && !borradas.has(o.compra.id)) locales.set(o.compra.id, o.compra);

  const delServidor = filasDelServidor.filter((c) => !borradas.has(c.id) && !locales.has(c.id));
  // La copia local gana: es la que el usuario ve y la que el servidor va a recibir.
  const todas = [...locales.values(), ...delServidor];
  // Estable: a igual fecha, queda primero lo local. La más nueva primero, como el slice.
  return todas.map((c, i) => ({ c, i })).sort((a, b) => (a.c.fecha < b.c.fecha ? 1 : a.c.fecha > b.c.fecha ? -1 : a.i - b.i)).map((x) => x.c);
}
