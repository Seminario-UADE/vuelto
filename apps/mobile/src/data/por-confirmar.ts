/**
 * La compra por confirmar (spec 012, US1): lo que deja «Usar [medio]». No es una compra: no
 * entra a `compras`, así que no toca topes ni recomendaciones (FR-003). Acá viven sus reglas
 * puras (ADR-009); el slice y la persistencia están en `store/por-confirmar.ts`.
 */
import { fechaArgentina } from "@vuelto/motor";
import { comercioPorNombre } from "./calculo";
import type { BorradorCompra, OrigenCompra } from "./contracts";

export type CompraPorConfirmar = {
  /** UUID; la compra confirmada usa el MISMO id (FR-016). */
  id: string;
  /** Dueño: las de otro usuario no se muestran y se descartan (FR-014). */
  usuarioId: string;
  /** Del catálogo; hay una por comercio (FR-012). */
  comercioId: string;
  comercioNombre: string;
  /** El medio recomendado que eligió con «Usar». */
  medioId: string;
  /** El de la simulación, si lo cargó: `null` o un número finito mayor a 0. */
  monto: number | null;
  /** ISO, de `sesion.ahora` (nunca `new Date()`, ADR-010). */
  creadaEn: string;
};

/** Las 48 h de FR-011, en un único lugar del código. */
export const VENCIMIENTO_POR_CONFIRMAR_MS = 48 * 60 * 60 * 1000;

/** Vigente si `ahora − creadaEn < 48 h`, con el reloj del store (FR-011). */
export function estaVigente(c: CompraPorConfirmar, ahora: string): boolean {
  return Date.parse(ahora) - Date.parse(c.creadaEn) < VENCIMIENTO_POR_CONFIRMAR_MS;
}

/**
 * Cuánto hace que se creó, para la tarjeta: «recién», «hace 10 min», «hace 2 h» o «hace 1 día» (no
 * llega a más: a las 48 h vence). Una diferencia negativa (cambió la hora) cuenta como cero.
 */
export function antiguedad(c: CompraPorConfirmar, ahora: string): string {
  const ms = Math.max(0, Date.parse(ahora) - Date.parse(c.creadaEn));
  const min = Math.floor(ms / 60_000);
  if (min < 1) return "recién";
  if (min < 60) return `hace ${min} min`;
  const horas = Math.floor(min / 60);
  return horas < 24 ? `hace ${horas} h` : "hace 1 día";
}

/** El día de la simulación en hora argentina: la fecha que se propone al confirmar (FR-017). */
export function diaDeLaSimulacion(c: CompraPorConfirmar): string {
  return fechaArgentina(new Date(c.creadaEn));
}

/**
 * El origen de la compra al confirmar (FR-006, tabla de data-model.md): `ticket` si vino del
 * ticket; `excepcion` solo si el medio y el comercio finales son los de la compra por
 * confirmar; `manual` en cualquier otro caso. El comercio se compara como lo resuelve el
 * catálogo, así «coto» y «Coto» son el mismo.
 */
export function origenAlConfirmar(c: CompraPorConfirmar, b: BorradorCompra, vinoDelTicket: boolean): OrigenCompra {
  if (vinoDelTicket) return "ticket";
  const comercio = b.comercio?.trim();
  const mismoComercio = comercio ? comercioPorNombre(comercio).id === c.comercioId : false;
  return mismoComercio && b.medioId === c.medioId ? "excepcion" : "manual";
}

export type AvisoPorConfirmar = "monto-distinto" | "medio-distinto";

export type BorradorPorConfirmar = {
  borrador: BorradorCompra;
  /** El medio de la simulación, solo si el ticket no trae medio (FR-008). Sin ticket, `null`. */
  medioSugerido: string | null;
  /** `[día de la simulación]` o, si hoy es otro día, `[ese día, hoy]` (FR-017). */
  fechasPosibles: string[];
  avisos: AvisoPorConfirmar[];
};

/**
 * Lo que precarga «Revisá tu compra» desde una compra por confirmar (FR-006, FR-017). Esta es
 * la rama sin ticket («Ya pagué»): el medio va elegido porque el usuario lo eligió al tocar
 * «Usar». La rama con ticket (FR-007 a FR-009) la suma la issue #110 (spec 012, T022).
 */
export function borradorDesdePorConfirmar(c: CompraPorConfirmar, ticket: null, hoy: string): BorradorPorConfirmar {
  void ticket;
  const dia = diaDeLaSimulacion(c);
  return {
    borrador: {
      modo: "excepcion",
      comercio: c.comercioNombre,
      fecha: dia,
      monto: c.monto,
      medioId: c.medioId,
      textoExtraido: null,
      usarPromo: true,
    },
    medioSugerido: null,
    fechasPosibles: hoy === dia ? [dia] : [dia, hoy],
    avisos: [],
  };
}
