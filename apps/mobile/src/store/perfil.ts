import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { usuario } from "../data/fixtures";
import { borradorVacio, type MedioDelBorrador } from "../perfil/borrador";
import { escenarioElegido, rehidratado, sesionCerrada, type ComercioHabitual, type EstadoPerfil, type MedioGuardado } from "./acciones";

/**
 * Cómo quedó la última lectura de los medios en Supabase (issue #41). No se persiste: al abrir la
 * app arranca en `sin-leer`. Con `sin-conexion` el perfil se muestra como estaba y no se edita
 * (FR-010, FR-012). `servidor-desactualizado`: la base alojada no tiene una migración que la app
 * necesita (issue #127); se comporta como `sin-conexion`, pero el aviso lo dice.
 */
export type CargaPerfil = "sin-leer" | "leyendo" | "lista" | "sin-conexion" | "servidor-desactualizado" | "error";

export type EstadoPerfilSlice = EstadoPerfil & { carga: CargaPerfil };

export const perfilInicial: EstadoPerfilSlice = {
  // Nadie se llama como la demo por defecto (FR-029): el nombre lo carga el usuario.
  nombre: null,
  onboardingCompleto: false,
  medios: [],
  comercios: [],
  invitacionPendiente: null,
  borrador: null,
  carga: "sin-leer",
};

/** Qué parte del borrador ya quedó en la cuenta (o se descartó porque la cuenta ya tenía). */
export type ParteDelBorrador = "medios" | "comercios" | "nombre";

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
    /** Lo que hay en Supabase (o lo que confirmó el onboarding) reemplaza lo local (issue #47). */
    comerciosLeidos(s, a: PayloadAction<ComercioHabitual[]>) {
      s.comercios = a.payload;
    },
    /** Los del onboarding: se suman a los que ya estaban. */
    comerciosConfirmados(s, a: PayloadAction<ComercioHabitual[]>) {
      s.comercios.push(...a.payload);
    },
    comercioAgregado(s, a: PayloadAction<ComercioHabitual>) {
      s.comercios.push(a.payload);
    },
    comercioSacado(s, a: PayloadAction<string>) {
      s.comercios = s.comercios.filter((c) => c.id !== a.payload);
    },
    onboardingTerminado(s) {
      s.onboardingCompleto = true;
    },
    /** El de la cuenta, leído o recién guardado. `null` = la cuenta no tiene (FR-029). */
    nombreCambiado(s, a: PayloadAction<string | null>) {
      s.nombre = a.payload;
    },
    invitacionGuardada(s, a: PayloadAction<string | null>) {
      s.invitacionPendiente = a.payload;
    },
    /**
     * Los medios elegidos sin cuenta (US5): reemplazan los del borrador. `ahora` es el reloj del
     * store; marca el comienzo del borrador si recién empieza (FR-031).
     */
    borradorMedios(s, a: PayloadAction<{ medios: MedioDelBorrador[]; ahora: string }>) {
      s.borrador ??= { medios: [], comercios: [], nombre: null, creadoEn: a.payload.ahora };
      s.borrador.medios = a.payload.medios;
    },
    borradorComercios(s, a: PayloadAction<{ comercios: string[]; ahora: string }>) {
      s.borrador ??= { medios: [], comercios: [], nombre: null, creadoEn: a.payload.ahora };
      s.borrador.comercios = a.payload.comercios;
    },
    /** El nombre del registro, cuando la cuenta todavía no tiene sesión (confirmar el email, FR-033). */
    borradorNombre(s, a: PayloadAction<{ nombre: string; ahora: string }>) {
      s.borrador ??= { medios: [], comercios: [], nombre: null, creadoEn: a.payload.ahora };
      s.borrador.nombre = a.payload.nombre;
    },
    /** Esa parte ya está en la cuenta: sale del borrador, y sin nada más el borrador se borra. */
    borradorParteGuardada(s, a: PayloadAction<ParteDelBorrador>) {
      if (!s.borrador) return;
      if (a.payload === "medios") s.borrador.medios = [];
      else if (a.payload === "comercios") s.borrador.comercios = [];
      else s.borrador.nombre = null;
      if (borradorVacio(s.borrador)) s.borrador = null;
    },
  },
  extraReducers: (b) => {
    b.addCase(rehidratado, (s, a) => (a.payload.perfil ? { ...a.payload.perfil, carga: s.carga } : s));
    b.addCase(sesionCerrada, () => perfilInicial);
    // La demo (solo desarrollo) carga «Martín» a propósito, sin pisar un nombre que el usuario cargó.
    b.addCase(escenarioElegido, (s) => {
      s.nombre ??= usuario.nombre;
    });
  },
});

export const {
  mediosLeidos,
  mediosConfirmados,
  medioAgregado,
  medioSacado,
  cargaCambio,
  comerciosLeidos,
  comerciosConfirmados,
  comercioAgregado,
  comercioSacado,
  onboardingTerminado,
  nombreCambiado,
  invitacionGuardada,
  borradorMedios,
  borradorComercios,
  borradorNombre,
  borradorParteGuardada,
} = perfil.actions;
