/**
 * El proveedor que lee la foto del ticket, detrás de una interfaz propia
 * (ADR-009, ADR-012, spec 013 FR-016). Cambiar de proveedor es otra
 * implementación de `Extractor`: el contrato, la validación y el tapado de
 * datos personales no cambian.
 */

export type TipoImagen = "image/jpeg" | "image/png" | "image/webp";

/** El medio de pago tal como está impreso en el ticket. */
export interface MedioImpreso {
  bancoImpreso: string | null;
  tipoImpreso: string | null;
  redImpresa: string | null;
  ultimos4Impresos: string | null;
}

/**
 * Lo que devuelve el proveedor: cada dato como texto, tal como está impreso,
 * sin convertir (research R2). `null` si el ticket no lo dice.
 */
export interface LecturaCruda {
  montoImpreso: string | null;
  comercio: string | null;
  fechaImpresa: string | null;
  medio: MedioImpreso;
  /** Transcripción del ticket, con `[DATO PERSONAL]` donde el proveedor reconoció uno (FR-011). */
  texto: string | null;
}

export interface Extractor {
  leer(imagen: Uint8Array, tipo: TipoImagen): Promise<LecturaCruda>;
}

/** El proveedor no contestó a tiempo (FR-015). */
export class ExtractorTiempoAgotadoError extends Error {
  constructor() {
    super("El lector del ticket no contestó a tiempo.");
    this.name = "ExtractorTiempoAgotadoError";
  }
}

/**
 * El proveedor está caído, sin conexión o rechazó por límite de uso. `estado`
 * es el HTTP de Groq (`null` si no hubo respuesta); `causa`, el tipo de falla
 * de conexión o el mensaje de Groq (qué límite se superó); `reintentarEn`, los
 * segundos que pide esperar Groq ante un 429. Ninguno trae datos del ticket.
 */
export class ExtractorNoDisponibleError extends Error {
  constructor(
    readonly estado: number | null,
    readonly causa: string | null = null,
    readonly reintentarEn: number | null = null,
  ) {
    super("El lector del ticket no está disponible.");
    this.name = "ExtractorNoDisponibleError";
  }
}

/**
 * La respuesta no es JSON o no cumple el esquema. Lleva el camino del campo y
 * la regla que falló, nunca el valor: va a los registros (FR-013).
 */
export class RespuestaFueraDeEsquemaError extends Error {
  constructor(
    readonly camino: string,
    readonly regla: string,
  ) {
    super(`La respuesta del lector no cumple el esquema: ${camino} (${regla}).`);
    this.name = "RespuestaFueraDeEsquemaError";
  }
}

/** Cualquier otro rechazo del proveedor: el pedido ya se validó antes, así que es un error nuestro. */
export class ExtractorRechazoError extends Error {
  constructor(readonly estado: number) {
    super(`El lector del ticket rechazó el pedido (${estado}).`);
    this.name = "ExtractorRechazoError";
  }
}
