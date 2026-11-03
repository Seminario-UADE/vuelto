import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { usuario } from "../data/fixtures";
import { rehidratado, sesionCerrada, type EstadoPerfil, type MedioGuardado } from "./acciones";

/**
 * Cómo quedó la última lectura de los medios en Supabase (issue #41). No se persiste: al abrir la
 * app arranca en `sin-leer`. Con `sin-conexion` el perfil se muestra como estaba y no se edita
 * (FR-010, FR-012).
 */
export type CargaPerfil = "sin-leer" | "leyendo" | "lista" | "sin-conexion" | "error";

export type EstadoPerfilSlice = EstadoPerfil & { carga: CargaPerfil };

export const perfilInicial: EstadoPerfilSlice = {
  nombre: usuario.nombre,
  onboardingCompleto: false,
  medios: [],
  comercios: [],
  invitacionPendiente: null,
  carga: "sin-leer",
};

export const perfil = createSlice({
  name: "perfil",
  initialState: perfilInicial,
  reducers: {
    /** Lo que hay en Supabase reemplaza lo local. Con medios, el onboarding ya se hizo (otro dispositivo). */
    mediosLeidos(s, a: PayloadAction<MedioGuardado[]>) {
      s.medios = a.payload;
      s.carga = "lista";
      if (a.payload.length > 0) s.onboardingCompleto = true;
    },
    /** El onboarding confirmó sus medios (FR-011): todavía faltan los pasos siguientes. */
    mediosConfirmados(s, a: PayloadAction<MedioGuardado[]>) {
      s.medios = a.payload;
    },
    medioAgregado(s, a: PayloadAction<MedioGuardado>) {
      s.medios.push(a.payload);
    },
    medioSacado(s, a: PayloadAction<string>) {
      s.medios = s.medios.filter((m) => m.id !== a.payload);
    },
    cargaCambio(s, a: PayloadAction<CargaPerfil>) {
      s.carga = a.payload;
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
    b.addCase(rehidratado, (s, a) => (a.payload.perfil ? { ...a.payload.perfil, carga: s.carga } : s));
    b.addCase(sesionCerrada, () => perfilInicial);
  },
});

export const {
  mediosLeidos,
  mediosConfirmados,
  medioAgregado,
  medioSacado,
  cargaCambio,
  comerciosElegidos,
  onboardingTerminado,
  invitacionGuardada,
} = perfil.actions;
