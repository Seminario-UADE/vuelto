/**
 * El store de la app (ADR-010): solo datos de entrada. La recomendación y los topes se derivan
 * con los selectores de `selectores.ts`; nunca se guardan acá ni en el dispositivo.
 */
import {
  combineReducers,
  configureStore,
  createListenerMiddleware,
  type ThunkAction,
  type UnknownAction,
} from "@reduxjs/toolkit";
import type { Subida } from "../data/compras/repositorio";
import { cola, escucharPersistenciaCola } from "./cola";
import { compras } from "./compras";
import { contactos } from "./contactos";
import { corpus } from "./corpus";
import { escucharPersistencia, type Almacenamiento } from "./persistencia";
import { perfil } from "./perfil";
import { sesion } from "./sesion";
import { simulacion } from "./simulacion";

const reducer = combineReducers({
  sesion: sesion.reducer,
  perfil: perfil.reducer,
  corpus: corpus.reducer,
  compras: compras.reducer,
  cola: cola.reducer,
  simulacion: simulacion.reducer,
  contactos: contactos.reducer,
});

export type RootState = ReturnType<typeof reducer>;
/**
 * Lo que los thunks reciben además del estado. `generarId` da el UUID de cada compra nueva
 * (`expo-crypto` en la app, uno determinista en los tests, spec 010 R1). `subida` es el
 * repositorio de la cuenta con su contexto; `null` mientras no estén #40, #41 y #42 (FR-020).
 */
export type Extra = { almacenamiento: Almacenamiento; generarId: () => string; subida: Subida | null };

export function crearStore(opciones: {
  almacenamiento: Almacenamiento;
  estadoInicial: Partial<RootState> | null;
  generarId: () => string;
  subida?: Subida | null;
}) {
  const listener = createListenerMiddleware<RootState>();
  const extra: Extra = {
    almacenamiento: opciones.almacenamiento,
    generarId: opciones.generarId,
    subida: opciones.subida ?? null,
  };
  const store = configureStore({
    reducer,
    preloadedState: opciones.estadoInicial ?? undefined,
    middleware: (porDefecto) => porDefecto({ thunk: { extraArgument: extra } }).prepend(listener.middleware),
  });
  // La cola va primero: su setItem tiene que salir antes que el de `compras` (spec 010, R2).
  escucharPersistenciaCola(listener, opciones.almacenamiento);
  escucharPersistencia(listener, opciones.almacenamiento);
  return store;
}

export type AppStore = ReturnType<typeof crearStore>;
export type AppDispatch = AppStore["dispatch"];
export type AppThunk<R = void> = ThunkAction<R, RootState, Extra, UnknownAction>;
