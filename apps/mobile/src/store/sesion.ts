import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { RELOJ_EJEMPLO } from "../data/fixtures";
import { escenarioElegido, rehidratado, sesionCerrada, sincronizado, type Cuenta, type Escenario } from "./acciones";

export type EstadoSesion = {
  /** Persistida: si guardó el perfil con una cuenta. */
  cuenta: Cuenta;
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
  cuenta: null,
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
    cuentaGuardada(s, a: PayloadAction<Cuenta>) {
      s.cuenta = a.payload;
    },
    avisoMostrado(s, a: PayloadAction<string | null>) {
      s.aviso = a.payload;
    },
  },
  extraReducers: (b) => {
    b.addCase(rehidratado, (s, a) => {
      if (a.payload.cuenta) s.cuenta = a.payload.cuenta.valor;
      // Con un corpus ya sincronizado el reloj es el real desde este mismo tick (spec 009 FR-016).
      if (a.payload.ahora !== null) s.ahora = a.payload.ahora;
      s.hidratado = true;
    });
    b.addCase(sincronizado, (s, a) => {
      s.ahora = a.payload.ahora;
    });
    b.addCase(sesionCerrada, (s) => ({ ...sesionInicial, ahora: s.ahora, hidratado: s.hidratado, epoca: s.epoca + 1 }));
    b.addCase(escenarioElegido, (s, a) => {
      s.escenario = a.payload;
    });
  },
});

export const { ahoraCambio, cuentaGuardada, avisoMostrado } = sesion.actions;
