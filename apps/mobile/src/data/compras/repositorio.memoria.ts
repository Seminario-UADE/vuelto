/**
 * El repositorio de compras en memoria (ADR-009): lo usan los tests de la cola y la demo sin
 * cuenta. Un guion decide qué responde en cada llamada, para probar los fallos del servidor.
 */
import type { FilaCompra } from "./fila";
import type { OpcionesEnvio, RepositorioCompras, ResultadoEnvio } from "./repositorio";

export type Llamada = { tipo: "guardar" | "borrar"; id: string; n: number };

export type Respuesta =
  | "ok"
  | "transitorio"
  | { rechazada: string }
  /** El servidor la guarda pero la respuesta se pierde: la app cree que falló. */
  | "llega-sin-respuesta"
  /** No contesta nunca: solo el aborto por plazo lo corta. */
  | "colgar";

export type Guion = (llamada: Llamada) => Respuesta;

export type RepositorioDeMemoria = RepositorioCompras & {
  /** Lo que el servidor tiene, por id (una sola fila por compra). */
  filas: Map<string, FilaCompra>;
  llamadas: Llamada[];
};

export function repositorioDeMemoria(guion: Guion = () => "ok"): RepositorioDeMemoria {
  const filas = new Map<string, FilaCompra>();
  const llamadas: Llamada[] = [];

  async function responder(
    tipo: Llamada["tipo"],
    id: string,
    { signal }: OpcionesEnvio,
    aplicar: () => void,
  ): Promise<ResultadoEnvio> {
    const llamada: Llamada = { tipo, id, n: llamadas.length + 1 };
    llamadas.push(llamada);
    const r = guion(llamada);
    if (r === "ok") {
      aplicar();
      return { tipo: "exito" };
    }
    if (r === "llega-sin-respuesta") {
      aplicar();
      return { tipo: "transitorio" };
    }
    if (r === "colgar") {
      await new Promise<void>((resolver) => signal.addEventListener("abort", () => resolver(), { once: true }));
      return { tipo: "transitorio" };
    }
    if (r === "transitorio") return { tipo: "transitorio" };
    return { tipo: "rechazada", causa: r.rechazada };
  }

  return {
    filas,
    llamadas,
    guardar: (fila, o) => responder("guardar", fila.id, o, () => void filas.set(fila.id, fila)),
    borrar: (id, o) => responder("borrar", id, o, () => void filas.delete(id)),
  };
}
