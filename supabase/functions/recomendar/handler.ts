/**
 * Handler de `POST /functions/v1/recomendar` (rol de controller, ADR-009).
 * HTTP, sesión, validación del body y códigos de respuesta; el cálculo es del
 * servicio. Contrato: `specs/004-recomendar-pantalla/contracts/recomendar.md`.
 */
import { PerfilSinMediosError } from "@vuelto/motor";
import type { Autenticador } from "../_shared/autenticar.ts";
import { CategoriaInexistenteError } from "../_shared/errores.ts";
import { respuestaError, respuestaJson } from "../_shared/http.ts";
import { validarCompraPropuesta } from "../_shared/validacion.ts";
import type { ServicioRecomendacion } from "./servicio.ts";

export interface DependenciasRecomendar {
  autenticador: Autenticador;
  /** Arma el servicio con un cliente de Supabase que usa la sesión de este pedido (RLS). */
  crearServicio: (req: Request) => ServicioRecomendacion;
  /** Hora actual. Inyectada para testear bordes de día y de mes. */
  reloj: () => Date;
}

export function crearHandlerRecomendar(deps: DependenciasRecomendar): (req: Request) => Promise<Response> {
  return async (req) => {
    if (req.method !== "POST") return respuestaError("metodo_no_permitido");

    let usuarioId: string | null;
    try {
      usuarioId = await deps.autenticador.usuarioDe(req);
    } catch (error) {
      // Auth caído no es "sesión vencida": la app muestra "Probá de nuevo" (FR-016).
      return errorInterno(error);
    }
    if (usuarioId === null) return respuestaError("no_autenticado");

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return respuestaError("invalido", "body");
    }
    const validacion = validarCompraPropuesta(body);
    if (!validacion.ok) return respuestaError("invalido", validacion.campo);

    try {
      const recomendacion = await deps.crearServicio(req).recomendar(usuarioId, validacion.compra, deps.reloj());
      return respuestaJson(200, recomendacion);
    } catch (error) {
      if (error instanceof CategoriaInexistenteError) return respuestaError("invalido", "categoriaId");
      if (error instanceof PerfilSinMediosError) return respuestaError("perfil_sin_medios");
      return errorInterno(error);
    }
  };
}

/** 500 genérico. Se registra solo el tipo de error: el mensaje puede traer datos de filas (FR-023). */
function errorInterno(error: unknown): Response {
  console.error("recomendar:", error instanceof Error ? error.name : "desconocido");
  return respuestaError("interno");
}
