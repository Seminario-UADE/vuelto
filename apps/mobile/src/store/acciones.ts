/**
 * Acciones que atienden varios slices. Viven acá para que los slices no se importen entre sí.
 */
import { createAction } from "@reduxjs/toolkit";
import type { Compra, Promocion } from "@vuelto/motor";
import type { ComercioHabitual, MedioDePago as MedioGuardado } from "../perfil/modelo";

export type { ComercioHabitual, MedioGuardado };

/** Escenarios para probar estados vacíos y de error (solo desarrollo, en Perfil). */
export type Escenario = "normal" | "mes-vacio" | "ticket-ilegible";

export type EstadoPerfil = {
  /** Lo elige el usuario; nunca es el email (ADR-008). */
  nombre: string | null;
  onboardingCompleto: boolean;
  /**
   * Los medios de `medios_de_pago` del usuario, tal como los devolvió Supabase (issue #41). El
   * motor los usa directo; las pantallas arman el nombre con `medioVista`.
   */
  medios: MedioGuardado[];
  /** Los de `comercios_habituales` del usuario (issue #47): se eligen con un toque en «¿Con qué pago?». */
  comercios: ComercioHabitual[];
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
  /** Compras con la forma del motor, la más nueva primero. Las pendientes de subir viven en la cola de #44. */
  lista: Compra[];
};

/**
 * Lo que se leyó del dispositivo, ya validado parte por parte (data-model.md §Persistencia).
 * Una parte `null` no estaba o no era válida: ese slice queda como está.
 */
export type Rehidratado = {
  perfil: EstadoPerfil | null;
  corpus: EstadoCorpus | null;
  compras: EstadoCompras | null;
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
  /** La lista de compras ya reconciliada con lo local (`reconciliarCompras`), la más nueva primero. */
  compras: Compra[];
  /** El reloj real al terminar (ISO). */
  ahora: string;
};
export const sincronizado = createAction<Sincronizado>("store/sincronizado");

/**
 * Cerrar sesión (o sesión vencida): todo vuelve al estado inicial, el de ejemplo (perfil, corpus,
 * compras y reloj), salvo lo ya leído del dispositivo (`hidratado`, `authLista`).
 */
export const sesionCerrada = createAction("store/sesionCerrada");

/** "Mes sin compras" vacía las compras; los otros vuelven a las de ejemplo. */
export const escenarioElegido = createAction<Escenario>("store/escenarioElegido");
