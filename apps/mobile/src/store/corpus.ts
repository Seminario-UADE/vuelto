import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { RELOJ_EJEMPLO, promociones } from "../data/fixtures";
import { rehidratado, type EstadoCorpus } from "./acciones";

/** Hasta la sincronización con Supabase (#42), el corpus son las promos de ejemplo. */
export const corpusInicial: EstadoCorpus = {
  promociones,
  cargadoEn: new Date(RELOJ_EJEMPLO).toISOString(),
};

export const corpus = createSlice({
  name: "corpus",
  initialState: corpusInicial,
  reducers: {
    corpusCargado(_s, a: PayloadAction<EstadoCorpus>) {
      return a.payload;
    },
  },
  extraReducers: (b) => {
    b.addCase(rehidratado, (s, a) => a.payload.corpus ?? s);
  },
});

export const { corpusCargado } = corpus.actions;
