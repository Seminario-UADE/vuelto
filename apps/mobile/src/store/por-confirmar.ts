/**
 * Las compras por confirmar (spec 012, US1, research R1): un slice aparte de `compras`, con su
 * propia clave de almacenamiento, como la cola de la spec 010. No entran a `compras` ni a
 * `selectEntradasMotor`, así que no tocan topes ni recomendaciones (FR-003). Solo viven en el
 * teléfono: no se suben a la cuenta (FR-014).
 */
import { createSelector, createSlice, type ListenerMiddlewareInstance, type PayloadAction } from "@reduxjs/toolkit";
import { estaVigente, type CompraPorConfirmar } from "../data/por-confirmar";
import { sesionCerrada } from "./acciones";
import { compraAgregada } from "./compras";
import type { AppThunk, RootState } from "./index";
import type { Almacenamiento } from "./persistencia";
import { usuarioCambio } from "./sesion";

export const CLAVE_POR_CONFIRMAR = "vuelto.por-confirmar.v1";

export type EstadoPorConfirmar = {
  lista: CompraPorConfirmar[];
  /** Ya se leyó lo guardado. Antes, no se escribe nada (no se pisa). */
  hidratada: boolean;
};

const inicial: EstadoPorConfirmar = { lista: [], hidratada: false };

export const porConfirmar = createSlice({
  name: "porConfirmar",
  initialState: inicial,
  reducers: {
    /** «Usar [medio]»: reemplaza la del mismo comercio (FR-012). Quién avisa del reemplazo es el thunk. */
    porConfirmarCreada(s, a: PayloadAction<CompraPorConfirmar>) {
      s.lista = [a.payload, ...s.lista.filter((c) => c.comercioId !== a.payload.comercioId)];
    },
    porConfirmarDescartada(s, a: PayloadAction<string>) {
      s.lista = s.lista.filter((c) => c.id !== a.payload);
    },
    /**
     * Al abrir la app: saca las vencidas, las de otro usuario (si ya se sabe quién es) y las que
     * ya están en `compras`, por si la app se cerró entre las dos escrituras (FR-011, FR-014, FR-016).
     */
    porConfirmarPurgadas(s, a: PayloadAction<{ ahora: string; usuarioId: string | null; idsConfirmados: string[] }>) {
      const { ahora, usuarioId, idsConfirmados } = a.payload;
      s.lista = s.lista.filter(
        (c) =>
          estaVigente(c, ahora) &&
          (usuarioId === null || c.usuarioId === usuarioId) &&
          !idsConfirmados.includes(c.id),
      );
    },
    /** Lo leído del dispositivo; se mezcla por id por si ya se creó alguna antes de leer. */
    rehidratadoPorConfirmar(s, a: PayloadAction<CompraPorConfirmar[]>) {
      const nuevas = s.lista.filter((c) => !a.payload.some((p) => p.id === c.id));
      const leidas = a.payload.filter((p) => !nuevas.some((c) => c.comercioId === p.comercioId));
      s.lista = [...nuevas, ...leidas];
      s.hidratada = true;
    },
  },
  extraReducers: (b) => {
    // La compra confirmada usa el mismo id: sale en la misma acción, sin estado intermedio (R4).
    b.addCase(compraAgregada, (s, a) => {
      s.lista = s.lista.filter((c) => c.id !== a.payload.id);
    });
    // Otro usuario en el mismo teléfono: las del anterior se descartan (FR-014).
    b.addCase(usuarioCambio, (s, a) => {
      if (a.payload !== null) s.lista = s.lista.filter((c) => c.usuarioId === a.payload?.id);
    });
    // Cerrar sesión las pierde; el aviso con cuántas lo da la pantalla antes (FR-014).
    b.addCase(sesionCerrada, (s) => ({ ...inicial, hidratada: s.hidratada }));
  },
});

export const { porConfirmarCreada, porConfirmarDescartada, porConfirmarPurgadas, rehidratadoPorConfirmar } =
  porConfirmar.actions;

