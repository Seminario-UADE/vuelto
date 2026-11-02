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
  /** Cuándo se cargó (ISO). Con los datos de ejemplo, el instante del reloj fijo. */
  cargadoEn: string | null;
};

export type EstadoCompras = {
  /** Compras con la forma del motor, la más nueva primero. */
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
  cuenta: { valor: Cuenta } | null;
};

export const rehidratado = createAction<Rehidratado>("store/rehidratado");

/** Cerrar sesión: todo vuelve al estado inicial salvo el reloj. */
export const sesionCerrada = createAction("store/sesionCerrada");

/** "Mes sin compras" vacía las compras; los otros vuelven a las de ejemplo. */
export const escenarioElegido = createAction<Escenario>("store/escenarioElegido");
