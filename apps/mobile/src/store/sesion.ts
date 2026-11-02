import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { RELOJ_EJEMPLO } from "../data/fixtures";
import { escenarioElegido, rehidratado, sesionCerrada, type Cuenta, type Escenario } from "./acciones";

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
};

export const sesionInicial: EstadoSesion = {
  cuenta: null,
  ahora: new Date(RELOJ_EJEMPLO).toISOString(),
  aviso: null,
  escenario: "normal",
  hidratado: false,
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
      s.hidratado = true;
    });
    b.addCase(sesionCerrada, (s) => ({ ...sesionInicial, ahora: s.ahora, hidratado: s.hidratado }));
    b.addCase(escenarioElegido, (s, a) => {
      s.escenario = a.payload;
    });
  },
});

export const { ahoraCambio, cuentaGuardada, avisoMostrado } = sesion.actions;
