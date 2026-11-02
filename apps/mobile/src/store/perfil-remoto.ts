/**
 * Los medios del perfil en Supabase (issue #41, ADR-010): capa imperativa sobre `perfil/datos.ts`.
 * Lo que devuelve la base entra al slice `perfil`, que se persiste en el dispositivo; si un pedido
 * falla, el slice no cambia y la pantalla muestra el error clasificado.
 */
import type { Resultado } from "../perfil/datos";
import {
  comercioRepetido,
  esDuplicado,
  MENSAJES_ERROR,
  puedeConfirmar,
  puedeSacar,
  type Banco,
  type ComercioHabitual,
  type MedioDePago,
  type MedioNuevo,
} from "../perfil/modelo";
import type { AppThunk } from "./index";
import {
  cargaCambio,
  comercioAgregado,
  comercioSacado,
  comerciosLeidos,
  medioAgregado,
  medioSacado,
  mediosConfirmados,
  mediosLeidos,
} from "./perfil";

const SIN_CONEXION = { ok: false, error: "sin_conexion" } as const;

/**
 * Lee los medios del usuario y reemplaza los locales. Sin medios, las pestañas llevan al onboarding
 * (T009); sin conexión, queda lo guardado en modo solo lectura (FR-010).
 */
export function leerMedios(): AppThunk<Promise<void>> {
  return async (dispatch, getState, { perfilRemoto }) => {
    const usuarioId = getState().sesion.usuario?.id ?? null;
    if (!perfilRemoto || usuarioId === null) return;
    dispatch(cargaCambio("leyendo"));
    const r = await perfilRemoto.leerMisMedios();
    // Se cerró la sesión o entró otra cuenta mientras volaba el pedido: no es de este usuario.
    if ((getState().sesion.usuario?.id ?? null) !== usuarioId) return;
    if (r.ok) dispatch(mediosLeidos(r.datos));
    else dispatch(cargaCambio(r.error === "sin_conexion" ? "sin-conexion" : "error"));
  };
}

/** El paso de medios del onboarding: todos en un solo pedido (FR-011). Hasta acá no se guardó nada. */
export function confirmarMedios(nuevos: readonly MedioNuevo[]): AppThunk<Promise<Resultado<MedioDePago[]>>> {
  return async (dispatch, _getState, { perfilRemoto }) => {
    if (!puedeConfirmar(nuevos)) return { ok: false, error: "otro" };
    if (!perfilRemoto) return SIN_CONEXION;
    const r = await perfilRemoto.confirmarOnboarding(nuevos);
    if (r.ok) dispatch(mediosConfirmados(r.datos));
    return r;
  };
}

export function agregarMedio(nuevo: MedioNuevo): AppThunk<Promise<Resultado<MedioDePago>>> {
  return async (dispatch, getState, { perfilRemoto }) => {
    if (esDuplicado(getState().perfil.medios, nuevo)) return { ok: false, error: "duplicado" };
    if (!perfilRemoto) return SIN_CONEXION;
    const r = await perfilRemoto.agregarMedio(nuevo);
    if (r.ok) dispatch(medioAgregado(r.datos));
    return r;
  };
}

/** El perfil no queda vacío (FR-009): con un solo medio no se pide nada. */
export function sacarMedio(id: string): AppThunk<Promise<Resultado<null>>> {
  return async (dispatch, getState, { perfilRemoto }) => {
    if (!puedeSacar(getState().perfil.medios)) return { ok: false, error: "otro" };
    if (!perfilRemoto) return SIN_CONEXION;
    const r = await perfilRemoto.sacarMedio(id);
    if (r.ok) dispatch(medioSacado(id));
    return r;
  };
}

/** El catálogo de bancos para el selector. Lanza con el mensaje para la pantalla (`useAsync`). */
export function leerBancos(): AppThunk<Promise<Banco[]>> {
  return async (_dispatch, _getState, { perfilRemoto }) => {
    if (!perfilRemoto) throw new Error(MENSAJES_ERROR.sin_conexion);
    const r = await perfilRemoto.leerBancos();
    if (!r.ok) throw new Error(r.error === "sin_conexion" ? "Necesitás conexión para elegir tu banco" : MENSAJES_ERROR.otro);
    return r.datos;
  };
}

// ─── Comercios habituales (issue #47) ───

/**
 * Lee los comercios del usuario y reemplaza los locales. Son opcionales: si falla, queda lo
 * guardado y no se avisa nada (el motor funciona igual sin ellos, RF-02).
 */
export function leerComercios(): AppThunk<Promise<void>> {
  return async (dispatch, getState, { perfilRemoto }) => {
    const usuarioId = getState().sesion.usuario?.id ?? null;
    if (!perfilRemoto || usuarioId === null) return;
    const r = await perfilRemoto.leerMisComercios();
    if ((getState().sesion.usuario?.id ?? null) !== usuarioId) return;
    if (r.ok) dispatch(comerciosLeidos(r.datos));
  };
}

/** Los del onboarding, en un solo pedido. Sin comercios no pide nada: se puede seguir sin ellos. */
export function confirmarComercios(nombres: readonly string[]): AppThunk<Promise<Resultado<ComercioHabitual[]>>> {
  return async (dispatch, getState, { perfilRemoto }) => {
    const nuevos = nombres.filter((n, i) => n.trim() !== "" && !comercioRepetido(nombres.slice(0, i).map((x) => ({ nombre: x })), n));
    if (nuevos.length === 0) return { ok: true, datos: getState().perfil.comercios };
    if (!perfilRemoto) return SIN_CONEXION;
    const r = await perfilRemoto.confirmarComercios(nuevos);
    if (r.ok) dispatch(comerciosLeidos([...getState().perfil.comercios, ...r.datos]));
    return r;
  };
}

export function agregarComercio(nombre: string): AppThunk<Promise<Resultado<ComercioHabitual>>> {
  return async (dispatch, getState, { perfilRemoto }) => {
    if (nombre.trim() === "") return { ok: false, error: "otro" };
    if (comercioRepetido(getState().perfil.comercios, nombre)) return { ok: false, error: "duplicado" };
    if (!perfilRemoto) return SIN_CONEXION;
    const r = await perfilRemoto.agregarComercio(nombre);
    if (r.ok) dispatch(comercioAgregado(r.datos));
    return r;
  };
}

export function sacarComercio(id: string): AppThunk<Promise<Resultado<null>>> {
  return async (dispatch, _getState, { perfilRemoto }) => {
    if (!perfilRemoto) return SIN_CONEXION;
    const r = await perfilRemoto.sacarComercio(id);
    if (r.ok) dispatch(comercioSacado(id));
    return r;
  };
}
