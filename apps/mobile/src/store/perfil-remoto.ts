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
  nombreRepetido,
  MENSAJES_ERROR,
  puedeConfirmar,
  puedeSacar,
  validarNombre,
  type Banco,
  type CasoDeError,
  type ComercioHabitual,
  type MedioDePago,
  type MedioNuevo,
} from "../perfil/modelo";
import type { AppDispatch, AppThunk, RootState } from "./index";
import {
  borradorParteGuardada,
  cargaCambio,
  type CargaPerfil,
  comercioAgregado,
  comercioSacado,
  comerciosConfirmados,
  comerciosLeidos,
  medioAgregado,
  medioSacado,
  mediosConfirmados,
  mediosLeidos,
  nombreCambiado,
} from "./perfil";
import { avisoMostrado } from "./sesion";

const SIN_CONEXION = { ok: false, error: "sin_conexion" } as const;

/**
 * Cuenta las escrituras que empezaron, por lista. Una lectura que salió antes de una escritura trae
 * datos viejos: si el contador de su lista cambió mientras volaba, su resultado se descarta.
 */
const escrituras = { medios: 0, comercios: 0, nombre: 0 };
type Lista = keyof typeof escrituras;

const usuarioActual = (getState: () => RootState) => getState().sesion.usuario?.id ?? null;

/** Cómo queda la carga del perfil cuando una lectura falla (FR-010, issue #127). */
function cargaDeError(error: CasoDeError): CargaPerfil {
  if (error === "sin_conexion") return "sin-conexion";
  if (error === "servidor_desactualizado") return "servidor-desactualizado";
  return "error";
}

/**
 * Lee los medios del usuario y reemplaza los locales. Sin medios, las pestañas llevan al onboarding
 * (T009); sin conexión, queda lo guardado en modo solo lectura (FR-010).
 * En paralelo lee el nombre de la cuenta (spec 012): si falla, queda el que había.
 */
