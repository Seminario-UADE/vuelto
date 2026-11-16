/**
 * El grupo en armado (spec 016): lo arma Armar y lo lee el resultado. Vive solo en memoria:
 * nunca se guarda, porque lleva los nombres de los integrantes sin cuenta, que no salen del
 * teléfono ni se persisten (D5, FR-019).
 */
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { PedidoGrupo } from "../data/contracts";
import { sesionCerrada } from "./acciones";

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
