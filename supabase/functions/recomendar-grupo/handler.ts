/**
 * Handler de `POST /functions/v1/recomendar-grupo` (rol de controller, ADR-009): HTTP, sesión,
 * validación del body y códigos de respuesta. El caso de uso es del servicio. Contrato:
 * `specs/013-gasto-grupo/contracts/recomendar-grupo.md`.
 */
import { GrupoInvalidoError } from "@vuelto/motor";
import type { Autenticador } from "../_shared/autenticar.ts";
import { CategoriaInexistenteError, ContactoNoVinculadoError } from "../_shared/errores.ts";
import { respuestaError, respuestaJson } from "../_shared/http.ts";
import type { ServicioGrupo } from "./servicio.ts";
import { validarPedidoGrupo } from "./validacion.ts";

export interface DependenciasRecomendarGrupo {
  autenticador: Autenticador;
  /** Arma el servicio con un cliente de Supabase que usa la sesión de este pedido (RLS). */
  crearServicio: (req: Request) => ServicioGrupo;
  /** Hora actual, inyectada (FR-025). */
  reloj: () => Date;
}

export function crearHandlerRecomendarGrupo(deps: DependenciasRecomendarGrupo): (req: Request) => Promise<Response> {
  return async (req) => {
    if (req.method !== "POST") return respuestaError("metodo_no_permitido");

    let usuarioId: string | null;
    try {
      usuarioId = await deps.autenticador.usuarioDe(req);
    } catch (error) {
      return errorInterno(error);
    }
    if (usuarioId === null) return respuestaError("no_autenticado");

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return respuestaError("invalido", "body");
    }
    const validacion = validarPedidoGrupo(body, usuarioId);
    if (!validacion.ok) return respuestaError("invalido", validacion.campo);

    try {
      const respuesta = await deps.crearServicio(req).recomendar(usuarioId, validacion.pedido, deps.reloj());
      return respuestaJson(200, respuesta);
    } catch (error) {
      if (error instanceof CategoriaInexistenteError) return respuestaError("invalido", "compra.categoriaId");
      if (error instanceof GrupoInvalidoError) return respuestaError("invalido", "grupo");
      if (error instanceof ContactoNoVinculadoError) return respuestaError("contacto_no_vinculado");
      return errorInterno(error);
    }
  };
}

/** 500 genérico. Se registra solo el tipo de error: el mensaje puede traer datos de un contacto (FR-034). */
function errorInterno(error: unknown): Response {
  console.error("recomendar-grupo:", error instanceof Error ? error.name : "desconocido");
  return respuestaError("interno");
}
