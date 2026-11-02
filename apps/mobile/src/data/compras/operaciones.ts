/**
 * La cola de operaciones sobre compras (spec 010, data-model.md): guardar o borrar una compra
 * pendiente de subir a la cuenta. Núcleo puro: sin React, sin red y sin reloj.
 */
import type { Compra } from "@vuelto/motor";
import { esDeEjemplo, esUuid } from "./ejemplo";
import type { ResultadoEnvio } from "./repositorio";

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
  /** Hay repositorio y sesión: recién ahí se muestran las marcas (FR-014, FR-020). */
  subidaConectada: boolean;
  /** Intentos de guardado ya atendidos → id de la compra: un doble toque no duplica (FR-005). */
  intentos: Record<string, string>;
};

// ─── Funciones puras ───────────────────────────────────────────────────────────

/** Una compra más vieja que esto no deja operaciones en el teléfono (FR-019, privacidad.md). */
export const DIAS_MAXIMOS_EN_COLA = 90;

const claveDeCompra = (o: Operacion): string => (o.tipo === "guardar" ? o.compra.id : o.compraId);
const reemplazar = (ops: Operacion[], id: string, f: (o: Operacion) => Operacion | null): Operacion[] =>
  ops.flatMap((o) => {
    if (o.id !== id) return [o];
    const nueva = f(o);
    return nueva === null ? [] : [nueva];
  });
const conEstado = (o: Operacion, estado: EstadoOperacion): Operacion => ({ ...o, estado });

export function encolarGuardado(
  ops: Operacion[],
  p: { idOp: string; compra: Compra; dueno: string | null; ahora: string },
): Operacion[] {
  const op: OperacionGuardar = {
    id: p.idOp,
    tipo: "guardar",
    dueno: p.dueno,
    fecha: p.compra.fecha,
    encoladaEn: p.ahora,
    estado: { tipo: "pendiente" },
    compra: p.compra,
  };
  return [...ops, op];
}

/**
 * Borrar: agrega la operación de borrado y **no** toca el guardado. La anulación de un guardar
 * que nunca llegó al servidor con su borrado es `compactar`, un paso aparte: así, si la app se
 * cierra entre las escrituras, cola y compras quedan siempre consistentes (spec 010, R2).
 */
export function encolarBorrado(
  ops: Operacion[],
  p: { idOp: string; compraId: string; fecha: string; dueno: string | null; ahora: string },
): Operacion[] {
  if (ops.some((o) => o.tipo === "borrar" && o.compraId === p.compraId)) return ops;
  const op: OperacionBorrar = {
    id: p.idOp,
    tipo: "borrar",
    dueno: p.dueno,
    fecha: p.fecha,
    encoladaEn: p.ahora,
    estado: { tipo: "pendiente" },
    compraId: p.compraId,
  };
  return [...ops, op];
}

/**
 * Anula un guardar que nunca llegó al servidor (pendiente, rechazado o bloqueado) con el
 * borrado de la misma compra: no hace falta llamar a nadie (FR-011, SC-003). Si el guardar
 * está en envío, el borrado queda detrás: la fila puede estar llegando y hay que borrarla
 * después.
 */
export function compactar(ops: Operacion[]): Operacion[] {
  const borradas = new Set(ops.flatMap((o) => (o.tipo === "borrar" ? [o.compraId] : [])));
  const anuladas = new Set(
    ops.flatMap((o) =>
      o.tipo === "guardar" && borradas.has(o.compra.id) && o.estado.tipo !== "enviando" ? [o.compra.id] : [],
    ),
  );
  if (anuladas.size === 0) return ops;
  return ops.filter((o) => !(o.tipo === "guardar" ? anuladas.has(o.compra.id) : anuladas.has(o.compraId)));
}

export const marcarEnviando = (ops: Operacion[], id: string): Operacion[] =>
  reemplazar(ops, id, (o) => conEstado(o, { tipo: "enviando" }));

export const bloquear = (ops: Operacion[], id: string, motivo: "medio" | "promo" | "decision"): Operacion[] =>
  reemplazar(ops, id, (o) => conEstado(o, { tipo: "bloqueada", motivo }));

export const reintentar = (ops: Operacion[], id: string): Operacion[] =>
  reemplazar(ops, id, (o) => (o.estado.tipo === "rechazada" ? conEstado(o, { tipo: "pendiente" }) : o));

