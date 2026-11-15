/**
 * Sin medios de pago no hay con qué recomendar (RF-01). La Edge Function lo
 * distingue con `instanceof` y le pide al usuario que cargue uno.
 *
 * Las clases del motor son solo errores: no son datos del dominio ni viajan
 * como JSON (ADR-009).
 */
export class PerfilSinMediosError extends Error {
  constructor() {
    super("El perfil no tiene medios de pago: no se puede recomendar.");
    this.name = "PerfilSinMediosError";
  }
}

/** Por qué un grupo no se puede evaluar (spec 013, FR-010). */
export type MotivoGrupoInvalido =
  | "pocos_integrantes"
  | "sin_quien_pide"
  | "varios_piden"
  | "repetidos"
  | "demasiados"
  | "monto"
  | "posicion";

/**
 * Un grupo que no cumple FR-010. La Edge Function lo distingue con
 * `instanceof` y responde 400 (la validación del pedido ya lo evita).
 */
export class GrupoInvalidoError extends Error {
  // Campo explícito, sin parameter property: el código se ejecuta también quitando tipos.
  readonly motivo: MotivoGrupoInvalido;

  constructor(motivo: MotivoGrupoInvalido) {
    super(`Grupo inválido: ${motivo}.`);
    this.motivo = motivo;
    this.name = "GrupoInvalidoError";
  }
}
