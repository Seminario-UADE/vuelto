import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { usuario } from "../data/fixtures";
import { rehidratado, sesionCerrada, type EstadoPerfil } from "./acciones";

export const perfilInicial: EstadoPerfil = {
  nombre: usuario.nombre,
  onboardingCompleto: false,
  medios: [],
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

export const { mediosElegidos, comerciosElegidos, onboardingTerminado, invitacionGuardada } = perfil.actions;