/** Lo que dice la tabla de FR-012: el éxito la quita, lo transitorio la reintenta, lo inválido la rechaza. */
export function aplicarResultado(ops: Operacion[], id: string, r: ResultadoEnvio): Operacion[] {
  if (r.tipo === "exito") return reemplazar(ops, id, () => null);
  const estado: EstadoOperacion = r.tipo === "transitorio" ? { tipo: "pendiente" } : { tipo: "rechazada", causa: r.causa };
  return reemplazar(ops, id, (o) => conEstado(o, estado));
}

/** Un envío no sobrevive a un cierre de la app: al leer lo guardado vuelve a pendiente. */
export const enviandoAPendiente = (ops: Operacion[]): Operacion[] =>
  ops.map((o) => (o.estado.tipo === "enviando" ? conEstado(o, { tipo: "pendiente" }) : o));

/**
 * Lo que se puede enviar ahora (FR-009): una operación por compra, la primera, y solo si es de
 * este dueño y está pendiente o bloqueada por medio o promo (pudo haber llegado el mapeo).
 * Las rechazadas, las bloqueadas por decisión y las que están en envío no traban a las demás.
 */
export function siguienteLote(ops: Operacion[], userId: string | null): Operacion[] {
  if (userId === null) return [];
  const vistas = new Set<string>();
  const lote: Operacion[] = [];
  for (const o of ops) {
    const clave = claveDeCompra(o);
    if (vistas.has(clave)) continue;
    vistas.add(clave);
    const e = o.estado;
    const elegible = e.tipo === "pendiente" || (e.tipo === "bloqueada" && e.motivo !== "decision");
    if (o.dueno === userId && elegible) lote.push(o);
  }
  return lote;
}

/** La primera cuenta del dispositivo adopta lo que se guardó sin cuenta (después de confirmar). */
export const adoptar = (ops: Operacion[], userId: string): Operacion[] =>
  ops.map((o) => (o.dueno === null && o.estado.tipo !== "bloqueada" ? { ...o, dueno: userId } : o));

/** Si no las quiere subir, quedan solo en el teléfono y no se reevalúan. */
export const declinar = (ops: Operacion[]): Operacion[] =>
  ops.map((o) => (o.dueno === null ? conEstado(o, { tipo: "bloqueada", motivo: "decision" }) : o));

function diasAtras(hoy: string, dias: number): string {
  const [a, m, d] = hoy.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(a, m - 1, d - dias)).toISOString().slice(0, 10);
}

export function descartarViejas(ops: Operacion[], hoy: string): Operacion[] {
  const desde = diasAtras(hoy, DIAS_MAXIMOS_EN_COLA);
  return ops.filter((o) => o.fecha >= desde);
}

/** Cuántas compras guardadas y cuántos borrados el servidor todavía no tiene (FR-016). */
export function contarPendientes(ops: Operacion[]): { guardados: number; borrados: number } {
  return {
    guardados: ops.filter((o) => o.tipo === "guardar").length,
    borrados: ops.filter((o) => o.tipo === "borrar").length,
  };
}

/**
 * Deja compras y cola consistentes al abrir la app (FR-013, FR-007): restaura la compra de un
 * guardar que no llegó a `compras`, saca la de un borrado que no llegó a aplicarse, y migra las
 * compras con id `nN` (anteriores a esta feature) a un UUID nuevo encolándolas una vez.
 */
export function reconciliar(
  lista: Compra[],
  ops: Operacion[],
  ctx: { generarId: () => string; dueno: string | null; ahora: string; hoy: string },
): { lista: Compra[]; operaciones: Operacion[] } {
  let operaciones = descartarViejas(ops, ctx.hoy);
  const borradas = new Set(operaciones.flatMap((o) => (o.tipo === "borrar" ? [o.compraId] : [])));
  let resultado = [...lista];
  for (const o of operaciones) {
    if (o.tipo === "guardar" && !borradas.has(o.compra.id) && !resultado.some((c) => c.id === o.compra.id)) {
      resultado.unshift(o.compra);
    }
  }
  resultado = resultado.filter((c) => !borradas.has(c.id));
  resultado = resultado.map((c) => {
    if (esUuid(c.id) || esDeEjemplo(c.id)) return c;
    const migrada = { ...c, id: ctx.generarId() };
    operaciones = encolarGuardado(operaciones, {
      idOp: ctx.generarId(),
      compra: migrada,
      dueno: ctx.dueno,
      ahora: ctx.ahora,
    });
    return migrada;
  });
  return { lista: resultado, operaciones: compactar(operaciones) };
}
