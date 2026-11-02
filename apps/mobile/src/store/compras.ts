import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Compra } from "@vuelto/motor";
import { comprasOctubre } from "../data/fixtures";
import { escenarioElegido, rehidratado, sesionCerrada, sincronizado, type EstadoCompras } from "./acciones";

/** Hasta la sincronización (spec 009), las compras del período arrancan con las de ejemplo. */
export const comprasIniciales: EstadoCompras = { lista: comprasOctubre };

export const compras = createSlice({
  name: "compras",
  initialState: comprasIniciales,
  reducers: {
    /** Una compra guardada: la arma el thunk `guardarCompra` con el motor (FR-008). */
    compraAgregada(s, a: PayloadAction<Compra>) {
      s.lista.unshift(a.payload);
    },
    /** La lista que dejó la reconciliación con la cola al abrir la app (spec 010, FR-013). */
    comprasReconciliadas(s, a: PayloadAction<Compra[]>) {
      s.lista = a.payload;
    },
    /** Una compra borrada por el usuario: los topes se corrigen solos porque se derivan (spec 010). */
    compraEliminada(s, a: PayloadAction<string>) {
      s.lista = s.lista.filter((c) => c.id !== a.payload);
    },
  },
  extraReducers: (b) => {
    b.addCase(rehidratado, (s, a) => a.payload.compras ?? s);
    // La lista ya viene reconciliada con lo local, calculada sobre el estado de ESTE momento (spec 009 FR-015).
    b.addCase(sincronizado, (_s, a): EstadoCompras => ({ lista: a.payload.compras }));
    b.addCase(sesionCerrada, () => comprasIniciales);
    b.addCase(escenarioElegido, (_s, a) => (a.payload === "mes-vacio" ? { lista: [] } : comprasIniciales));
  },
});

export const { compraAgregada, compraEliminada, comprasReconciliadas } = compras.actions;
