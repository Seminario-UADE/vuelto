/**
 * El grupo en armado (spec 016): lo arma Armar y lo lee el resultado. Vive solo en memoria:
 * nunca se guarda, porque lleva los nombres de los integrantes sin cuenta, que no salen del
 * teléfono ni se persisten (D5, FR-019).
 */
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { PedidoGrupo } from "../data/contracts";
import { pedidoParaServidor } from "../grupo/pedido";
import { FallaGrupoError, type ResultadoGrupo } from "../grupo/repositorio";
import { sesionCerrada } from "./acciones";
import { cargarContactos } from "./contactos";
import type { AppThunk } from "./index";

export type EstadoGrupo = { pedido: PedidoGrupo | null };

const inicial: EstadoGrupo = { pedido: null };

export const grupo = createSlice({
  name: "grupo",
  initialState: inicial,
  reducers: {
    grupoArmado(s, a: PayloadAction<PedidoGrupo | null>) {
      s.pedido = a.payload;
    },
  },
  extraReducers: (b) => {
    b.addCase(sesionCerrada, () => inicial);
  },
});

export const { grupoArmado } = grupo.actions;

/**
 * Pide la recomendación del grupo armado a `recomendar-grupo` (spec 016 US3). No lanza: devuelve
 * la falla con su campo para que la pantalla elija la acción (FR-027). Si alguien ya no es
 * contacto, recarga la lista en el momento (US3-12). `null` si no hay grupo armado.
 */
export function pedirRecomendacionGrupo(): AppThunk<Promise<ResultadoGrupo | null>> {
  return async (dispatch, getState, { contactosRemoto }) => {
    const pedido = getState().grupo.pedido;
    if (!pedido) return null;
    if (!contactosRemoto) return { ok: false, falla: "servidor", campo: null };
    try {
      return { ok: true, respuesta: await contactosRemoto.recomendarGrupo(pedidoParaServidor(pedido)) };
    } catch (e) {
      const falla = e instanceof FallaGrupoError ? e.falla : "servidor";
      if (falla === "contacto-no-vinculado") void dispatch(cargarContactos());
      return { ok: false, falla, campo: e instanceof FallaGrupoError ? e.campo : null };
    }
  };
}

