/**
 * Persistencia del store en el dispositivo, sin `redux-persist` (ADR-010, research R6).
 * Se guardan `perfil` y `compras` en `vuelto.store.v1`, y el corpus en su propia clave
 * `vuelto.corpus.v1` (spec 009 FR-017): un corpus que no entra no se lleva el perfil ni las compras,
 * y la marca viaja con las promos, así que nunca apunta a un corpus que no se guardó. La sesión no se
 * guarda acá: la guarda el cliente de Supabase (issue #40). Solo datos de entrada: nada derivado
 * (recomendación, topes) llega al almacenamiento (FR-010).
 */
import type { ListenerMiddlewareInstance } from "@reduxjs/toolkit";
import { fechaArgentina } from "@vuelto/motor";
import { comprasDelPeriodo } from "../data/calculo";
import {
  rehidratado,
  sesionCerrada,
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
/** El corpus sincronizado, aparte del resto. Solo existe después de una sincronización real. */
export const CLAVE_CORPUS = "vuelto.corpus.v1";
/** La clave de `perfil-local.ts`, antes del store. Se migra una vez y se borra. */
export const CLAVE_VIEJA = "vuelto.perfil.v1";

export type Persistido = {
  version: 1;
  perfil: EstadoPerfil;
  compras: EstadoCompras;
};

export type CorpusPersistido = {
  version: 1;
  promociones: EstadoCorpus["promociones"];
  marca: string | null;
  sincronizadoEn: string | null;
};

/** Solo las compras del período en curso llegan al disco (privacidad.md, ADR-010). */
export function aPersistir(s: RootState): Persistido {
  const hoy = fechaArgentina(new Date(s.sesion.ahora));
  return {
    version: 1,
    perfil: s.perfil,
    compras: { lista: comprasDelPeriodo(s.compras.lista, hoy) },
  };
}

export function corpusAPersistir(c: EstadoCorpus): CorpusPersistido {
  return { version: 1, promociones: c.promociones, marca: c.marca, sincronizadoEn: c.sincronizadoEn };
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

/** La forma mínima que el motor necesita de una promo: lo que falte lo rompería al evaluar (spec 009 FR-017). */
function promocionValida(p: unknown): boolean {
  if (!esObjeto(p)) return false;
  const { tarjetas, vigencia, tope } = p;
  return (
    esTexto(p.id) &&
    esTexto(p.titulo) &&
    esTexto(p.bancoId) &&
    typeof p.categoriaId === "number" &&
    typeof p.porcentaje === "number" &&
    esObjeto(tarjetas) &&
    listaDeTextos(tarjetas.debito) &&
    listaDeTextos(tarjetas.credito) &&
    esObjeto(vigencia) &&
    esTexto(vigencia.desde) &&
    esTexto(vigencia.hasta) &&
    esObjeto(tope)
  );
}

/** El corpus de `vuelto.corpus.v1`. `null` = no es válido. */
function corpusValido(x: unknown): EstadoCorpus | null {
  if (!esObjeto(x) || x.version !== 1 || !Array.isArray(x.promociones)) return null;
  if (!textoONull(x.marca) || !textoONull(x.sincronizadoEn)) return null;
  if (!x.promociones.every(promocionValida)) return null;
  return {
    promociones: x.promociones as EstadoCorpus["promociones"],
    marca: x.marca as string | null,
    sincronizadoEn: x.sincronizadoEn as string | null,
    descartadas: 0,
  };
}

function comprasValidas(x: unknown): EstadoCompras | null {
  if (!esObjeto(x) || !Array.isArray(x.lista)) return null;
  const ok = x.lista.every((c) => esObjeto(c) && esTexto(c.id) && esTexto(c.fecha) && typeof c.monto === "number");
  return ok ? { lista: x.lista as EstadoCompras["lista"] } : null;
}

const NADA: Rehidratado = { perfil: null, corpus: null, compras: null, ahora: null };

/** Un corpus guardado que no se puede leer: el usuario ya había sincronizado, así que queda vacío (no el de ejemplo). */
export const CORPUS_VACIO: EstadoCorpus = { promociones: [], marca: null, sincronizadoEn: null, descartadas: 0 };

/** `vuelto.store.v1`. Un `corpus` adentro (de antes de la spec 009) se ignora. */
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
    ...NADA,
    perfil: perfilValido(x.perfil),
    compras: comprasValidas(x.compras),
  };
}

/** `vuelto.corpus.v1`. Si existe pero no se puede leer, el corpus queda vacío con la marca en `null`. */
export function leerCorpus(raw: string | null): EstadoCorpus | null {
  if (raw === null) return null;
  try {
    return corpusValido(JSON.parse(raw)) ?? CORPUS_VACIO;
  } catch {
    return CORPUS_VACIO;
  }
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
  return async (dispatch, getState, { almacenamiento, reloj }) => {
    let partes = NADA;
    let migrado = false;
    try {
      partes = leerPersistido(await almacenamiento.getItem(CLAVE));
      if (partes === NADA) {
        partes = leerPerfilViejo(await almacenamiento.getItem(CLAVE_VIEJA));
        migrado = partes.perfil !== null;
      }
      partes = { ...partes, corpus: leerCorpus(await almacenamiento.getItem(CLAVE_CORPUS)) };
    } catch {
      // Sin almacenamiento la app funciona en memoria (spec 008, Edge Cases).
    }
    // Con un corpus ya sincronizado el reloj es el real desde este mismo tick (spec 009 FR-016).
    if (partes.corpus?.marca != null) partes = { ...partes, ahora: reloj().toISOString() };
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
  // Cerrar sesión vuelve al modo de ejemplo: el corpus guardado se borra, o al reabrir volvería el real
  // junto a las compras de ejemplo.
  listener.startListening({
    actionCreator: sesionCerrada,
    effect: async () => {
      await almacenamiento.removeItem(CLAVE_CORPUS).catch(() => undefined);
    },
  });
  // El corpus en su propia clave, y solo el que viene de una sincronización real: el de ejemplo no se guarda.
  listener.startListening({
    predicate: (accion, actual, previo) =>
      actual.sesion.hidratado &&
      !rehidratado.match(accion) &&
      actual.corpus !== previo.corpus &&
      actual.corpus.marca !== null,
    effect: async (_accion, api) => {
      try {
        await almacenamiento.setItem(CLAVE_CORPUS, JSON.stringify(corpusAPersistir(api.getState().corpus)));
      } catch {
        // Si el corpus no entra, la marca guardada no avanza: la próxima apertura vuelve a bajarlo.
      }
    },
  });
}
