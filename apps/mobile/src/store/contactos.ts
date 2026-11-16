/**
 * Contactos vinculados (spec 016 US2, ADR-008): solo lo que ADR-008 §3 deja ver (nombre y fecha
 * del vínculo). La lista sale del servidor y arranca vacía (G-02). Se guarda en el teléfono con
 * su propia clave, asociada a la cuenta: otra cuenta en el mismo teléfono no la ve, ni sin red, y
 * cerrar sesión la borra (FR-019, G-03).
 */
import { createSlice, type ListenerMiddlewareInstance, type PayloadAction } from "@reduxjs/toolkit";
import { fechaArgentina } from "@vuelto/motor";
import type { Contacto, VistaInvitacion } from "../data/contracts";
import { vistaDeInvitacion } from "../grupo/invitacion";
import type { ContactoRemoto, InvitacionCreada, ResultadoAceptar } from "../grupo/repositorio";
import { iniciales } from "../lib/format";
import { sesionCerrada } from "./acciones";
import type { AppThunk, RootState } from "./index";
import type { Almacenamiento } from "./persistencia";
import { usuarioCambio } from "./sesion";

export const CLAVE_CONTACTOS = "vuelto.contactos.v1";

export type EstadoContactos = {
  /** De qué cuenta es `lista`. */
  cuentaId: string | null;
  lista: Contacto[];
  estado: "inicial" | "cargando" | "listo" | "error";
  /** Ya se leyó lo guardado. Antes, no se escribe nada (no se pisa). */
  hidratada: boolean;
  /**
   * La última invitación creada, para volver a mostrarla al abrir Invitar sin invalidar el link
   * que ya se mandó (FR-011: generar otra borra la anterior). Solo en memoria: nunca se guarda.
   */
  invitacion: InvitacionCreada | null;
};

const inicial: EstadoContactos = { cuentaId: null, lista: [], estado: "inicial", hidratada: false, invitacion: null };

/**
 * Del contacto que da el servidor al de la app. Sin nombre para mostrar se dice «Contacto». La
 * fecha del vínculo es la de Argentina: el servidor la da en UTC, y a las 23 h ya es el día siguiente.
 */
export function aContacto(c: ContactoRemoto): Contacto {
  const nombre = c.nombre ?? "Contacto";
  const instante = Date.parse(c.vinculadoDesde);
  const vinculadoDesde = Number.isNaN(instante) ? c.vinculadoDesde.slice(0, 10) : fechaArgentina(new Date(instante));
  return { id: c.id, nombre, iniciales: iniciales(nombre) || "?", vinculadoDesde };
}

export const contactos = createSlice({
  name: "contactos",
  initialState: inicial,
  reducers: {
    cargaDeContactos(s, a: PayloadAction<EstadoContactos["estado"]>) {
      s.estado = a.payload;
    },
    contactosCargados(s, a: PayloadAction<{ cuentaId: string; lista: Contacto[] }>) {
      s.cuentaId = a.payload.cuentaId;
      s.lista = a.payload.lista;
      s.estado = "listo";
    },
    contactoAgregado(s, a: PayloadAction<Contacto>) {
      s.lista = [...s.lista.filter((c) => c.id !== a.payload.id), a.payload];
    },
    invitacionCreada(s, a: PayloadAction<InvitacionCreada | null>) {
      s.invitacion = a.payload;
    },
    contactoQuitado(s, a: PayloadAction<string>) {
      s.lista = s.lista.filter((c) => c.id !== a.payload);
    },
    /** Lo leído del dispositivo. Si ya se cargó del servidor, gana el servidor. */
    rehidratadoContactos(s, a: PayloadAction<{ cuentaId: string; lista: Contacto[] } | null>) {
      if (a.payload && s.estado !== "listo" && (s.cuentaId === null || s.cuentaId === a.payload.cuentaId)) {
        s.cuentaId = a.payload.cuentaId;
        s.lista = a.payload.lista;
      }
      s.hidratada = true;
    },
  },
  extraReducers: (b) => {
    // Otra cuenta (o ninguna): la lista de la anterior no se muestra (US2-16).
    b.addCase(usuarioCambio, (s, a) => {
      const id = a.payload?.id ?? null;
      if (id !== s.cuentaId) return { ...inicial, cuentaId: id, hidratada: s.hidratada };
      return s;
    });
    b.addCase(sesionCerrada, (s) => ({ ...inicial, hidratada: s.hidratada }));
  },
});

export const {
  cargaDeContactos,
  contactosCargados,
  contactoAgregado,
  contactoQuitado,
  invitacionCreada,
  rehidratadoContactos,
} = contactos.actions;

// ─── Thunks ─────────────────────────────────────────────────────────────────────

/**
 * Trae la lista del servidor: al entrar una cuenta, al volver a primer plano y al entrar a
 * Contactos (FR-019). Sin cuenta o sin Supabase no hace nada; si falla, la lista queda como estaba.
 */
export function cargarContactos(): AppThunk<Promise<void>> {
  return async (dispatch, getState, { contactosRemoto }) => {
    const cuentaId = getState().sesion.usuario?.id ?? null;
    if (!contactosRemoto || cuentaId === null) return;
    dispatch(cargaDeContactos("cargando"));
    try {
      const lista = (await contactosRemoto.listar()).map(aContacto);
      // La cuenta pudo cambiar mientras se esperaba la respuesta: no se mezclan listas.
      if (getState().sesion.usuario?.id !== cuentaId) return;
      dispatch(contactosCargados({ cuentaId, lista }));
    } catch {
      dispatch(cargaDeContactos("error"));
    }
  };
}

