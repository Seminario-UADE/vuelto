/**
 * Repositorio de sincronización en memoria, para los tests (spec 009 FR-018). Respeta el mismo orden
 * y el mismo cursor que las consultas de `contracts/postgrest.md`, así la lógica de paginación se
 * prueba sin red.
 */
import type {
  Cursor,
  FiltroCompras,
  FiltroPromociones,
  FilaCompra,
  FilaPromocion,
  RepositorioSincronizacion,
} from "./contratos";
import { compararMarcas } from "./marcas";

function despuesDelCursor(valor: string, id: string, cursor: Cursor): boolean {
  if (cursor === null) return true;
  const c = compararMarcas(valor, cursor.valor);
  return c > 0 || (c === 0 && id > cursor.id);
}

export type TipoPedido = "usuario" | "promociones" | "ids" | "compras";

export interface RepositorioMemoria extends RepositorioSincronizacion {
  promocionesFilas: FilaPromocion[];
  comprasFilas: FilaCompra[];
  usuario: string | null;
  /** Falla el pedido número N (1 = el primero) de promociones, ids o compras. */
  falloEnPedido: number | null;
  /** No responde nunca (hasta que lo aborten): para el timeout. */
  colgado: boolean;
  /** Cada pedido que recibió, en orden. */
  pedidos: { tipo: TipoPedido; filtro?: unknown }[];
  /** Se ejecuta antes de responder un pedido de promociones: sirve para simular escrituras o cierres en el medio. */
  alPedirPromociones: (() => void) | null;
}

export function repositorioEnMemoria(
  datos: { promociones?: FilaPromocion[]; compras?: FilaCompra[]; usuario?: string | null } = {},
): RepositorioMemoria {
  let contador = 0;

  /** Simula la latencia y las fallas. */
  async function responder(signal: AbortSignal): Promise<void> {
    contador++;
    if (repo.falloEnPedido === contador) throw new Error("falla simulada");
    if (repo.colgado) {
      await new Promise<never>((_, rechazar) => {
        signal.addEventListener("abort", () => rechazar(signal.reason ?? new Error("abortado")));
      });
    }
    signal.throwIfAborted();
  }

  const repo: RepositorioMemoria = {
    promocionesFilas: datos.promociones ?? [],
    comprasFilas: datos.compras ?? [],
    usuario: datos.usuario === undefined ? "usuario-1" : datos.usuario,
    falloEnPedido: null,
    colgado: false,
    pedidos: [],
    alPedirPromociones: null,

    async usuarioId() {
      repo.pedidos.push({ tipo: "usuario" });
      return repo.usuario;
    },

    async promociones(f: FiltroPromociones) {
      repo.pedidos.push({ tipo: "promociones", filtro: f });
      await responder(f.signal);
      repo.alPedirPromociones?.();
      return repo.promocionesFilas
        .filter((p) => p.jurisdiccion !== "otra_provincia")
        .filter((p) => f.vigenteDesde === null || p.vigencia_hasta >= f.vigenteDesde)
        .filter((p) =>
          f.cursor !== null
            ? despuesDelCursor(p.actualizada_en, p.id, f.cursor)
            : f.desde === null || compararMarcas(p.actualizada_en, f.desde) > 0,
        )
        .sort((a, b) => compararMarcas(a.actualizada_en, b.actualizada_en) || (a.id < b.id ? -1 : 1))
        .slice(0, f.limite)
        .map((p) => ({ ...p }));
    },

    async idsDePromociones(vigenteDesde: string, signal: AbortSignal) {
      repo.pedidos.push({ tipo: "ids", filtro: vigenteDesde });
      await responder(signal);
      return repo.promocionesFilas
        .filter((p) => p.jurisdiccion !== "otra_provincia" && p.vigencia_hasta >= vigenteDesde)
        .map((p) => p.id);
    },

    async compras(f: FiltroCompras) {
      repo.pedidos.push({ tipo: "compras", filtro: f });
      await responder(f.signal);
      return repo.comprasFilas
        .filter((c) => c.fecha >= f.desde && despuesDelCursor(c.creada_en, c.id, f.cursor))
        .sort((a, b) => compararMarcas(a.creada_en, b.creada_en) || (a.id < b.id ? -1 : 1))
        .slice(0, f.limite)
        .map((c) => ({ ...c }));
    },
  };
  return repo;
}
