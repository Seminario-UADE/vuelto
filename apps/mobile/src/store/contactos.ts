import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Contacto, PedidoGrupo } from "../data/contracts";
import { contactos as deEjemplo } from "../data/fixtures";
import { escenarioElegido, sesionCerrada } from "./acciones";

/**
 * Contactos (solo lo que ADR-008 §3 deja ver) y el grupo en armado. No se persiste: en
 * producción la lista sale del servidor (#56). Una cuenta arranca sin contactos y ve el estado
 * vacío; Lucía y Mateo vienen solo con un escenario de demo (G-02).
 */
export type EstadoContactos = { lista: Contacto[]; grupo: PedidoGrupo | null };

const inicial: EstadoContactos = { lista: [], grupo: null };

export const contactos = createSlice({
  name: "contactos",
  initialState: inicial,
  reducers: {
    contactoAgregado(s, a: PayloadAction<Contacto>) {
      s.lista = [...s.lista.filter((c) => c.id !== a.payload.id), a.payload];
    },
    contactoQuitado(s, a: PayloadAction<string>) {
      s.lista = s.lista.filter((c) => c.id !== a.payload);
    },
    grupoArmado(s, a: PayloadAction<PedidoGrupo | null>) {
      s.grupo = a.payload;
    },
  },
  extraReducers: (b) => {
    b.addCase(sesionCerrada, () => inicial);
    b.addCase(escenarioElegido, (s) => {
      s.lista = deEjemplo;
    });
  },
});

export const { contactoAgregado, contactoQuitado, grupoArmado } = contactos.actions;
