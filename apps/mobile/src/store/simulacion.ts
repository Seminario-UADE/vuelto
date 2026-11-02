import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { sesionCerrada } from "./acciones";

/** La compra que se está evaluando en «¿Con qué pago?». No se persiste. */
export type EstadoSimulacion = {
  comercioId: string | null;
  /** Opcional: solo refina el estimado (constitución §I). */
  monto: number | null;
};

const inicial: EstadoSimulacion = { comercioId: null, monto: null };

export const simulacion = createSlice({
  name: "simulacion",
  initialState: inicial,
  reducers: {
    /** Otro comercio borra el monto; el mismo lo conserva (Inicio → Con qué pagar). */
    comercioElegido(s, a: PayloadAction<string | null>) {
      if (a.payload !== s.comercioId) s.monto = null;
      s.comercioId = a.payload;
    },
    montoCambiado(s, a: PayloadAction<number | null>) {
      s.monto = a.payload !== null && Number.isFinite(a.payload) && a.payload > 0 ? a.payload : null;
    },
  },
  extraReducers: (b) => {
    b.addCase(sesionCerrada, () => inicial);
  },
});

export const { comercioElegido, montoCambiado } = simulacion.actions;
