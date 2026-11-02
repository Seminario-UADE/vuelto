import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { RELOJ_EJEMPLO } from "../data/fixtures";
import type { Cuenta } from "../lib/auth";
import { escenarioElegido, rehidratado, sesionCerrada, sincronizado, type Escenario } from "./acciones";

export type EstadoSesion = {
  /**
   * El usuario autenticado en Supabase Auth: la fuente de verdad de quién usa la app (issue #40).
   * No se persiste acá: la sesión la guarda el cliente de Supabase y `iniciarAuth` la lee al abrir.
   */
  usuario: Cuenta | null;
  /** Ya se leyó la sesión guardada. Antes, no se sabe si hay usuario y no se decide a dónde ir. */
  authLista: boolean;
  /**
   * El reloj del cálculo (ISO). Lo escribe `useReloj`; ningún selector lee el reloj del sistema
   * (spec 008 FR-005, FR-006). No se persiste.
   */
  ahora: string;
  /** Confirmación pendiente de mostrar ("Compra guardada · …"). */
  aviso: string | null;
  escenario: Escenario;
  /** Ya se leyó lo guardado en el dispositivo. Antes, no se escribe nada (no se pisa). */
  hidratado: boolean;
  /**
   * Sube con cada cierre de sesión. Una sincronización en vuelo compara la época con la que tenía
   * al empezar y descarta su resultado si cambió (spec 009 R3). No se persiste.
   */
  epoca: number;
};

export const sesionInicial: EstadoSesion = {
  usuario: null,
  authLista: false,
  ahora: new Date(RELOJ_EJEMPLO).toISOString(),
  aviso: null,
  escenario: "normal",
  hidratado: false,
  epoca: 0,
};

export const sesion = createSlice({
  name: "sesion",
  initialState: sesionInicial,
  reducers: {
    ahoraCambio(s, a: PayloadAction<string>) {
      s.ahora = a.payload;
    },
    usuarioCambio(s, a: PayloadAction<Cuenta | null>) {
      s.usuario = a.payload;
      s.authLista = true;
    },
    avisoMostrado(s, a: PayloadAction<string | null>) {
      s.aviso = a.payload;
    },
  },
  extraReducers: (b) => {
    b.addCase(rehidratado, (s, a) => {
      // Con un corpus ya sincronizado el reloj es el real desde este mismo tick (spec 009 FR-016).
      if (a.payload.ahora !== null) s.ahora = a.payload.ahora;
      s.hidratado = true;
    });
    b.addCase(sincronizado, (s, a) => {
      s.ahora = a.payload.ahora;
    });
    // Vuelve al modo de ejemplo, reloj incluido (sin corpus sincronizado la fuente es el reloj de ejemplo),
    // y sube la época para que una sincronización en vuelo descarte su resultado.
    b.addCase(sesionCerrada, (s) => ({
      ...sesionInicial,
      hidratado: s.hidratado,
      authLista: s.authLista,
      epoca: s.epoca + 1,
    }));
    b.addCase(escenarioElegido, (s, a) => {
      s.escenario = a.payload;
    });
  },
});

export const { ahoraCambio, usuarioCambio, avisoMostrado } = sesion.actions;
