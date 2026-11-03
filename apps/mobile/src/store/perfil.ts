import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { MedioDePago } from "../perfil/modelo";
import { usuario } from "../data/fixtures";
import { rehidratado, sesionCerrada, type EstadoPerfil } from "./acciones";

export const perfilInicial: EstadoPerfil = {
  nombre: usuario.nombre,
  onboardingCompleto: false,
  medios: [],
  mediosGuardados: [],
  comercios: [],
  invitacionPendiente: null,
};

export const perfil = createSlice({
  name: "perfil",
  initialState: perfilInicial,
  reducers: {
    mediosElegidos(s, a: PayloadAction<string[]>) {
      s.medios = a.payload;
    },
    /** Lo que devolvió Supabase (lectura, alta o baja): reemplaza la lista entera. */
    mediosGuardadosCargados(s, a: PayloadAction<MedioDePago[]>) {
      s.mediosGuardados = a.payload;
    },
    comerciosElegidos(s, a: PayloadAction<string[]>) {
      s.comercios = a.payload;
    },
    onboardingTerminado(s) {
      s.onboardingCompleto = true;
    },
    invitacionGuardada(s, a: PayloadAction<string | null>) {
      s.invitacionPendiente = a.payload;
    },
  },
  extraReducers: (b) => {
    b.addCase(rehidratado, (s, a) => a.payload.perfil ?? s);
    b.addCase(sesionCerrada, () => perfilInicial);
  },
});

export const { mediosElegidos, mediosGuardadosCargados, comerciosElegidos, onboardingTerminado, invitacionGuardada } = perfil.actions;
