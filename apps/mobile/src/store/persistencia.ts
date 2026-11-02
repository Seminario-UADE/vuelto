/**
 * Persistencia del store en el dispositivo, sin `redux-persist` (ADR-010, research R6).
 * Se guardan `perfil`, `corpus`, `compras` y la cuenta: solo datos de entrada. Nada derivado
 * (recomendación, topes) llega al almacenamiento (FR-010).
 */
import type { ListenerMiddlewareInstance } from "@reduxjs/toolkit";
import { fechaArgentina } from "@vuelto/motor";
import { comprasDelPeriodo } from "../data/calculo";
import {
  rehidratado,
  type Cuenta,
  type EstadoCompras,
  type EstadoCorpus,
  type EstadoPerfil,
  type Rehidratado,
} from "./acciones";
import type { AppThunk, RootState } from "./index";

/** Lo que la app necesita de AsyncStorage; en los tests, un `Map`. */
export type Almacenamiento = {
  getItem(clave: string): Promise<string | null>;
  setItem(clave: string, valor: string): Promise<void>;
  removeItem(clave: string): Promise<void>;
};

export const CLAVE = "vuelto.store.v1";
/** La clave de `perfil-local.ts`, antes del store. Se migra una vez y se borra. */
export const CLAVE_VIEJA = "vuelto.perfil.v1";

export type Persistido = {
  version: 1;
  perfil: EstadoPerfil;
  corpus: EstadoCorpus;
  compras: EstadoCompras;
  cuenta: Cuenta;
};

/** Solo las compras del período en curso llegan al disco (privacidad.md, ADR-010). */
export function aPersistir(s: RootState): Persistido {
  const hoy = fechaArgentina(new Date(s.sesion.ahora));
  return {
    version: 1,
    perfil: s.perfil,
    corpus: s.corpus,
    compras: { lista: comprasDelPeriodo(s.compras.lista, hoy) },
    cuenta: s.sesion.cuenta,
  };
}

// ─── Validación por parte: una parte inválida no tira abajo las otras (FR-011) ───

type Desconocido = Record<string, unknown>;
const esObjeto = (x: unknown): x is Desconocido => typeof x === "object" && x !== null && !Array.isArray(x);
const esTexto = (x: unknown): x is string => typeof x === "string";
const textoONull = (x: unknown) => x === null || esTexto(x);
const listaDeTextos = (x: unknown): x is string[] => Array.isArray(x) && x.every(esTexto);

function perfilValido(x: unknown): EstadoPerfil | null {
  if (!esObjeto(x)) return null;
  const ok =
    typeof x.onboardingCompleto === "boolean" &&
    listaDeTextos(x.medios) &&
    listaDeTextos(x.comercios) &&
    textoONull(x.nombre) &&
    textoONull(x.invitacionPendiente);
  return ok ? (x as EstadoPerfil) : null;
}

function corpusValido(x: unknown): EstadoCorpus | null {
  if (!esObjeto(x) || !Array.isArray(x.promociones) || !textoONull(x.cargadoEn)) return null;
  const ok = x.promociones.every((p) => esObjeto(p) && esTexto(p.id) && esObjeto(p.tope) && esObjeto(p.vigencia));
  return ok ? (x as EstadoCorpus) : null;
}

function comprasValidas(x: unknown): EstadoCompras | null {
  if (!esObjeto(x) || !Array.isArray(x.lista)) return null;
  const ok = x.lista.every((c) => esObjeto(c) && esTexto(c.id) && esTexto(c.fecha) && typeof c.monto === "number");
  return ok ? (x as EstadoCompras) : null;
}

function cuentaValida(x: unknown): { valor: Cuenta } | null {
  if (x === null) return { valor: null };
  if (!esObjeto(x) || !textoONull(x.email) || (x.proveedor !== "email" && x.proveedor !== "apple")) return null;
  return { valor: { email: x.email as string | null, proveedor: x.proveedor } };
}

const NADA: Rehidratado = { perfil: null, corpus: null, compras: null, cuenta: null };

export function leerPersistido(raw: string | null): Rehidratado {
  if (raw === null) return NADA;
  let x: unknown;
  try {
    x = JSON.parse(raw);
  } catch {
    return NADA;
  }
  if (!esObjeto(x) || x.version !== 1) return NADA;
  return {
    perfil: perfilValido(x.perfil),
    corpus: corpusValido(x.corpus),
    compras: comprasValidas(x.compras),
    cuenta: "cuenta" in x ? cuentaValida(x.cuenta) : null,
  };
}

/** `vuelto.perfil.v1` (perfil-local.ts): quien ya hizo el onboarding no lo repite. */
export function leerPerfilViejo(raw: string | null): Rehidratado {
  if (raw === null) return NADA;
  let x: unknown;
  try {
    x = JSON.parse(raw);
  } catch {
    return NADA;
  }
  if (!esObjeto(x)) return NADA;
  const perfil = perfilValido({
    nombre: null,
    onboardingCompleto: x.onboardingCompleto ?? false,
    medios: x.medios ?? [],
    comercios: x.comercios ?? [],
    invitacionPendiente: x.invitacionPendiente ?? null,
  });
  return { ...NADA, perfil, cuenta: cuentaValida(x.cuenta ?? null) };
}

/** Lee lo guardado al abrir la app y lo carga en el store. Después de esto se empieza a escribir. */
export function rehidratar(): AppThunk<Promise<void>> {
  return async (dispatch, getState, { almacenamiento }) => {
    let partes = NADA;
    let migrado = false;
    try {
      partes = leerPersistido(await almacenamiento.getItem(CLAVE));
      if (partes === NADA) {
        partes = leerPerfilViejo(await almacenamiento.getItem(CLAVE_VIEJA));
        migrado = partes.perfil !== null;
      }
    } catch {
      // Sin almacenamiento la app funciona en memoria (spec 007, Edge Cases).
    }
    // El nombre no estaba en el perfil viejo: queda el del store.
    if (partes.perfil && partes.perfil.nombre === null) {
      partes = { ...partes, perfil: { ...partes.perfil, nombre: getState().perfil.nombre } };
    }
    dispatch(rehidratado(partes));
    if (migrado) await almacenamiento.removeItem(CLAVE_VIEJA).catch(() => undefined);
  };
}

/** Escribe lo persistente cada vez que cambia, una vez rehidratado (no pisa lo guardado). */
export function escucharPersistencia(listener: ListenerMiddlewareInstance<RootState>, almacenamiento: Almacenamiento) {
  listener.startListening({
    predicate: (_accion, actual, previo) =>
      actual.sesion.hidratado &&
      (actual.perfil !== previo.perfil ||
        actual.corpus !== previo.corpus ||
        actual.compras !== previo.compras ||
        actual.sesion.cuenta !== previo.sesion.cuenta ||
        actual.sesion.hidratado !== previo.sesion.hidratado),
    effect: async (_accion, api) => {
      try {
        await almacenamiento.setItem(CLAVE, JSON.stringify(aPersistir(api.getState())));
      } catch {
        // Almacenamiento lleno o no disponible: se pierde solo lo que no se pudo guardar.
      }
    },
  });
}