/**
 * Las vigentes del usuario de la sesión, la más nueva primero. El filtro por vencimiento va acá
 * y no solo en la purga: una vencida nunca se ve, aunque la app siga abierta (research R2).
 */
export const selectPorConfirmarVigentes = createSelector(
  [(s: RootState) => s.porConfirmar.lista, (s: RootState) => s.sesion.ahora, (s: RootState) => s.sesion.usuario?.id ?? null],
  (lista, ahora, usuarioId): CompraPorConfirmar[] =>
    lista
      .filter((c) => c.usuarioId === usuarioId && estaVigente(c, ahora))
      .sort((a, b) => Date.parse(b.creadaEn) - Date.parse(a.creadaEn)),
);

// ─── Persistencia ──────────────────────────────────────────────────────────────

type Desconocido = Record<string, unknown>;
const esObjeto = (x: unknown): x is Desconocido => typeof x === "object" && x !== null && !Array.isArray(x);
const esTexto = (x: unknown): x is string => typeof x === "string" && x !== "";

function entradaValida(x: unknown): x is CompraPorConfirmar {
  return (
    esObjeto(x) &&
    esTexto(x.id) &&
    esTexto(x.usuarioId) &&
    esTexto(x.comercioId) &&
    esTexto(x.comercioNombre) &&
    esTexto(x.medioId) &&
    (x.monto === null || (typeof x.monto === "number" && Number.isFinite(x.monto) && x.monto > 0)) &&
    esTexto(x.creadaEn) &&
    !Number.isNaN(Date.parse(x.creadaEn))
  );
}

/** Lee la lista guardada. Una entrada inválida se descarta sola y no tira abajo las otras. */
export function leerPorConfirmar(raw: string | null): CompraPorConfirmar[] {
  if (raw === null) return [];
  let x: unknown;
  try {
    x = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!esObjeto(x) || x.version !== 1 || !Array.isArray(x.lista)) return [];
  return x.lista.filter(entradaValida);
}

/**
 * Al abrir la app, después de `rehidratar()`: lee la clave propia y purga lo vencido, lo de
 * otro usuario y lo ya confirmado (research R2). Las compras ya están cargadas a esta altura.
 */
export function iniciarPorConfirmar(): AppThunk<Promise<void>> {
  return async (dispatch, getState, { almacenamiento }) => {
    let guardadas: CompraPorConfirmar[] = [];
    try {
      guardadas = leerPorConfirmar(await almacenamiento.getItem(CLAVE_POR_CONFIRMAR));
    } catch {
      // Sin almacenamiento la app funciona en memoria.
    }
    dispatch(rehidratadoPorConfirmar(guardadas));
    const estado = getState();
    dispatch(
      porConfirmarPurgadas({
        ahora: estado.sesion.ahora,
        usuarioId: estado.sesion.usuario?.id ?? null,
        idsConfirmados: estado.compras.lista.map((c) => c.id),
      }),
    );
  };
}

/**
 * Escribe la lista cada vez que cambia, una vez leída. Se registra **después** de los
 * listeners de la cola y de `compras`: si la app se cierra entre las escrituras, al abrir la
 * compra ya está y la purga saca la por confirmar (FR-016).
 */
export function escucharPersistenciaPorConfirmar(
  listener: ListenerMiddlewareInstance<RootState>,
  almacenamiento: Almacenamiento,
) {
  listener.startListening({
    predicate: (_accion, actual, previo) =>
      actual.porConfirmar.hidratada &&
      (actual.porConfirmar.lista !== previo.porConfirmar.lista || !previo.porConfirmar.hidratada),
    effect: async (_accion, api) => {
      try {
        await almacenamiento.setItem(
          CLAVE_POR_CONFIRMAR,
          JSON.stringify({ version: 1, lista: api.getState().porConfirmar.lista }),
        );
      } catch {
        // Almacenamiento lleno o no disponible: se pierde solo lo que no se pudo guardar.
      }
    },
  });
}
