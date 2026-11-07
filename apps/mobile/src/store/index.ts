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
import type { DatosPerfil } from "../perfil/datos";
import type { RepositorioSincronizacion } from "../sync/contratos";
import { cola, escucharPersistenciaCola } from "./cola";
import { compras } from "./compras";
import { contactos } from "./contactos";
import { corpus } from "./corpus";
import { escucharPersistencia, type Almacenamiento } from "./persistencia";
import { perfil } from "./perfil";
import { escucharPersistenciaPorConfirmar, porConfirmar } from "./por-confirmar";
import { sesion } from "./sesion";
import { simulacion } from "./simulacion";

const reducer = combineReducers({
  sesion: sesion.reducer,
  perfil: perfil.reducer,
  corpus: corpus.reducer,
  compras: compras.reducer,
  cola: cola.reducer,
  porConfirmar: porConfirmar.reducer,
  simulacion: simulacion.reducer,
  contactos: contactos.reducer,
});

export type RootState = ReturnType<typeof reducer>;
/** Estado de coordinación de la sincronización: no es serializable ni de la UI, así que no va en Redux. */
export type Coordinacion = { enVuelo: boolean; ultimoIntentoMs: number | null };

/**
 * Lo que los thunks reciben además del estado. `generarId` da el UUID de cada compra nueva
 * (`expo-crypto` en la app, uno determinista en los tests, spec 010 R1). `subida` es el
 * repositorio de la cuenta con su contexto; `null` mientras no estén #41 y #42 (FR-020).
 */
export type Extra = {
  almacenamiento: Almacenamiento;
  generarId: () => string;
  subida: Subida | null;
  /** `null` = no hay cliente de Supabase (variables faltantes): no se sincroniza. */
  repositorio: RepositorioSincronizacion | null;
  /** Lee y escribe los medios del perfil en Supabase (issue #41); `null` sin cliente de Supabase. */
  perfilRemoto: DatosPerfil | null;
  /** El reloj real. La app: `() => new Date()`. Los tests lo controlan (spec 009 R2). */
  reloj: () => Date;
  coordinacion: Coordinacion;
};

export function crearStore(opciones: {
  almacenamiento: Almacenamiento;
  estadoInicial: Partial<RootState> | null;
  generarId: () => string;
  subida?: Subida | null;
  repositorio?: RepositorioSincronizacion | null;
  perfilRemoto?: DatosPerfil | null;
  reloj?: () => Date;
}) {
  const listener = createListenerMiddleware<RootState>();
  const extra: Extra = {
    almacenamiento: opciones.almacenamiento,
    generarId: opciones.generarId,
    subida: opciones.subida ?? null,
    repositorio: opciones.repositorio ?? null,
    perfilRemoto: opciones.perfilRemoto ?? null,
    reloj: opciones.reloj ?? (() => new Date()),
    coordinacion: { enVuelo: false, ultimoIntentoMs: null },
  };
  const store = configureStore({
    reducer,
    preloadedState: opciones.estadoInicial ?? undefined,
    middleware: (porDefecto) => porDefecto({ thunk: { extraArgument: extra } }).prepend(listener.middleware),
  });
  // La cola va primero: su setItem tiene que salir antes que el de `compras` (spec 010, R2).
  escucharPersistenciaCola(listener, opciones.almacenamiento);
  escucharPersistencia(listener, opciones.almacenamiento);
  // Las compras por confirmar, al final: su escritura sale después de la de `compras` (spec 012, FR-016).
  escucharPersistenciaPorConfirmar(listener, opciones.almacenamiento);
  return store;
}

export type AppStore = ReturnType<typeof crearStore>;
export type AppDispatch = AppStore["dispatch"];
export type AppThunk<R = void> = ThunkAction<R, RootState, Extra, UnknownAction>;
