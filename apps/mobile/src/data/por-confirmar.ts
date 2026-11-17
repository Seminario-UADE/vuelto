/**
 * La compra por confirmar (spec 012, US1): lo que deja «Usar [medio]». No es una compra: no
 * entra a `compras`, así que no toca topes ni recomendaciones (FR-003). Acá viven sus reglas
 * puras (ADR-009); el slice y la persistencia están en `store/por-confirmar.ts`.
 */
import { fechaArgentina } from "@vuelto/motor";
import { diaPermitido, type RangoDeDias } from "../ticket/fechas";
import { comercioPorNombre } from "./calculo";
import { claveDeComercio } from "./comercios";
import { sugerirComercio } from "./sugerir-comercio";
import type { BorradorCompra, Canal, Comercio, OrigenCompra } from "./contracts";

export type CompraPorConfirmar = {
  /** UUID; la compra confirmada usa el MISMO id (FR-016). */
  id: string;
  /** Dueño: las de otro usuario no se muestran y se descartan (FR-014). */
  usuarioId: string;
  /** Del catálogo; hay una por comercio (FR-012). */
  comercioId: string;
  comercioNombre: string;
  /** El medio recomendado que eligió con «Usar»; `null` si el comercio no tenía promo (issue #110). */
  medioId: string | null;
  /** El de la simulación, si lo cargó: `null` o un número finito mayor a 0. */
  monto: number | null;
  /** ISO, de `sesion.ahora` (nunca `new Date()`, ADR-010). */
  creadaEn: string;
  /** El canal con el que se recomendó (#43). Sin él (guardada antes), presencial. */
  canal?: Canal;
  /** El rubro exacto del comercio, si está en dos (#43). */
  categoriaId?: number | null;
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
export function origenAlConfirmar(
  c: CompraPorConfirmar,
  b: BorradorCompra,
  vinoDelTicket: boolean,
  catalogo: readonly Comercio[],
): OrigenCompra {
  if (vinoDelTicket) return "ticket";
  const comercio = b.comercio?.trim();
  const mismoComercio = comercio
    ? comercioPorNombre(comercio, catalogo, c.categoriaId ?? undefined).id === c.comercioId
    : false;
  return mismoComercio && b.medioId === c.medioId ? "excepcion" : "manual";
}

export type AvisoPorConfirmar = "monto-distinto" | "medio-distinto";

export type BorradorPorConfirmar = {
  borrador: BorradorCompra;
  /** El medio de la simulación, solo si el ticket no sugiere ninguno (FR-008). Sin ticket, `null`. */
  medioSugerido: string | null;
  /** Del día de la simulación a hoy: la compra no puede ser anterior (spec 014 FR-010, spec 012 FR-013). */
  diasPosibles: RangoDeDias;
  avisos: AvisoPorConfirmar[];
};

/** Lo que leyó el ticket, para cruzarlo con la compra por confirmar. `null` en lo que no trae. */
export type TicketParaConfirmar = {
  monto: number | null;
  fecha: string | null;
  /** La tarjeta que sugiere el medio leído (spec 014 FR-008); nunca se marca. */
  medioSugeridoTicket: string | null;
  textoExtraido: string | null;
};

/**
 * Lo que precarga «Revisá tu compra» desde una compra por confirmar (FR-006 a FR-009, FR-017).
 * Sin ticket («Cargar a mano»): el medio va elegido porque el usuario lo eligió al tocar «Voy a
 * pagar con…». Con ticket: manda lo del ticket (FR-009) y lo que no trae sale de la compra por
 * confirmar. El medio nunca va marcado (spec 014 FR-008): se sugiere el del ticket y, si el ticket
 * no sugiere ninguno, el de la simulación.
 */
export function borradorDesdePorConfirmar(
  c: CompraPorConfirmar,
  ticket: TicketParaConfirmar | null,
  hoy: string,
): BorradorPorConfirmar {
  const dia = diaDeLaSimulacion(c);
  const diasPosibles = { desde: dia, hoy };
  if (ticket === null) {
    return {
      borrador: {
        modo: "excepcion",
        comercio: c.comercioNombre,
        fecha: dia,
        monto: c.monto,
        medioId: c.medioId,
        textoExtraido: null,
        usarPromo: true,
        canal: c.canal ?? "presencial",
        categoriaId: c.categoriaId ?? null,
      },
      medioSugerido: null,
      diasPosibles,
      avisos: [],
    };
  }
  const avisos: AvisoPorConfirmar[] = [];
  // El aviso de monto solo si se simuló con monto (FR-009).
  if (ticket.monto !== null && c.monto !== null && ticket.monto !== c.monto) avisos.push("monto-distinto");
  if (ticket.medioSugeridoTicket !== null && ticket.medioSugeridoTicket !== c.medioId) avisos.push("medio-distinto");
  // Fuera del rango (anterior a la simulación), se propone el día de la simulación (spec 012 FR-013).
  const fecha = ticket.fecha !== null && diaPermitido(ticket.fecha, diasPosibles) ? ticket.fecha : dia;
  return {
    borrador: {
      modo: "ticket",
      comercio: c.comercioNombre,
      fecha,
      monto: ticket.monto ?? c.monto,
      medioId: null,
      textoExtraido: ticket.textoExtraido,
      usarPromo: true,
      canal: c.canal ?? "presencial",
      categoriaId: c.categoriaId ?? null,
    },
    medioSugerido: ticket.medioSugeridoTicket === null ? c.medioId : null,
    diasPosibles,
    avisos,
  };
}

/** Lo que el cruce necesita de la lectura del ticket. `null` en lo que no trae. */
export type TicketParaCruzar = { comercio: string | null; fecha: string | null; textoExtraido: string | null };

/**
 * Cómo se relaciona un ticket con una compra por confirmar (spec 012 FR-013, revisado en la
 * issue #110): `coincide` si la sugerencia de comercio de la spec 015 da primero el comercio
 * simulado; `otro_comercio` si da otro o ninguno (se pregunta); `sin_comercio` si el ticket no lo
 * trae; `anterior` si la fecha es de antes de la simulación (va como suelto, US2-6).
 */
export type CruceTicket = "coincide" | "otro_comercio" | "sin_comercio" | "anterior";

/** Una fecha `AAAA-MM-DD`: una que no se pudo leer bien no contradice nada (idea del PR #165). */
const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;

export function cruceDelTicket(c: CompraPorConfirmar, ticket: TicketParaCruzar, catalogo: readonly Comercio[]): CruceTicket {
  if (ticket.fecha !== null && FECHA_ISO.test(ticket.fecha) && ticket.fecha < diaDeLaSimulacion(c)) return "anterior";
  // Sin comercio en el ticket no se cruza: desde la compra por confirmar se sigue sin preguntar y,
  // suelto, no se busca una (FR-013), aunque el texto nombre a algún comercio.
  if (claveDeComercio(ticket.comercio ?? "") === "") return "sin_comercio";
  const r = sugerirComercio({
    nombre: ticket.comercio ?? "",
    textoTicket: ticket.textoExtraido,
    catalogo,
    categoriaConocida: c.categoriaId ?? null,
  });
  const primero =
    r.tipo === "coincide" ? r.comercio : r.tipo === "elegir_rubro" ? r.opciones[0] : r.tipo === "sugerencias" ? r.sugerencias[0]?.comercio : undefined;
  if (primero === undefined) return "otro_comercio";
  return claveDeComercio(primero.nombre) === claveDeComercio(c.comercioNombre) ? "coincide" : "otro_comercio";
}

/**
 * Escaneando suelto (spec 012 US2-9): la compra por confirmar con la que coincide el ticket, para
 * preguntar «¿Es tu compra por confirmar en X?»; si coinciden varias, la más reciente (como en el
 * PR #165); `null` si ninguna. Un ticket sin comercio no se cruza.
 */
export function porConfirmarDelTicket(
  lista: readonly CompraPorConfirmar[],
  ticket: TicketParaCruzar,
  catalogo: readonly Comercio[],
): CompraPorConfirmar | null {
  const coinciden = lista.filter((c) => cruceDelTicket(c, ticket, catalogo) === "coincide");
  return coinciden.sort((a, b) => Date.parse(b.creadaEn) - Date.parse(a.creadaEn))[0] ?? null;
}
