/**
 * Respuestas HTTP comunes de las Edge Functions. Contrato de errores:
 * `specs/004-recomendar-pantalla/contracts/recomendar.md` (FR-022).
 */

export type CodigoError =
  | "invalido"
  | "no_autenticado"
  | "perfil_sin_medios"
  | "metodo_no_permitido"
  | "interno";

const STATUS: Record<CodigoError, number> = {
  invalido: 400,
  no_autenticado: 401,
  metodo_no_permitido: 405,
  perfil_sin_medios: 409,
  interno: 500,
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
