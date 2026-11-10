import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { PreferenciaTema } from "../lib/apariencia";

/**
 * El tema que eligió el usuario. No se borra al cerrar sesión (es del dispositivo) y se guarda
 * aparte del perfil, en `vuelto.apariencia.v1` (`hooks/use-apariencia.ts`).
 */
export type EstadoApariencia = { preferencia: PreferenciaTema };

export const aparienciaInicial: EstadoApariencia = { preferencia: "sistema" };

export const apariencia = createSlice({
  name: "apariencia",
  initialState: aparienciaInicial,
  reducers: {
    preferenciaCambiada(s, a: PayloadAction<PreferenciaTema>) {
      s.preferencia = a.payload;
    },
  },
});

export const { preferenciaCambiada } = apariencia.actions;