export function leerMedios(): AppThunk<Promise<void>> {
  return async (dispatch, getState, { perfilRemoto }) => {
    const usuarioId = usuarioActual(getState);
    if (usuarioId === null) return;
    // Lo elegido antes de tener cuenta se guarda primero; esa misma pasada lee la cuenta (US5).
    if (getState().perfil.borrador !== null) {
      await dispatch(guardarBorradorEnCuenta());
      return;
    }
    // Sin Supabase no hay cómo leer: que las pestañas no esperen para siempre (FR-010).
    if (!perfilRemoto) {
      dispatch(cargaCambio("sin-conexion"));
      return;
    }
    const escrituraAlSalir = escrituras.medios;
    const nombreAlSalir = escrituras.nombre;
    dispatch(cargaCambio("leyendo"));
    const [r, nombre] = await Promise.all([perfilRemoto.leerMisMedios(), perfilRemoto.leerNombre()]);
    // Se cerró la sesión o entró otra cuenta mientras volaba el pedido: no es de este usuario.
    if (usuarioActual(getState) !== usuarioId) return;
    // Un nombre guardado mientras volaba la lectura es más nuevo que el leído.
    if (nombre.ok && escrituras.nombre === nombreAlSalir) dispatch(nombreCambiado(nombre.datos));
    if (escrituras.medios !== escrituraAlSalir) {
      // Una escritura se cruzó: esta lectura puede ser anterior. La escritura ya dejó el slice al día.
      if (getState().perfil.carga === "leyendo") dispatch(cargaCambio("lista"));
      return;
    }
    if (r.ok) dispatch(mediosLeidos(r.datos));
    else dispatch(cargaCambio(cargaDeError(r.error)));
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

/**
 * Guarda el nombre para mostrar en la cuenta (spec 012, FR-027 y FR-028): al registrarse y desde
 * Perfil. Un nombre inválido no llega a Supabase; el store cambia solo con lo que devolvió la base.
 */
export function cambiarNombre(nombre: string): AppThunk<Promise<Resultado<string>>> {
  return async (dispatch, getState, { perfilRemoto }) => {
    const v = validarNombre(nombre);
    const usuarioId = usuarioActual(getState);
    if (!v.ok || usuarioId === null) return { ok: false, error: "otro" };
    if (!perfilRemoto) return SIN_CONEXION;
    return escribir("nombre", dispatch, getState, () => perfilRemoto.guardarNombre(usuarioId, v.nombre), (d) =>
      dispatch(nombreCambiado(d)),
    );
  };
}

/** El catálogo de bancos para el selector. Lanza con el mensaje para la pantalla (`useAsync`). */
export function leerBancos(): AppThunk<Promise<Banco[]>> {
  return async (_dispatch, _getState, { perfilRemoto }) => {
    if (!perfilRemoto) throw new Error(MENSAJES_ERROR.sin_conexion);
    const r = await perfilRemoto.leerBancos();
    if (!r.ok) {
      throw new Error(
        r.error === "sin_conexion"
          ? "Necesitás conexión para elegir tu banco"
          : r.error === "servidor_desactualizado"
            ? MENSAJES_ERROR.servidor_desactualizado
            : MENSAJES_ERROR.otro,
      );
    }
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
    // Con un borrador, los lee `guardarBorradorEnCuenta` antes de decidir qué guardar (US5).
    if (!perfilRemoto || usuarioId === null || getState().perfil.borrador !== null) return;
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
    if (n.trim() === "" || comercioRepetido(guardados, n) || nombreRepetido(nuevos, n)) continue;
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
      dispatch(comerciosConfirmados(d)),
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

// ─── Borrador del onboarding (spec 012, US5) ───

/** La cuenta ya tenía esa parte: prevalece la de la cuenta y se avisa (FR-034). */
export type AvisoBorrador = "medios-de-la-cuenta" | "comercios-de-la-cuenta";

export const TEXTO_AVISO_BORRADOR: Record<AvisoBorrador, string> = {
  "medios-de-la-cuenta": "Tu cuenta ya tenía tarjetas: quedaron esas",
  "comercios-de-la-cuenta": "Tu cuenta ya tenía comercios: quedaron esos",
};

/**
 * Guarda en la cuenta lo elegido antes de tenerla (FR-031): al crearla o al primer ingreso. Lee la
 * cuenta y, por separado para medios y habituales, si ya los tiene prevalecen y se avisa; si no, se
 * guardan los del borrador (FR-034). El nombre, solo si la cuenta no tiene uno. Cada parte sale del
 * borrador recién cuando quedó en la cuenta: una falla a mitad conserva lo que falta, y la próxima
 * lectura lo vuelve a intentar.
 */
export function guardarBorradorEnCuenta(): AppThunk<Promise<Resultado<AvisoBorrador[]>>> {
  return async (dispatch, getState, { perfilRemoto }) => {
    const usuarioId = usuarioActual(getState);
    const borrador = () => getState().perfil.borrador;
    if (usuarioId === null || borrador() === null) return { ok: true, datos: [] };
    if (!perfilRemoto) {
      dispatch(cargaCambio("sin-conexion"));
      return SIN_CONEXION;
    }
    dispatch(cargaCambio("leyendo"));
    const [medios, comercios, nombre] = await Promise.all([
      perfilRemoto.leerMisMedios(),
      perfilRemoto.leerMisComercios(),
      perfilRemoto.leerNombre(),
    ]);
    if (usuarioActual(getState) !== usuarioId) return { ok: false, error: "otro" };
    if (!medios.ok) {
      dispatch(cargaCambio(cargaDeError(medios.error)));
      return medios;
    }
    const avisos: AvisoBorrador[] = [];

    const elegidos = borrador()?.medios ?? [];
    if (medios.datos.length > 0 || elegidos.length === 0) {
      dispatch(mediosLeidos(medios.datos));
      if (medios.datos.length > 0 && elegidos.length > 0) avisos.push("medios-de-la-cuenta");
    } else {
      const sinNombreDeBanco = elegidos.map(({ bancoId, tipo, red }) => ({ bancoId, tipo, red }));
      const r = await escribir("medios", dispatch, getState, () => perfilRemoto.confirmarOnboarding(sinNombreDeBanco), (d) =>
        dispatch(mediosLeidos(d)),
      );
      if (!r.ok) {
        if (getState().perfil.carga === "leyendo") dispatch(cargaCambio(cargaDeError(r.error)));
        return r;
      }
    }
    dispatch(borradorParteGuardada("medios"));

    if (!comercios.ok) return comercios;
    const nombres = comerciosNuevos(borrador()?.comercios ?? [], []);
    if (comercios.datos.length > 0 || nombres.length === 0) {
      dispatch(comerciosLeidos(comercios.datos));
      if (comercios.datos.length > 0 && nombres.length > 0) avisos.push("comercios-de-la-cuenta");
    } else {
      const r = await escribir("comercios", dispatch, getState, () => perfilRemoto.confirmarComercios(nombres), (d) =>
        dispatch(comerciosLeidos(d)),
      );
      if (!r.ok) return r;
    }
    dispatch(borradorParteGuardada("comercios"));

    if (!nombre.ok) return nombre;
    const v = validarNombre(borrador()?.nombre ?? "");
    if (nombre.datos === null && v.ok) {
      const r = await escribir("nombre", dispatch, getState, () => perfilRemoto.guardarNombre(usuarioId, v.nombre), (d) =>
        dispatch(nombreCambiado(d)),
      );
      if (!r.ok) return r;
    } else if (nombre.datos !== null) {
      dispatch(nombreCambiado(nombre.datos));
    }
    dispatch(borradorParteGuardada("nombre"));

    if (avisos.length > 0) dispatch(avisoMostrado(avisos.map((a) => TEXTO_AVISO_BORRADOR[a]).join(". ")));
    return { ok: true, datos: avisos };
  };
}
