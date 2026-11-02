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
import type { RepositorioSincronizacion } from "../sync/contratos";
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
/** Estado de coordinación de la sincronización: no es serializable ni de la UI, así que no va en Redux. */
export type Coordinacion = { enVuelo: boolean; ultimoIntentoMs: number | null };

export type Extra = {
  almacenamiento: Almacenamiento;
  /** `null` = no hay cliente de Supabase (variables faltantes): no se sincroniza. */
  repositorio: RepositorioSincronizacion | null;
  /** El reloj real. La app: `() => new Date()`. Los tests lo controlan (spec 009 R2). */
  reloj: () => Date;
  coordinacion: Coordinacion;
};

export function crearStore(opciones: {
  almacenamiento: Almacenamiento;
  estadoInicial: Partial<RootState> | null;
  repositorio?: RepositorioSincronizacion | null;
  reloj?: () => Date;
}) {
  const listener = createListenerMiddleware<RootState>();
  const extra: Extra = {
    almacenamiento: opciones.almacenamiento,
    repositorio: opciones.repositorio ?? null,
    reloj: opciones.reloj ?? (() => new Date()),
    coordinacion: { enVuelo: false, ultimoIntentoMs: null },
  };
  const store = configureStore({
    reducer,
    preloadedState: opciones.estadoInicial ?? undefined,
    middleware: (porDefecto) => porDefecto({ thunk: { extraArgument: extra } }).prepend(listener.middleware),
  });
  escucharPersistencia(listener, opciones.almacenamiento);
  return store;
}

export type AppStore = ReturnType<typeof crearStore>;
export type AppDispatch = AppStore["dispatch"];
export type AppThunk<R = void> = ThunkAction<R, RootState, Extra, UnknownAction>;
