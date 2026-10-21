/**
 * Sin medios de pago no hay con qué recomendar (RF-01). La Edge Function lo
 * distingue con `instanceof` y le pide al usuario que cargue uno.
 *
 * Es la única clase del motor: no es un dato del dominio, no viaja como
 * JSON (ADR-009).
 */
export class PerfilSinMediosError extends Error {
  constructor() {
    super("El perfil no tiene medios de pago: no se puede recomendar.");
    this.name = "PerfilSinMediosError";
  }
}