/** Quita el vínculo en el servidor y recién entonces de la lista local (US2-15). Si falla, lanza. */
export function quitarContacto(id: string): AppThunk<Promise<void>> {
  return async (dispatch, _getState, { contactosRemoto }) => {
    if (!contactosRemoto) throw new Error(SIN_CUENTA);
    await contactosRemoto.quitar(id);
    dispatch(contactoQuitado(id));
  };
}

/** Sin Supabase no hay cuenta ni contactos (spec 006 FR-028): se avisa en vez de simular. */
const SIN_CUENTA = "Necesitás conexión con tu cuenta para esto.";

/**
 * La invitación para mostrar en Invitar. Si la última sigue vigente y no se pidió otra, es la
 * misma: abrir Invitar no invalida el link que ya se mandó (US2-2). «Generar otro link» pasa
 * `nueva` y la base borra la anterior. Lanza `SinNombreError` o el error de red.
 */
export function crearInvitacion(nueva = false): AppThunk<Promise<InvitacionCreada>> {
  return async (dispatch, getState, { contactosRemoto, reloj }) => {
    const actual = getState().contactos.invitacion;
    if (!nueva && actual && Date.parse(actual.venceEn) > reloj().getTime()) return actual;
    if (!contactosRemoto) throw new Error(SIN_CUENTA);
    const inv = await contactosRemoto.crearInvitacion();
    dispatch(invitacionCreada(inv));
    return inv;
  };
}

/** Lo que dice la pantalla de aceptación de una invitación. Si falla la red, lanza. */
export function verInvitacion(token: string): AppThunk<Promise<VistaInvitacion>> {
  return async (_dispatch, _getState, { contactosRemoto }) => {
    if (!contactosRemoto) throw new Error(SIN_CUENTA);
    return vistaDeInvitacion(await contactosRemoto.verInvitacion(token));
  };
}

/** Acepta la invitación; si se creó el vínculo, suma el contacto a la lista. Si falla la red, lanza. */
export function aceptarInvitacion(token: string): AppThunk<Promise<ResultadoAceptar>> {
  return async (dispatch, _getState, { contactosRemoto, reloj }) => {
    if (!contactosRemoto) throw new Error(SIN_CUENTA);
    const r = await contactosRemoto.aceptarInvitacion(token);
    if (r.estado === "aceptada") {
      dispatch(contactoAgregado(aContacto({ ...r.contacto, vinculadoDesde: reloj().toISOString() })));
    }
    return r;
  };
}

// ─── Persistencia ──────────────────────────────────────────────────────────────

type Desconocido = Record<string, unknown>;
const esObjeto = (x: unknown): x is Desconocido => typeof x === "object" && x !== null && !Array.isArray(x);
const esTexto = (x: unknown): x is string => typeof x === "string" && x !== "";

function contactoValido(x: unknown): x is Contacto {
  return esObjeto(x) && esTexto(x.id) && esTexto(x.nombre) && typeof x.iniciales === "string" && esTexto(x.vinculadoDesde);
}

/** `null` si no hay nada guardado o no se puede leer. Un contacto inválido se descarta solo. */
export function leerContactos(raw: string | null): { cuentaId: string; lista: Contacto[] } | null {
  if (raw === null) return null;
  let x: unknown;
  try {
    x = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!esObjeto(x) || x.version !== 1 || !esTexto(x.cuentaId) || !Array.isArray(x.lista)) return null;
  return { cuentaId: x.cuentaId, lista: x.lista.filter(contactoValido) };
}

/** Al abrir la app, después de `rehidratar()`: lee la lista guardada (la de otra cuenta se descarta). */
export function iniciarContactos(): AppThunk<Promise<void>> {
  return async (dispatch, getState, { almacenamiento }) => {
    let guardada: { cuentaId: string; lista: Contacto[] } | null = null;
    try {
      guardada = leerContactos(await almacenamiento.getItem(CLAVE_CONTACTOS));
    } catch {
      // Sin almacenamiento la app funciona en memoria.
    }
    const cuentaActual = getState().sesion.usuario?.id ?? null;
    dispatch(rehidratadoContactos(guardada && (cuentaActual === null || guardada.cuentaId === cuentaActual) ? guardada : null));
  };
}

/** Escribe la lista cada vez que cambia, una vez leída. Sin cuenta, borra lo guardado. */
export function escucharPersistenciaContactos(listener: ListenerMiddlewareInstance<RootState>, almacenamiento: Almacenamiento) {
  listener.startListening({
    predicate: (_accion, actual, previo) =>
      actual.contactos.hidratada &&
      (actual.contactos.lista !== previo.contactos.lista ||
        actual.contactos.cuentaId !== previo.contactos.cuentaId ||
        !previo.contactos.hidratada),
    effect: async (_accion, api) => {
      const { cuentaId, lista } = api.getState().contactos;
      try {
        if (cuentaId === null) await almacenamiento.removeItem(CLAVE_CONTACTOS);
        else await almacenamiento.setItem(CLAVE_CONTACTOS, JSON.stringify({ version: 1, cuentaId, lista }));
      } catch {
        // Almacenamiento lleno o no disponible: al abrir se vuelve a pedir al servidor.
      }
    },
  });
}
