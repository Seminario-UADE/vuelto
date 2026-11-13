/**
 * Handler de `POST /functions/v1/extraer-ticket` (rol de controller, ADR-009).
 * HTTP, sesión, validación del pedido y códigos de respuesta; la lectura es del
 * servicio. Contrato: `specs/013-extraer-ticket/contracts/extraer-ticket.md`.
 *
 * Registros (FR-013): una sola línea por pedido, con el resultado, la duración
 * y, si hace falta para diagnosticar, un dato sin contenido del ticket. Nunca la
 * imagen, el texto ni un valor leído.
 */
import type { Autenticador } from "../_shared/autenticar.ts";
import { respuestaError, respuestaJson, type CodigoError } from "../_shared/http.ts";
import {
  ExtractorNoDisponibleError,
  ExtractorRechazoError,
  ExtractorTiempoAgotadoError,
  RespuestaFueraDeEsquemaError,
} from "./extractor.ts";
import { validarPedidoImagen } from "./imagen.ts";
import { TicketIlegibleError, type ServicioLecturaTicket } from "./servicio.ts";

export interface DependenciasExtraerTicket {
  autenticador: Autenticador;
  /** Un servicio por pedido: el extractor guarda el uso del último pedido y no se comparte. */
  crearServicio: () => Pick<ServicioLecturaTicket, "leer">;
  /** Reloj en milisegundos, para la duración que va al registro. */
  ahora: () => number;
  /**
   * Límite del pedido completo, incluidas la sesión y la lectura del cuerpo
   * (FR-015: se responde siempre en menos de 25 s). El de Groq (20 s) va adentro.
   */
  limiteMs: number;
}

/** El código para la app y, aparte, el dato para el registro (sin contenido del ticket). */
function traducirError(error: unknown): { codigo: CodigoError; detalle: string } {
  if (error instanceof TicketIlegibleError) return { codigo: "ticket_ilegible", detalle: "sin monto, comercio ni fecha" };
  if (error instanceof RespuestaFueraDeEsquemaError) {
    return { codigo: "ticket_ilegible", detalle: `${error.camino} ${error.regla}`.trim() };
  }
  if (error instanceof ExtractorTiempoAgotadoError) return { codigo: "tardo_demasiado", detalle: "" };
  if (error instanceof ExtractorNoDisponibleError) {
    return { codigo: "no_disponible", detalle: error.estado === null ? "sin conexión" : `groq ${error.estado}` };
  }
  if (error instanceof ExtractorRechazoError) return { codigo: "interno", detalle: `groq ${error.estado}` };
  // Solo el tipo de error: el mensaje puede traer datos.
  return { codigo: "interno", detalle: error instanceof Error ? error.name : "desconocido" };
}

export function crearHandlerExtraerTicket(deps: DependenciasExtraerTicket): (req: Request) => Promise<Response> {
  return async (req) => {
    const inicio = deps.ahora();
    // Una sola línea por pedido, aunque el pedido termine después del límite.
    let registrado = false;
    const registrar = (resultado: string, detalle = "") => {
      if (registrado) return;
      registrado = true;
      const linea = `extraer-ticket: ${resultado} ${deps.ahora() - inicio}ms${detalle ? ` ${detalle}` : ""}`;
      if (resultado === "ok") console.log(linea);
      else console.error(linea);
    };
    const fallar = (codigo: CodigoError, detalle = "", campo: string | null = null) => {
      registrar(codigo, detalle);
      return respuestaError(codigo, campo);
    };

    if (req.method !== "POST") return fallar("metodo_no_permitido");

    let corte: ReturnType<typeof setTimeout> | undefined;
    const limite = new Promise<Response>((responder) => {
      corte = setTimeout(() => responder(fallar("tardo_demasiado", "límite del pedido")), deps.limiteMs);
    });
    try {
      return await Promise.race([atender(req, deps, registrar, fallar), limite]);
    } finally {
      clearTimeout(corte);
    }
  };
}

async function atender(
  req: Request,
  deps: DependenciasExtraerTicket,
  registrar: (resultado: string) => void,
  fallar: (codigo: CodigoError, detalle?: string, campo?: string | null) => Response,
): Promise<Response> {
  let usuarioId: string | null;
  try {
    usuarioId = await deps.autenticador.usuarioDe(req);
  } catch (error) {
    // Auth caído no es "sesión vencida": la app ofrece probar de nuevo, no volver a iniciar sesión.
    return fallar("interno", error instanceof Error ? error.name : "desconocido");
  }
  if (usuarioId === null) return fallar("no_autenticado");

  let cuerpo: unknown;
  try {
    cuerpo = await req.json();
  } catch {
    return fallar("invalido", "body", "body");
  }
  const pedido = validarPedidoImagen(cuerpo);
  if (!pedido.ok) return fallar(pedido.codigo, pedido.campo ?? "", pedido.campo);

  try {
    const lectura = await deps.crearServicio().leer(pedido.bytes, pedido.tipo);
    registrar("ok");
    return respuestaJson(200, lectura);
  } catch (error) {
    const { codigo, detalle } = traducirError(error);
    return fallar(codigo, detalle);
  }
}
