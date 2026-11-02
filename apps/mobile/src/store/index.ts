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
import type { DatosPerfil } from "../perfil/datos";
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
  simulacion: simulacion.reducer,
  contactos: contactos.reducer,
});

export type RootState = ReturnType<typeof reducer>;
/**
 * Lo que los thunks reciben además del estado. `perfilRemoto` lee y escribe los medios en Supabase
 * (issue #41); `null` si no hay cliente de Supabase (variables faltantes).
 */
export type Extra = { almacenamiento: Almacenamiento; perfilRemoto: DatosPerfil | null };

export function crearStore(opciones: {
  almacenamiento: Almacenamiento;
  estadoInicial: Partial<RootState> | null;
  perfilRemoto?: DatosPerfil | null;
}) {
  const extra: Extra = { almacenamiento: opciones.almacenamiento, perfilRemoto: opciones.perfilRemoto ?? null };
  const listener = createListenerMiddleware<RootState>();
  const store = configureStore({
    reducer,
    preloadedState: opciones.estadoInicial ?? undefined,
    middleware: (porDefecto) =>
      porDefecto({ thunk: { extraArgument: extra } }).prepend(listener.middleware),
  });
  escucharPersistencia(listener, opciones.almacenamiento);
  return store;
}

export type AppStore = ReturnType<typeof crearStore>;
export type AppDispatch = AppStore["dispatch"];
export type AppThunk<R = void> = ThunkAction<R, RootState, Extra, UnknownAction>;
