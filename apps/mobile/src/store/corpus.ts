import { createSlice } from "@reduxjs/toolkit";
import { promociones } from "../data/fixtures";
import { rehidratado, sincronizado, type EstadoCorpus } from "./acciones";

/**
 * Hasta la primera sincronización (spec 009), el corpus son las promos de ejemplo y `marca` es
 * `null`: la app usa también el reloj de ejemplo (FR-016).
 */
export const corpusInicial: EstadoCorpus = {
  promociones,
  marca: null,
  sincronizadoEn: null,
  descartadas: 0,
};

export const corpus = createSlice({
  name: "corpus",
  initialState: corpusInicial,
  reducers: {},
  extraReducers: (b) => {
    b.addCase(rehidratado, (s, a) => a.payload.corpus ?? s);
    b.addCase(sincronizado, (_s, a) => a.payload.corpus);
  },
});
