/**
 * Servicio de la lectura del ticket (ADR-009, spec 013): llama al extractor,
 * convierte lo impreso a los valores del producto, tapa los datos personales
 * del texto y arma la respuesta. No sabe de HTTP ni de sesiones: eso es del
 * handler.
 */
import { fechaArgentina, type FechaISO, type Red, type TipoTarjeta } from "@vuelto/motor";
import type { Extractor, LecturaCruda, TipoImagen } from "./extractor.ts";
import {
  normalizarFecha,
  normalizarImporte,
  normalizarRed,
  normalizarTexto,
  normalizarTipo,
  normalizarUltimos4,
} from "./normalizar.ts";
import { recortar, taparDatosPersonales } from "./privacidad.ts";

/** Lo que devuelve el servicio (`contracts/extraer-ticket.md`). Lo ausente es `null`. */
export interface LecturaTicket {
  monto: number | null;
  comercio: string | null;
  fecha: FechaISO | null;
  /** Lo que dice el ticket, no una tarjeta del perfil: el cruce es de la app (#49). */
  medio: {
    banco: string | null;
    tipo: TipoTarjeta | null;
    red: Red | null;
    ultimos4: string | null;
  };
  /** Con los datos personales tapados y recortado (FR-012). Es lo que la app guarda con la compra. */
  textoExtraido: string;
}

/** Sin monto, comercio ni fecha, la lectura no sirve para registrar una compra (FR-009). */
export class TicketIlegibleError extends Error {
  constructor() {
    super("No se encontró monto, comercio ni fecha en el ticket.");
    this.name = "TicketIlegibleError";
  }
}

export class LectorDeTickets {
  constructor(
    private readonly extractor: Extractor,
    /** Hora actual, para saber qué es "hoy en Argentina" (FR-008). */
    private readonly reloj: () => Date,
  ) {}

  async leer(imagen: Uint8Array, tipo: TipoImagen): Promise<LecturaTicket> {
    const cruda = await this.extractor.leer(imagen, tipo);
    const lectura = this.convertir(cruda, fechaArgentina(this.reloj()));
    if (lectura.monto === null && lectura.comercio === null && lectura.fecha === null) {
      throw new TicketIlegibleError();
    }
    return lectura;
  }

  private convertir(cruda: LecturaCruda, hoy: FechaISO): LecturaTicket {
    return {
      monto: normalizarImporte(cruda.montoImpreso),
      comercio: normalizarTexto(cruda.comercio),
      fecha: normalizarFecha(cruda.fechaImpresa, hoy),
      medio: {
        banco: normalizarTexto(cruda.medio.bancoImpreso),
        tipo: normalizarTipo(cruda.medio.tipoImpreso),
        red: normalizarRed(cruda.medio.redImpresa),
        ultimos4: normalizarUltimos4(cruda.medio.ultimos4Impresos),
      },
      // Primero se tapa y después se recorta: una tarjeta en el borde no queda partida (FR-012).
      textoExtraido: recortar(taparDatosPersonales(cruda.texto ?? "")),
    };
  }
}
