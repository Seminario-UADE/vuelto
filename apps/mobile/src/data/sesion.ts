/**
 * Estado de la sesión: quién está autenticado (`usuario`, la fuente de verdad que leen las
 * pantallas y los layouts; lo escribe `data/auth.ts` desde Supabase Auth) y las escrituras
 * que simula al servidor: compras guardadas, contactos aceptados o quitados y el grupo en
 * armado. Estas viven en memoria y se pierden al cerrar la app (spec 006, Assumptions).
 * Las pantallas lo leen con `useSesion`.
 *
 * Con el store de Redux (#81), `usuario` y `authLista` pasan tal cual al slice `sesion`.
 */
import { useSyncExternalStore } from "react";
import type { Cuenta } from "../lib/auth";
import type { Compra, PedidoGrupo } from "./contracts";

type Estado = {
  /** Usuario autenticado, o `null` sin sesión. Solo `data/auth.ts` lo cambia (`setUsuario`). */
  usuario: Cuenta | null;
  /** Falso hasta que se leyó la sesión guardada en el dispositivo: antes no se sabe si hay usuario. */
  authLista: boolean;
  comprasNuevas: Compra[];
  contactosQuitados: string[];
  contactosAceptados: string[];
  grupo: PedidoGrupo | null;
  /** Mensaje de confirmación pendiente de mostrar ("Compra guardada · …"). */
  aviso: string | null;
};

let estado: Estado = {
  usuario: null,
  authLista: false,
  comprasNuevas: [],
  contactosQuitados: [],
  contactosAceptados: [],
  grupo: null,
  aviso: null,
};

const oyentes = new Set<() => void>();

export function getSesion(): Estado {
  return estado;
}

export function setSesion(cambio: Partial<Estado>): void {
  estado = { ...estado, ...cambio };
  oyentes.forEach((o) => o());
}

export function setUsuario(usuario: Cuenta | null): void {
  setSesion({ usuario, authLista: true });
}

function suscribir(oyente: () => void): () => void {
  oyentes.add(oyente);
  return () => oyentes.delete(oyente);
}

export function useSesion<T>(selector: (e: Estado) => T): T {
  return useSyncExternalStore(
    suscribir,
    () => selector(estado),
    () => selector(estado),
  );
}

/** Vacía las escrituras simuladas. No toca `usuario`: eso es de `setUsuario`. */
export function reiniciarSesion(): void {
  setSesion({
    comprasNuevas: [],
    contactosQuitados: [],
    contactosAceptados: [],
    grupo: null,
    aviso: null,
  });
}
