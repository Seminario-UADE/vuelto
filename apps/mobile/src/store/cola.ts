/**
 * La cola de operaciones sobre compras (spec 010, FR-008 a FR-016): un slice aparte de
 * `compras`, con su propia clave de almacenamiento. Se escribe **antes** que `compras`
 * (research R2), así nunca queda una compra nueva sin su operación.
 */
import { createSlice, type ListenerMiddlewareInstance, type PayloadAction } from "@reduxjs/toolkit";
import type { Compra } from "@vuelto/motor";
import {
  adoptar,
  aplicarResultado,
  bloquear,
  compactar,
  declinar,
  encolarBorrado,
  encolarGuardado,
  enviandoAPendiente,
  marcarEnviando,
  reintentar,
  type EstadoCola,
  type Operacion,
} from "../data/compras/operaciones";
import type { ResultadoEnvio } from "../data/compras/repositorio";
import { sesionCerrada } from "./acciones";
import type { RootState } from "./index";
import type { Almacenamiento } from "./persistencia";

export const CLAVE_COLA = "vuelto.cola.v1";

export const colaInicial: EstadoCola = {
  operaciones: [],
  hidratada: false,
  vaciando: false,
  volver: false,
  subidaConectada: false,
  intentos: {},
};

export const cola = createSlice({
  name: "cola",
  initialState: colaInicial,
  reducers: {
    /** Lo leído del dispositivo; se mezcla por id por si ya se encoló algo antes de leer. */
    colaCargada(s, a: PayloadAction<Operacion[]>) {
      const nuevas = s.operaciones.filter((o) => !a.payload.some((p) => p.id === o.id));
      s.operaciones = [...a.payload, ...nuevas];
      s.hidratada = true;
    },
    /** Lo que dejó la reconciliación de compras y cola al abrir la app. */
    colaReconciliada(s, a: PayloadAction<Operacion[]>) {
      s.operaciones = a.payload;
    },
    guardadoEncolado(
      s,
      a: PayloadAction<{ idOp: string; compra: Compra; dueno: string | null; ahora: string; intento: string | null }>,
    ) {
      s.operaciones = encolarGuardado(s.operaciones, a.payload);
      if (a.payload.intento !== null) s.intentos[a.payload.intento] = a.payload.compra.id;
    },
    borradoEncolado(
      s,
      a: PayloadAction<{ idOp: string; compraId: string; fecha: string; dueno: string | null; ahora: string }>,
    ) {
      s.operaciones = encolarBorrado(s.operaciones, a.payload);
    },
    /** Anula los guardados que nunca llegaron al servidor con su borrado (FR-011). */
    colaCompactada(s) {
      s.operaciones = compactar(s.operaciones);
    },
    operacionEnviando(s, a: PayloadAction<string>) {
      s.operaciones = marcarEnviando(s.operaciones, a.payload);
    },
    envioResuelto(s, a: PayloadAction<{ id: string; resultado: ResultadoEnvio }>) {
      s.operaciones = aplicarResultado(s.operaciones, a.payload.id, a.payload.resultado);
    },
    operacionBloqueada(s, a: PayloadAction<{ id: string; motivo: "medio" | "promo" | "decision" }>) {
      s.operaciones = bloquear(s.operaciones, a.payload.id, a.payload.motivo);
    },
    operacionReintentada(s, a: PayloadAction<string>) {
      s.operaciones = reintentar(s.operaciones, a.payload);
    },
    operacionesAdoptadas(s, a: PayloadAction<string>) {
      s.operaciones = adoptar(s.operaciones, a.payload);
    },
    operacionesDeclinadas(s) {
      s.operaciones = declinar(s.operaciones);
    },
    operacionesDescartadas(s, a: PayloadAction<Operacion[]>) {
      s.operaciones = a.payload;
    },
    vaciadoIniciado(s) {
      s.vaciando = true;
      s.volver = false;
    },
    vaciadoPedido(s) {
      s.volver = true;
    },
    vaciadoTerminado(s) {
      s.vaciando = false;
    },
    subidaConectada(s, a: PayloadAction<boolean>) {
      s.subidaConectada = a.payload;
    },
  },
  extraReducers: (b) => {
    // Cerrar sesión vacía la cola con el resto (FR-016); el aviso previo lo da la pantalla.
    b.addCase(sesionCerrada, (s) => ({ ...colaInicial, hidratada: s.hidratada, subidaConectada: s.subidaConectada }));
  },
});

export const {
  colaCargada,
  colaReconciliada,
  guardadoEncolado,
  borradoEncolado,
  colaCompactada,
  operacionEnviando,
  envioResuelto,
  operacionBloqueada,
  operacionReintentada,
  operacionesAdoptadas,
  operacionesDeclinadas,
  operacionesDescartadas,
  vaciadoIniciado,
  vaciadoPedido,
  vaciadoTerminado,
  subidaConectada,
} = cola.actions;

// ─── Persistencia ──────────────────────────────────────────────────────────────

type Desconocido = Record<string, unknown>;
const esObjeto = (x: unknown): x is Desconocido => typeof x === "object" && x !== null && !Array.isArray(x);
const esTexto = (x: unknown): x is string => typeof x === "string";

function estadoValido(x: unknown): boolean {
  if (!esObjeto(x)) return false;
  switch (x.tipo) {
    case "pendiente":
    case "enviando":
      return true;
    case "rechazada":
      return esTexto(x.causa);
    case "bloqueada":
      return x.motivo === "medio" || x.motivo === "promo" || x.motivo === "decision";
    default:
      return false;
  }
}

function operacionValida(x: unknown): x is Operacion {
  if (!esObjeto(x)) return false;
  const base =
    esTexto(x.id) &&
    (x.dueno === null || esTexto(x.dueno)) &&
    esTexto(x.fecha) &&
    esTexto(x.encoladaEn) &&
    estadoValido(x.estado);
  if (!base) return false;
  if (x.tipo === "guardar") return esObjeto(x.compra) && esTexto(x.compra.id) && typeof x.compra.monto === "number";
  return x.tipo === "borrar" && esTexto(x.compraId);
}

/** Lee la cola guardada. Una cola inválida se descarta entera; un envío interrumpido vuelve a pendiente. */
export function leerCola(raw: string | null): Operacion[] | null {
  if (raw === null) return null;
  let x: unknown;
  try {
    x = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!esObjeto(x) || x.version !== 1 || !Array.isArray(x.operaciones)) return null;
  if (!x.operaciones.every(operacionValida)) return null;
  return enviandoAPendiente(x.operaciones as Operacion[]);
}

/**
 * Escribe la cola cada vez que cambia, una vez leída. Se registra **antes** que el listener
 * de `persistencia.ts`: el `setItem` de la cola sale primero que el de `compras` (R2).
 */
export function escucharPersistenciaCola(listener: ListenerMiddlewareInstance<RootState>, almacenamiento: Almacenamiento) {
  listener.startListening({
    predicate: (_accion, actual, previo) =>
      actual.cola.hidratada &&
      (actual.cola.operaciones !== previo.cola.operaciones || !previo.cola.hidratada),
    effect: async (_accion, api) => {
      try {
        await almacenamiento.setItem(
          CLAVE_COLA,
          JSON.stringify({ version: 1, operaciones: api.getState().cola.operaciones }),
        );
      } catch {
        // Almacenamiento lleno o no disponible: se pierde solo lo que no se pudo guardar.
      }
    },
  });
}
