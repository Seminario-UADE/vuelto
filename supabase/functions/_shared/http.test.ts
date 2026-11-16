import { corsHeaders } from "@supabase/supabase-js/cors";
import { describe, expect, it } from "vitest";
import { CORS, respuestaError, respuestaJson, respuestaPreflight, type CodigoError } from "./http.ts";

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

describe("CORS (la versión web de la app, en el navegador)", () => {
  it("deja pasar los encabezados que manda supabase-js, desde cualquier origen", () => {
    // La lista oficial del SDK: si suma un encabezado, este test avisa que hay que sumarlo acá.
    expect(CORS["Access-Control-Allow-Headers"]).toBe(corsHeaders["Access-Control-Allow-Headers"]);
    expect(CORS["Access-Control-Allow-Origin"]).toBe("*");
    expect(CORS["Access-Control-Allow-Methods"]).toBe("POST, OPTIONS");
  });

  it("la consulta previa del navegador responde 204 con los encabezados, sin cuerpo", async () => {
    const r = respuestaPreflight();
    expect(r.status).toBe(204);
    expect(r.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(await r.text()).toBe("");
  });

  it("las respuestas JSON y los errores llevan los encabezados", () => {
    expect(respuestaJson(200, {}).headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(respuestaError("no_autenticado").headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(respuestaJson(200, {}).headers.get("Content-Type")).toBe("application/json; charset=utf-8");
  });
});
