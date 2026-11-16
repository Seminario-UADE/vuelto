/**
 * Respuestas HTTP comunes de las Edge Functions. Contratos de errores:
 * `specs/004-recomendar-pantalla/contracts/recomendar.md` (FR-022) y
 * `specs/013-extraer-ticket/contracts/extraer-ticket.md` (FR-014).
 */

export type CodigoError =
  | "invalido"
  | "no_autenticado"
  | "perfil_sin_medios"
  | "contacto_no_vinculado"
  | "metodo_no_permitido"
  | "interno"
  // Lectura del ticket (spec 013).
  | "formato_no_soportado"
  | "imagen_demasiado_grande"
  | "imagen_danada"
  | "ticket_ilegible"
  | "tardo_demasiado"
  | "no_disponible";

const STATUS: Record<CodigoError, number> = {
  invalido: 400,
  no_autenticado: 401,
  metodo_no_permitido: 405,
  contacto_no_vinculado: 409,
  perfil_sin_medios: 422,
  interno: 500,
  formato_no_soportado: 415,
  imagen_demasiado_grande: 413,
  imagen_danada: 422,
  ticket_ilegible: 422,
  tardo_demasiado: 504,
  no_disponible: 503,
};

/**
 * CORS para la versión web de la app: el navegador consulta antes (`OPTIONS`) si el servicio
 * acepta el pedido y, si no ve estos encabezados, lo bloquea. Origen `*`: la sesión viaja en el
 * encabezado `Authorization`, no en cookies. Los encabezados son los de
 * `@supabase/supabase-js/cors` (un test controla que sigan iguales); no se importa de ahí porque
 * este archivo corre en Deno.
 */
export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-retry-count, traceparent, tracestate, baggage",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
} as const;

/** La respuesta a la consulta previa del navegador. */
export function respuestaPreflight(): Response {
  return new Response(null, { status: 204, headers: CORS });
}

export function respuestaJson(status: number, cuerpo: unknown): Response {
  return new Response(JSON.stringify(cuerpo), {
    status,
    headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" },
  });
}

/** `campo` solo viaja con `invalido`: dice qué dato del pedido falló. */
export function respuestaError(codigo: CodigoError, campo: string | null = null): Response {
  const cuerpo = codigo === "invalido" ? { error: codigo, campo } : { error: codigo };
  return respuestaJson(STATUS[codigo], cuerpo);
}
