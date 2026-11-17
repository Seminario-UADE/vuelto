/**
 * La compra por confirmar (spec 012, US1): lo que deja «Usar [medio]». No es una compra: no
 * entra a `compras`, así que no toca topes ni recomendaciones (FR-003). Acá viven sus reglas
 * puras (ADR-009); el slice y la persistencia están en `store/por-confirmar.ts`.
 */
import { fechaArgentina } from "@vuelto/motor";
import { diaPermitido, type RangoDeDias } from "../ticket/fechas";
import { comercioPorNombre } from "./calculo";
import type { BorradorCompra, Canal, Comercio, OrigenCompra } from "./contracts";

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

/**
 * El nombre de un comercio para compararlo (spec 012 FR-013, R3): minúsculas, sin tildes, sin
 * puntuación y con los espacios colapsados. Los puntos y apóstrofes se sacan (así «C.I.C.S.A.» es
 * «cicsa» y «McDonald's», «mcdonalds»); el resto de la puntuación separa palabras.
 */
export function normalizarComercio(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[.'’`´]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/** Lo que el cruce necesita del ticket: el comercio y la fecha que leyó, `null` si no los trae. */
export type TicketParaCruzar = { comercio: string | null; fecha: string | null };

const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;

function comercioCoincide(c: CompraPorConfirmar, ticket: TicketParaCruzar): boolean {
  if (ticket.comercio === null) return false;
  const buscado = normalizarComercio(c.comercioNombre);
  return buscado !== "" && ` ${normalizarComercio(ticket.comercio)} `.includes(` ${buscado} `);
}

/** La fecha del ticket es anterior al día de la simulación. Sin fecha legible no hay nada que contradiga. */
function esAnteriorALaSimulacion(c: CompraPorConfirmar, ticket: TicketParaCruzar): boolean {
  return ticket.fecha !== null && FECHA_ISO.test(ticket.fecha) && ticket.fecha < diaDeLaSimulacion(c);
}

/**
 * ¿El ticket es de esta compra por confirmar? (spec 012 FR-013, R3). Sí si el nombre normalizado
 * del comercio del ticket contiene, como palabra entera, el de la compra («coto cicsa» contiene
 * «coto»; «cotolengo» no), y la fecha del ticket no es anterior al día de la simulación. Un ticket
 * sin fecha legible no se descarta por la fecha: sin dato no hay nada que contradiga.
 */
export function ticketCoincide(c: CompraPorConfirmar, ticket: TicketParaCruzar): boolean {
  return comercioCoincide(c, ticket) && !esAnteriorALaSimulacion(c, ticket);
}

/**
 * La compra por confirmar con la que coincide el ticket; si coinciden varias (un nombre contenido
 * en otro), la más reciente (R3). `null` si ninguna. Se asume que `lista` son las vigentes del usuario.
 */
export function coincidenteConTicket(
  lista: readonly CompraPorConfirmar[],
  ticket: TicketParaCruzar,
): CompraPorConfirmar | null {
  let mejor: CompraPorConfirmar | null = null;
  for (const c of lista) {
    if (!ticketCoincide(c, ticket)) continue;
    if (mejor === null || Date.parse(c.creadaEn) > Date.parse(mejor.creadaEn)) mejor = c;
  }
  return mejor;
}

/**
 * Qué hace «Escanear ticket» con la lectura (spec 012 FR-013, US2-1, US2-5, US2-9):
 * - `directo`: sigue a «Revisá» con esa compra por confirmar (`pc`), o sin ella si la de la tarjeta ya no está;
 * - `pregunta`: hay una compra que puede ser la del ticket y se le pregunta al usuario;
 * - `anterior`: es del mismo comercio pero de antes de la simulación: no se cruza, se avisa y sigue
 *   como suelto (US2-6);
 * - `suelto`: el ticket sigue sin compra por confirmar.
 */
export type CruceConTicket =
  | { tipo: "directo"; pc: CompraPorConfirmar | null }
  | { tipo: "pregunta"; pc: CompraPorConfirmar; desdeTarjeta: boolean }
  | { tipo: "anterior"; pc: CompraPorConfirmar }
  | { tipo: "suelto" };

/**
 * Decide el cruce. Desde la tarjeta (`idDeLaTarjeta`): si coincide, directo; si es del comercio pero anterior a la simulación, anterior; si no, pregunta. Desde
 * cualquier otro lado: si coincide alguna de `vigentes`, pregunta; si no, suelto. La de la tarjeta
 * se busca en `todas` (si venció con el escaneo abierto, igual se confirma).
 */
export function cruzarConTicket(
  ticket: TicketParaCruzar,
  idDeLaTarjeta: string | undefined,
  todas: readonly CompraPorConfirmar[],
  vigentes: readonly CompraPorConfirmar[],
): CruceConTicket {
  if (idDeLaTarjeta !== undefined) {
    const pc = todas.find((c) => c.id === idDeLaTarjeta) ?? null;
    if (pc === null || ticketCoincide(pc, ticket)) return { tipo: "directo", pc };
    if (comercioCoincide(pc, ticket)) return { tipo: "anterior", pc };
    return { tipo: "pregunta", pc, desdeTarjeta: true };
  }
  const candidata = coincidenteConTicket(vigentes, ticket);
  if (candidata) return { tipo: "pregunta", pc: candidata, desdeTarjeta: false };
  const anterior = vigentes.find((c) => comercioCoincide(c, ticket));
  return anterior ? { tipo: "anterior", pc: anterior } : { tipo: "suelto" };
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
