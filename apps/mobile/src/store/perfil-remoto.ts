/**
 * Los medios del perfil en Supabase (issue #41, ADR-010): capa imperativa sobre `perfil/datos.ts`.
 * Lo que devuelve la base entra al slice `perfil`, que se persiste en el dispositivo; si un pedido
 * falla, el slice no cambia y la pantalla muestra el error clasificado.
 */
import type { Resultado } from "../perfil/datos";
import {
  esDuplicado,
  MENSAJES_ERROR,
  puedeConfirmar,
  puedeSacar,
  type Banco,
  type MedioDePago,
  type MedioNuevo,
} from "../perfil/modelo";
import type { AppDispatch, AppThunk, RootState } from "./index";
import { cargaCambio, medioAgregado, medioSacado, mediosConfirmados, mediosLeidos } from "./perfil";

const SIN_CONEXION = { ok: false, error: "sin_conexion" } as const;

/**
 * Cuenta las escrituras que empezaron. Una lectura que salió antes de una escritura trae datos
 * viejos: si el contador cambió mientras volaba, su resultado se descarta.
 */
let escrituras = 0;

const usuarioActual = (getState: () => RootState) => getState().sesion.usuario?.id ?? null;

/**
 * Lee los medios del usuario y reemplaza los locales. Sin medios, las pestañas llevan al onboarding
 * (T009); sin conexión, queda lo guardado en modo solo lectura (FR-010).
 */
export function leerMedios(): AppThunk<Promise<void>> {
  return async (dispatch, getState, { perfilRemoto }) => {
    const usuarioId = usuarioActual(getState);
    if (usuarioId === null) return;
    // Sin Supabase no hay cómo leer: que las pestañas no esperen para siempre (FR-010).
    if (!perfilRemoto) {
      dispatch(cargaCambio("sin-conexion"));
      return;
    }
    const escrituraAlSalir = escrituras;
    dispatch(cargaCambio("leyendo"));
    const r = await perfilRemoto.leerMisMedios();
    // Se cerró la sesión o entró otra cuenta mientras volaba el pedido: no es de este usuario.
    if (usuarioActual(getState) !== usuarioId) return;
    if (escrituras !== escrituraAlSalir) {
      // Una escritura se cruzó: esta lectura puede ser anterior. La escritura ya dejó el slice al día.
      if (getState().perfil.carga === "leyendo") dispatch(cargaCambio("lista"));
      return;
    }
    if (r.ok) dispatch(mediosLeidos(r.datos));
    else dispatch(cargaCambio(r.error === "sin_conexion" ? "sin-conexion" : "error"));
  };
}

/**
 * Corre una escritura y la deja en el slice solo si sigue siendo la misma cuenta. Si no llegó a
 * Supabase, el perfil pasa a solo lectura hasta la próxima lectura.
 */
async function escribir<T>(
  dispatch: AppDispatch,
  getState: () => RootState,
  pedido: () => Promise<Resultado<T>>,
  guardar: (datos: T) => void,
): Promise<Resultado<T>> {
  const usuarioId = usuarioActual(getState);
  escrituras += 1;
  const r = await pedido();
  escrituras += 1;
  if (usuarioActual(getState) !== usuarioId) return { ok: false, error: "otro" };
  if (r.ok) guardar(r.datos);
  else if (r.error === "sin_conexion") dispatch(cargaCambio("sin-conexion"));
  return r;
}

/** El paso de medios del onboarding: todos en un solo pedido (FR-011). Hasta acá no se guardó nada. */
export function confirmarMedios(nuevos: readonly MedioNuevo[]): AppThunk<Promise<Resultado<MedioDePago[]>>> {
  return async (dispatch, getState, { perfilRemoto }) => {
    if (!puedeConfirmar(nuevos)) return { ok: false, error: "otro" };
    if (!perfilRemoto) return SIN_CONEXION;
    return escribir(dispatch, getState, () => perfilRemoto.confirmarOnboarding(nuevos), (d) =>
      dispatch(mediosConfirmados(d)),
    );
  };
}

export function agregarMedio(nuevo: MedioNuevo): AppThunk<Promise<Resultado<MedioDePago>>> {
  return async (dispatch, getState, { perfilRemoto }) => {
    if (esDuplicado(getState().perfil.medios, nuevo)) return { ok: false, error: "duplicado" };
    if (!perfilRemoto) return SIN_CONEXION;
    return escribir(dispatch, getState, () => perfilRemoto.agregarMedio(nuevo), (d) => dispatch(medioAgregado(d)));
  };
}

/** El perfil no queda vacío (FR-009): con un solo medio no se pide nada. */
export function sacarMedio(id: string): AppThunk<Promise<Resultado<null>>> {
  return async (dispatch, getState, { perfilRemoto }) => {
    if (!puedeSacar(getState().perfil.medios)) return { ok: false, error: "otro" };
    if (!perfilRemoto) return SIN_CONEXION;
    const r = await escribir(dispatch, getState, () => perfilRemoto.sacarMedio(id), () => dispatch(medioSacado(id)));
    // Si no se pudo sacar porque la fila ya no estaba o no era del usuario, el slice puede estar viejo.
    if (!r.ok && (r.error === "otro" || r.error === "ultimo_medio")) void dispatch(leerMedios());
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
