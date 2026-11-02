/**
 * Persistencia del store en el dispositivo, sin `redux-persist` (ADR-010, research R6).
 * Se guardan `perfil`, `corpus` y `compras`: solo datos de entrada. Nada derivado
 * (recomendación, topes) llega al almacenamiento (FR-010).
 */
import type { ListenerMiddlewareInstance } from "@reduxjs/toolkit";
import { fechaArgentina } from "@vuelto/motor";
import { comprasDelPeriodo } from "../data/calculo";
import { mediosDeEjemplo } from "../data/fixtures";
import { REDES, TIPOS_TARJETA } from "../perfil/modelo";
import {
  rehidratado,
  type EstadoCompras,
  type EstadoCorpus,
  type EstadoPerfil,
  type MedioGuardado,
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
};

/** Solo las compras del período en curso llegan al disco (privacidad.md, ADR-010). */
export function aPersistir(s: RootState): Persistido {
  const hoy = fechaArgentina(new Date(s.sesion.ahora));
  return {
    version: 1,
    // El estado de la lectura en Supabase no se guarda: al abrir se vuelve a leer.
    perfil: {
      nombre: s.perfil.nombre,
      onboardingCompleto: s.perfil.onboardingCompleto,
      medios: s.perfil.medios,
      comercios: s.perfil.comercios,
      invitacionPendiente: s.perfil.invitacionPendiente,
    },
    corpus: s.corpus,
    compras: { lista: comprasDelPeriodo(s.compras.lista, hoy) },
  };
}

// ─── Validación por parte: una parte inválida no tira abajo las otras (FR-011) ───

type Desconocido = Record<string, unknown>;
const esObjeto = (x: unknown): x is Desconocido => typeof x === "object" && x !== null && !Array.isArray(x);
const esTexto = (x: unknown): x is string => typeof x === "string";
const textoONull = (x: unknown) => x === null || esTexto(x);
const listaDeTextos = (x: unknown): x is string[] => Array.isArray(x) && x.every(esTexto);

const esUno = <T extends string>(valores: readonly T[], x: unknown): x is T => valores.includes(x as T);

function medioValido(x: unknown): x is MedioGuardado {
  return (
    esObjeto(x) &&
    esTexto(x.id) &&
    esTexto(x.bancoId) &&
    textoONull(x.nombreBanco) &&
    esUno(TIPOS_TARJETA, x.tipo) &&
    esUno(REDES, x.red)
  );
}

/**
 * Los medios guardados (issue #41). Antes eran ids del catálogo de ejemplo: se migran a la forma
 * nueva con los datos de ejemplo y los que no se reconocen se descartan. Al entrar, lo que diga
 * Supabase reemplaza lo local.
 */
function mediosValidos(x: unknown): MedioGuardado[] | null {
  if (listaDeTextos(x)) return mediosDeEjemplo(x);
  if (Array.isArray(x) && x.every(medioValido)) return x;
  return null;
}

function perfilValido(x: unknown): EstadoPerfil | null {
  if (!esObjeto(x)) return null;
  const medios = mediosValidos(x.medios);
  const ok =
    medios !== null &&
    typeof x.onboardingCompleto === "boolean" &&
    listaDeTextos(x.comercios) &&
    textoONull(x.nombre) &&
    textoONull(x.invitacionPendiente);
  if (!ok) return null;
  return {
    nombre: x.nombre as string | null,
    onboardingCompleto: x.onboardingCompleto as boolean,
    medios,
    comercios: x.comercios as string[],
    invitacionPendiente: x.invitacionPendiente as string | null,
  };
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

const NADA: Rehidratado = { perfil: null, corpus: null, compras: null };

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
  return { ...NADA, perfil };
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
      // Sin almacenamiento la app funciona en memoria (spec 008, Edge Cases).
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
