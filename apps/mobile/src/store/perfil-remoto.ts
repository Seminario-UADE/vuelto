/**
 * Los medios (issue #41) y los comercios habituales (issue #47) del perfil en Supabase (ADR-010):
 * capa imperativa sobre `perfil/datos.ts`.
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
import type { AppDispatch, AppThunk, RootState } from "./index";
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
 * Cuenta las escrituras que empezaron, por lista. Una lectura que salió antes de una escritura trae
 * datos viejos: si el contador de su lista cambió mientras volaba, su resultado se descarta.
 */
const escrituras = { medios: 0, comercios: 0 };
type Lista = keyof typeof escrituras;

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
    const escrituraAlSalir = escrituras.medios;
    dispatch(cargaCambio("leyendo"));
    const r = await perfilRemoto.leerMisMedios();
    // Se cerró la sesión o entró otra cuenta mientras volaba el pedido: no es de este usuario.
    if (usuarioActual(getState) !== usuarioId) return;
    if (escrituras.medios !== escrituraAlSalir) {
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
  lista: Lista,
  dispatch: AppDispatch,
  getState: () => RootState,
  pedido: () => Promise<Resultado<T>>,
  guardar: (datos: T) => void,
): Promise<Resultado<T>> {
  const usuarioId = usuarioActual(getState);
  escrituras[lista] += 1;
  const r = await pedido();
  escrituras[lista] += 1;
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
    return escribir("medios", dispatch, getState, () => perfilRemoto.confirmarOnboarding(nuevos), (d) =>
      dispatch(mediosConfirmados(d)),
    );
  };
}

export function agregarMedio(nuevo: MedioNuevo): AppThunk<Promise<Resultado<MedioDePago>>> {
  return async (dispatch, getState, { perfilRemoto }) => {
    if (esDuplicado(getState().perfil.medios, nuevo)) return { ok: false, error: "duplicado" };
    if (!perfilRemoto) return SIN_CONEXION;
    return escribir("medios", dispatch, getState, () => perfilRemoto.agregarMedio(nuevo), (d) => dispatch(medioAgregado(d)));
  };
}

/** El perfil no queda vacío (FR-009): con un solo medio no se pide nada. */
export function sacarMedio(id: string): AppThunk<Promise<Resultado<null>>> {
  return async (dispatch, getState, { perfilRemoto }) => {
    if (!puedeSacar(getState().perfil.medios)) return { ok: false, error: "otro" };
    if (!perfilRemoto) return SIN_CONEXION;
    const r = await escribir("medios", dispatch, getState, () => perfilRemoto.sacarMedio(id), () => dispatch(medioSacado(id)));
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

// ─── Comercios habituales (issue #47) ───

/**
 * Lee los comercios del usuario y reemplaza los locales. Son opcionales: si falla, queda lo
 * guardado y no se avisa nada (el motor funciona igual sin ellos, RF-02).
 */
export function leerComercios(): AppThunk<Promise<void>> {
  return async (dispatch, getState, { perfilRemoto }) => {
    const usuarioId = usuarioActual(getState);
    if (!perfilRemoto || usuarioId === null) return;
    const escrituraAlSalir = escrituras.comercios;
    const r = await perfilRemoto.leerMisComercios();
    // Otra cuenta, o una escritura que se cruzó y ya dejó el slice al día: se descarta.
    if (usuarioActual(getState) !== usuarioId || escrituras.comercios !== escrituraAlSalir) return;
    if (r.ok) dispatch(comerciosLeidos(r.datos));
  };
}

/** Los nombres sin vacíos ni repetidos, entre sí ni con los ya guardados («Coto» = « coto »). */
function comerciosNuevos(nombres: readonly string[], guardados: readonly ComercioHabitual[]): string[] {
  const nuevos: string[] = [];
  for (const n of nombres) {
    if (n.trim() === "" || comercioRepetido(guardados, n) || comercioRepetido(nuevos.map((nombre) => ({ nombre })), n)) continue;
    nuevos.push(n);
  }
  return nuevos;
}

/** Los del onboarding, en un solo pedido. Sin comercios nuevos no pide nada: se puede seguir sin ellos. */
export function confirmarComercios(nombres: readonly string[]): AppThunk<Promise<Resultado<ComercioHabitual[]>>> {
  return async (dispatch, getState, { perfilRemoto }) => {
    const nuevos = comerciosNuevos(nombres, getState().perfil.comercios);
    if (nuevos.length === 0) return { ok: true, datos: getState().perfil.comercios };
    if (!perfilRemoto) return SIN_CONEXION;
    return escribir("comercios", dispatch, getState, () => perfilRemoto.confirmarComercios(nuevos), (d) =>
      dispatch(comerciosLeidos([...getState().perfil.comercios, ...d])),
    );
  };
}

export function agregarComercio(nombre: string): AppThunk<Promise<Resultado<ComercioHabitual>>> {
  return async (dispatch, getState, { perfilRemoto }) => {
    if (nombre.trim() === "") return { ok: false, error: "otro" };
    if (comercioRepetido(getState().perfil.comercios, nombre)) return { ok: false, error: "duplicado" };
    if (!perfilRemoto) return SIN_CONEXION;
    return escribir("comercios", dispatch, getState, () => perfilRemoto.agregarComercio(nombre), (d) =>
      dispatch(comercioAgregado(d)),
    );
  };
}

export function sacarComercio(id: string): AppThunk<Promise<Resultado<null>>> {
  return async (dispatch, getState, { perfilRemoto }) => {
    if (!perfilRemoto) return SIN_CONEXION;
    const r = await escribir("comercios", dispatch, getState, () => perfilRemoto.sacarComercio(id), () =>
      dispatch(comercioSacado(id)),
    );
    // La fila ya no estaba o no era del usuario: el slice puede estar viejo.
    if (!r.ok && r.error === "otro") void dispatch(leerComercios());
    return r;
  };
}
