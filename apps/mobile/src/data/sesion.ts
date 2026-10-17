/**
 * Estado de la sesión que simula escrituras al servidor: compras guardadas, contactos
 * aceptados o quitados y el grupo en armado. Vive en memoria y se pierde al cerrar la app
 * (spec 002, Assumptions). Las pantallas lo leen con `useSesion`.
 */
import { useSyncExternalStore } from "react";
import type { Compra, IntegranteGrupo } from "./contracts";

type Estado = {
  comprasNuevas: Compra[];
  contactosQuitados: string[];
  contactosAceptados: string[];
  grupo: { nombre: string | null; monto: number | null; integrantes: IntegranteGrupo[] } | null;
  /** Mensaje de confirmación pendiente de mostrar ("Compra guardada · …"). */
  aviso: string | null;
};

let estado: Estado = {
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

/** Solo para tests. */
export function reiniciarSesion(): void {
  setSesion({
    comprasNuevas: [],
    contactosQuitados: [],
    contactosAceptados: [],
    grupo: null,
    aviso: null,
  });
}
