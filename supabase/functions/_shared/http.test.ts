import { describe, expect, it } from "vitest";
import { respuestaError, type CodigoError } from "./http.ts";

describe("respuestaError", () => {
  const casos: [CodigoError, number][] = [
    ["no_autenticado", 401],
    ["metodo_no_permitido", 405],
    ["perfil_sin_medios", 422],
    ["interno", 500],
    // Lectura del ticket (spec 013, research R6).
    ["formato_no_soportado", 415],
    ["imagen_demasiado_grande", 413],
    ["imagen_danada", 422],
    ["ticket_ilegible", 422],
    ["tardo_demasiado", 504],
    ["no_disponible", 503],
  ];

  it.each(casos)("%s responde %i con solo el código", async (codigo, estado) => {
    const r = respuestaError(codigo);
    expect(r.status).toBe(estado);
    expect(await r.json()).toEqual({ error: codigo });
  });

  it("invalido responde 400 con el campo que falló", async () => {
    const r = respuestaError("invalido", "imagen");
    expect(r.status).toBe(400);
    expect(await r.json()).toEqual({ error: "invalido", campo: "imagen" });
  });
});
