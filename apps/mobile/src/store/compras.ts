import { createSlice, current, type PayloadAction } from "@reduxjs/toolkit";
import type { Compra } from "@vuelto/motor";
import { comprasOctubre } from "../data/fixtures";
import { mezclarCompras } from "../sync/compras";
import {
  compraSubida,
  escenarioElegido,
  rehidratado,
  sesionCerrada,
  sincronizado,
  type EstadoCompras,
} from "./acciones";

/** Hasta la sincronización (spec 009), las compras del período arrancan con las de ejemplo. */
export const comprasIniciales: EstadoCompras = { lista: comprasOctubre, pendientes: [], duenoId: null };

export const compras = createSlice({
  name: "compras",
  initialState: comprasIniciales,
  reducers: {
    /** Una compra guardada: la arma el thunk `guardarCompra` con el motor (FR-008). Queda pendiente hasta que #44 la suba. */
    compraAgregada(s, a: PayloadAction<Compra>) {
      s.lista.unshift(a.payload);
      s.pendientes.push(a.payload.id);
    },
  },
  extraReducers: (b) => {
    b.addCase(rehidratado, (s, a) => a.payload.compras ?? s);
    b.addCase(compraSubida, (s, a) => {
      s.pendientes = s.pendientes.filter((id) => id !== a.payload);
    });
    // El merge se hace acá, sobre el estado de este momento: una compra guardada mientras la
    // sincronización volaba no se pierde (spec 009 FR-015, US5-3).
    b.addCase(sincronizado, (s, a): EstadoCompras => {
      const actual = current(s);
      // Otra cuenta: ni las compras ni las pendientes de la anterior sobreviven (privacidad.md).
      const base: EstadoCompras =
        actual.duenoId !== null && actual.duenoId !== a.payload.usuarioId
          ? { lista: [], pendientes: [], duenoId: null }
          : actual;
      return { ...mezclarCompras(base, a.payload.compras, a.payload.desde), duenoId: a.payload.usuarioId };
    });
    b.addCase(sesionCerrada, () => comprasIniciales);
    b.addCase(escenarioElegido, (_s, a) =>
      a.payload === "mes-vacio" ? { lista: [], pendientes: [], duenoId: null } : comprasIniciales,
    );
  },
});

export const { compraAgregada } = compras.actions;
