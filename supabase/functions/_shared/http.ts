/**
 * Respuestas HTTP comunes de las Edge Functions. Contratos de errores:
 * `specs/004-recomendar-pantalla/contracts/recomendar.md` (FR-022) y
 * `specs/013-extraer-ticket/contracts/extraer-ticket.md` (FR-014).
 */

export type CodigoError =
  | "invalido"
  | "no_autenticado"
  | "perfil_sin_medios"
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
  perfil_sin_medios: 422,
  interno: 500,
  formato_no_soportado: 415,
  imagen_demasiado_grande: 413,
  imagen_danada: 422,
  ticket_ilegible: 422,
  tardo_demasiado: 504,
  no_disponible: 503,
};

export function respuestaJson(status: number, cuerpo: unknown): Response {
  return new Response(JSON.stringify(cuerpo), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

/** `campo` solo viaja con `invalido`: dice qué dato del pedido falló. */
export function respuestaError(codigo: CodigoError, campo: string | null = null): Response {
  const cuerpo = codigo === "invalido" ? { error: codigo, campo } : { error: codigo };
  return respuestaJson(STATUS[codigo], cuerpo);
}
