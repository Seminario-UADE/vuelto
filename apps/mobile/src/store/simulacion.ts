import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Canal } from "@vuelto/motor";
import { sesionCerrada } from "./acciones";

/** La compra que se está evaluando en «¿Con qué pago?». No se persiste. */
export type EstadoSimulacion = {
  comercioId: string | null;
  /** Opcional: solo refina el estimado (constitución §I). */
  monto: number | null;
  /** Presencial por defecto (spec 004 FR-001). */
  canal: Canal;
};

const inicial: EstadoSimulacion = { comercioId: null, monto: null, canal: "presencial" };

export const simulacion = createSlice({
  name: "simulacion",
  initialState: inicial,
  reducers: {
    /**
     * Otro comercio borra el monto y vuelve a presencial (Inicio no muestra el canal); el mismo
     * los conserva (Inicio → Con qué pagar).
     */
    comercioElegido(s, a: PayloadAction<string | null>) {
      if (a.payload !== s.comercioId) {
        s.monto = null;
        s.canal = "presencial";
      }
      s.comercioId = a.payload;
    },
    canalCambiado(s, a: PayloadAction<Canal>) {
      s.canal = a.payload;
    },
    montoCambiado(s, a: PayloadAction<number | null>) {
      s.monto = a.payload !== null && Number.isFinite(a.payload) && a.payload > 0 ? a.payload : null;
    },
  },
  extraReducers: (b) => {
    b.addCase(sesionCerrada, () => inicial);
  },
});

export const { canalCambiado, comercioElegido, montoCambiado } = simulacion.actions;
