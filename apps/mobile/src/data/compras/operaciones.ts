/**
 * La cola de operaciones sobre compras (spec 010, data-model.md): guardar o borrar una compra
 * pendiente de subir a la cuenta. Núcleo puro: sin React, sin red y sin reloj.
 */
import type { Compra } from "@vuelto/motor";

export type EstadoOperacion =
  | { tipo: "pendiente" }
  | { tipo: "enviando" }
  /** `causa` es un código corto (de Postgres o HTTP), nunca datos del usuario. */
  | { tipo: "rechazada"; causa: string }
  /** `decision`: el usuario no quiso subirla; no se reevalúa. */
  | { tipo: "bloqueada"; motivo: "medio" | "promo" | "decision" };

type OperacionBase = {
  /** Id de la operación; da el orden de creación. */
  id: string;
  /** Usuario de la sesión de Supabase al encolar; `null` si todavía no había cuenta. */
  dueno: string | null;
  /** Fecha de la compra (YYYY-MM-DD): el techo de 90 días se mide contra esta. */
  fecha: string;
  /** Instante en que se encoló (ISO, del reloj del store). */
  encoladaEn: string;
  estado: EstadoOperacion;
};

export type OperacionGuardar = OperacionBase & { tipo: "guardar"; compra: Compra };
export type OperacionBorrar = OperacionBase & { tipo: "borrar"; compraId: string };
export type Operacion = OperacionGuardar | OperacionBorrar;

export type EstadoCola = {
  /** Persistido (`vuelto.cola.v1`). */
  operaciones: Operacion[];
  /** No persistidos: */
  /** Ya se leyó lo guardado. Antes, no se escribe nada (no se pisa). */
  hidratada: boolean;
  /** Hay un vaciado en curso (exclusión mutua, FR-010). */
  vaciando: boolean;
  /** Se pidió vaciar durante un vaciado: hay que hacer otra pasada al terminar. */
  volver: boolean;
  /** Hay repositorio, sesión y mapeos: recién ahí se muestran las marcas (FR-014, FR-020). */
  subidaConectada: boolean;
};
