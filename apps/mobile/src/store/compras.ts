import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Compra } from "@vuelto/motor";
import { comprasOctubre } from "../data/fixtures";
import { escenarioElegido, rehidratado, sesionCerrada, type EstadoCompras } from "./acciones";

/** Hasta la sincronización (#42), las compras del período arrancan con las de ejemplo. */
export const comprasIniciales: EstadoCompras = { lista: comprasOctubre };

export const compras = createSlice({
  name: "compras",
  initialState: comprasIniciales,
  reducers: {
    /** Una compra guardada: la arma el thunk `guardarCompra` con el motor (FR-008). */
    compraAgregada(s, a: PayloadAction<Compra>) {
      s.lista.unshift(a.payload);
    },
  },
  extraReducers: (b) => {
    b.addCase(rehidratado, (s, a) => a.payload.compras ?? s);
    b.addCase(sesionCerrada, () => comprasIniciales);
    b.addCase(escenarioElegido, (_s, a) => (a.payload === "mes-vacio" ? { lista: [] } : comprasIniciales));
  },
});

export const { compraAgregada } = compras.actions;
