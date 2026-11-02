import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Contacto, PedidoGrupo } from "../data/contracts";
import { contactos as deEjemplo } from "../data/fixtures";
import { sesionCerrada } from "./acciones";

/**
 * Contactos (solo lo que ADR-008 §3 deja ver) y el grupo en armado. No se persiste: en
 * producción la lista sale del servidor.
 */
export type EstadoContactos = { lista: Contacto[]; grupo: PedidoGrupo | null };

const inicial: EstadoContactos = { lista: deEjemplo, grupo: null };

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
  },
});

export const { contactoAgregado, contactoQuitado, grupoArmado } = contactos.actions;
