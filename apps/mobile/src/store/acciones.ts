/**
 * Acciones que atienden varios slices. Viven acá para que los slices no se importen entre sí.
 */
import { createAction } from "@reduxjs/toolkit";
import type { Compra, Promocion } from "@vuelto/motor";

export type Cuenta = { email: string | null; proveedor: "email" | "apple" } | null;

/** Escenarios para probar estados vacíos y de error (solo desarrollo, en Perfil). */
export type Escenario = "normal" | "mes-vacio" | "ticket-ilegible";

export type EstadoPerfil = {
  /** Lo elige el usuario; nunca es el email (ADR-008). */
  nombre: string | null;
  onboardingCompleto: boolean;
  /** Ids del catálogo de medios de la app. */
  medios: string[];
  /** Ids del catálogo de comercios. */
  comercios: string[];
  /** Invitación abierta antes de terminar el onboarding (ADR-008 §1). */
  invitacionPendiente: string | null;
};

export type EstadoCorpus = {
  promociones: Promocion[];
  /**
   * La mayor `actualizada_en` que recibió la app, como el texto exacto del servidor (spec 009 FR-006).
   * `null` = nunca sincronizó: la app usa las promos y el reloj de ejemplo (FR-016).
   */
  marca: string | null;
  /** Cuándo terminó la última sincronización exitosa (ISO, reloj del sistema). `null` = nunca. */
  sincronizadoEn: string | null;
  /** Filas que la última sincronización descartó por inválidas (diagnóstico, FR-010). */
  descartadas: number;
};

export type EstadoCompras = {
  /** Compras con la forma del motor, la más nueva primero. */
  lista: Compra[];
  /**
   * Ids de compras locales que el servidor todavía no confirmó. Las suma `compraAgregada`; las saca
   * `compraSubida` (la despacha #44). La sincronización nunca las borra (spec 009 FR-015).
   */
  pendientes: string[];
  /** `auth.uid()` dueño de `lista`. `null` = datos de ejemplo o nunca sincronizó. */
  duenoId: string | null;
};

/**
 * Lo que se leyó del dispositivo, ya validado parte por parte (data-model.md §Persistencia).
 * Una parte `null` no estaba o no era válida: ese slice queda como está.
 */
export type Rehidratado = {
  perfil: EstadoPerfil | null;
  corpus: EstadoCorpus | null;
  compras: EstadoCompras | null;
  cuenta: { valor: Cuenta } | null;
  /** El reloj real (ISO), cuando el corpus guardado ya viene de una sincronización (FR-016). */
  ahora: string | null;
};

export const rehidratado = createAction<Rehidratado>("store/rehidratado");

/**
 * El resultado de una sincronización completa (spec 009): lo atienden `corpus`, `compras` y `sesion`
 * en el mismo tick, así el reloj cambia en la misma acción que la marca.
 */
export type Sincronizado = {
  corpus: EstadoCorpus;
  /** Las compras del período del servidor, de la más vieja a la más nueva (orden `creada_en`). */
  compras: Compra[];
  /** Inicio del período: lo anterior sale de `compras.lista`, salvo las pendientes. */
  desde: string;
  usuarioId: string;
  /** El reloj real al terminar (ISO). */
  ahora: string;
};
export const sincronizado = createAction<Sincronizado>("store/sincronizado");

/** El servidor confirmó una compra local: sale de `pendientes` (la despacha #44, spec 009). */
export const compraSubida = createAction<string>("store/compraSubida");

/** Cerrar sesión: todo vuelve al estado inicial salvo el reloj. */
export const sesionCerrada = createAction("store/sesionCerrada");

/** "Mes sin compras" vacía las compras; los otros vuelven a las de ejemplo. */
export const escenarioElegido = createAction<Escenario>("store/escenarioElegido");
