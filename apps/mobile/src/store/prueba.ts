/** Utilidades de los tests del store: un almacenamiento en memoria y un store recién creado. */
import { generadorDeIds } from "../data/compras/prueba";
import type { Subida } from "../data/compras/repositorio";
import type { RepositorioSincronizacion } from "../sync/contratos";
import { crearStore, type RootState } from "./index";
import type { Almacenamiento } from "./persistencia";

export function memoria(inicial: Record<string, string> = {}): Almacenamiento & { datos: Map<string, string> } {
  const datos = new Map(Object.entries(inicial));
  return {
    datos,
    getItem: async (k) => datos.get(k) ?? null,
    setItem: async (k, v) => {
      datos.set(k, v);
    },
    removeItem: async (k) => {
      datos.delete(k);
    },
  };
}

export function storeDePrueba(
  estadoInicial: Partial<RootState> | null = null,
  almacenamiento: Almacenamiento = memoria(),
  extra: {
    generarId?: () => string;
    subida?: Subida | null;
    repositorio?: RepositorioSincronizacion | null;
    reloj?: () => Date;
  } = {},
) {
  return crearStore({ almacenamiento, estadoInicial, generarId: generadorDeIds(), ...extra });
}

/** Deja correr los efectos asíncronos del listener de persistencia. */
export const esperar = () => new Promise((r) => setTimeout(r, 0));
