import { afterEach, describe, expect, it, vi } from "vitest";
import { ESQUEMA_LECTURA } from "./esquema.ts";
import {
  ExtractorRechazoError,
  ExtractorTiempoAgotadoError,
  RespuestaFueraDeEsquemaError,
  type LecturaCruda,
} from "./extractor.ts";
import { ExtractorGroq, URL_GROQ, MODELO_GROQ } from "./extractor-groq.ts";

const KEY = "clave-de-prueba";
const IMAGEN = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);

const LECTURA: LecturaCruda = {
  montoImpreso: "$ 24.500,00",
  comercio: "SUPERMERCADO LA ESQUINA",
  fechaImpresa: "14/10/26",
  medio: { bancoImpreso: null, tipoImpreso: "DEBITO", redImpresa: "VISA", ultimos4Impresos: "1234" },
  texto: "SUPERMERCADO LA ESQUINA\nTOTAL 24.500,00",
};

function respuestaGroq(contenido: unknown, estado = 200): Response {
  const cuerpo = estado === 200 ? { choices: [{ message: { content: contenido } }] } : { error: { message: "x" } };
  return new Response(JSON.stringify(cuerpo), { status: estado, headers: { "Content-Type": "application/json" } });
}

/** Un `fetch` simulado que guarda el pedido y devuelve `respuesta`. */
function fetchQueDevuelve(respuesta: Response | (() => Promise<Response>)) {
  const llamadas: { url: string; init: RequestInit }[] = [];
  const fn = async (url: string | URL | Request, init?: RequestInit) => {
    llamadas.push({ url: String(url), init: init ?? {} });
    return typeof respuesta === "function" ? respuesta() : respuesta;
  };
  return { fn: fn as typeof fetch, llamadas };
}

function cuerpoDe(init: RequestInit): Record<string, unknown> {
  return JSON.parse(String(init.body)) as Record<string, unknown>;
}

function extractor(f: typeof fetch, modo: "estricto" | "json-libre" = "estricto") {
  return new ExtractorGroq({ key: KEY, modo, fetch: f, limiteMs: 20_000 });
}

afterEach(() => vi.useRealTimers());

describe("ExtractorGroq: el pedido", () => {
  it("va a Groq con la key, el modelo, temperatura 0, la imagen como data URL y el esquema estricto", async () => {
    const { fn, llamadas } = fetchQueDevuelve(respuestaGroq(JSON.stringify(LECTURA)));
    await extractor(fn).leer(IMAGEN, "image/jpeg");

    expect(llamadas).toHaveLength(1);
    const { url, init } = llamadas[0]!;
    expect(url).toBe(URL_GROQ);
    expect(init.method).toBe("POST");
    expect(new Headers(init.headers).get("Authorization")).toBe(`Bearer ${KEY}`);

    const cuerpo = cuerpoDe(init);
    expect(cuerpo["model"]).toBe(MODELO_GROQ);
    expect(cuerpo["temperature"]).toBe(0);
    expect(cuerpo["response_format"]).toEqual({
      type: "json_schema",
      json_schema: { name: "lectura_ticket", strict: true, schema: ESQUEMA_LECTURA },
    });
    const contenido = JSON.stringify(cuerpo["messages"]);
    expect(contenido).toContain(`data:image/jpeg;base64,${btoa(String.fromCharCode(...IMAGEN))}`);
  });

  it("le pide los datos tal como están impresos y tapar nombres, DNI y tarjetas (FR-011)", async () => {
    const { fn, llamadas } = fetchQueDevuelve(respuestaGroq(JSON.stringify(LECTURA)));
    await extractor(fn).leer(IMAGEN, "image/png");
    const instrucciones = JSON.stringify(cuerpoDe(llamadas[0]!.init)["messages"]);
    expect(instrucciones).toContain("tal como");
    expect(instrucciones).toContain("[DATO PERSONAL]");
    expect(instrucciones).toMatch(/nombres/i);
    expect(instrucciones).toMatch(/DNI/);
    expect(instrucciones).toMatch(/últimos 4/);
    // Para el usuario y para cruzar con la compra por confirmar sirve el nombre del local (prueba manual, 10/11).
    expect(instrucciones).toContain("nombre del local");
    expect(instrucciones).toContain("razón social");
    expect(instrucciones).toContain("data:image/png;base64,");
  });

  it("en modo JSON libre pide json_object y manda el esquema en las instrucciones", async () => {
    const { fn, llamadas } = fetchQueDevuelve(respuestaGroq(JSON.stringify(LECTURA)));
    await extractor(fn, "json-libre").leer(IMAGEN, "image/webp");
    const cuerpo = cuerpoDe(llamadas[0]!.init);
    expect(cuerpo["response_format"]).toEqual({ type: "json_object" });
    expect(JSON.stringify(cuerpo["messages"])).toContain("ultimos4Impresos");
  });
});

describe("ExtractorGroq: la respuesta", () => {
  it("una respuesta que cumple el esquema devuelve la lectura", async () => {
    const { fn } = fetchQueDevuelve(respuestaGroq(JSON.stringify(LECTURA)));
    await expect(extractor(fn).leer(IMAGEN, "image/jpeg")).resolves.toEqual(LECTURA);
  });

  it("un contenido que no es JSON o no cumple el esquema es RespuestaFueraDeEsquemaError, sin el valor", async () => {
    const noJson = fetchQueDevuelve(respuestaGroq("esto no es json"));
    await expect(extractor(noJson.fn).leer(IMAGEN, "image/jpeg")).rejects.toMatchObject({
      name: "RespuestaFueraDeEsquemaError",
      camino: "",
      regla: "json",
    });

    const sinCampo = fetchQueDevuelve(respuestaGroq(JSON.stringify({ ...LECTURA, comercio: 99 })));
    const error = await extractor(sinCampo.fn).leer(IMAGEN, "image/jpeg").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(RespuestaFueraDeEsquemaError);
    expect(error).toMatchObject({ camino: "comercio", regla: "tipo" });
    expect(String((error as Error).message)).not.toContain("99");

    const sinContenido = fetchQueDevuelve(new Response(JSON.stringify({ choices: [] }), { status: 200 }));
    await expect(extractor(sinContenido.fn).leer(IMAGEN, "image/jpeg")).rejects.toBeInstanceOf(
      RespuestaFueraDeEsquemaError,
    );
  });

  it.each([429, 500, 502, 503])("un %i de Groq es ExtractorNoDisponibleError", async (estado) => {
    const { fn } = fetchQueDevuelve(respuestaGroq(null, estado));
    await expect(extractor(fn).leer(IMAGEN, "image/jpeg")).rejects.toMatchObject({
      name: "ExtractorNoDisponibleError",
      estado,
    });
  });

  it("un fetch que falla (sin conexión) es ExtractorNoDisponibleError", async () => {
    const fn = (async () => {
      throw new TypeError("fetch failed");
    }) as typeof fetch;
    await expect(extractor(fn).leer(IMAGEN, "image/jpeg")).rejects.toMatchObject({
      name: "ExtractorNoDisponibleError",
      estado: null,
      causa: "TypeError: fetch failed",
    });
  });

  it.each([400, 401, 413])("otro rechazo de Groq (%i) es ExtractorRechazoError", async (estado) => {
    const { fn } = fetchQueDevuelve(respuestaGroq(null, estado));
    const error = await extractor(fn).leer(IMAGEN, "image/jpeg").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ExtractorRechazoError);
    expect(error).toMatchObject({ estado });
  });

  it("si Groq no contesta en 20 s, corta el pedido y es ExtractorTiempoAgotadoError", async () => {
    vi.useFakeTimers();
    let senal: AbortSignal | undefined;
    const fn = ((_url: string, init?: RequestInit) => {
      senal = init?.signal ?? undefined;
      return new Promise<Response>((_, rechazar) => {
        senal?.addEventListener("abort", () => rechazar(new DOMException("aborted", "AbortError")));
      });
    }) as unknown as typeof fetch;

    const lectura = extractor(fn).leer(IMAGEN, "image/jpeg").catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(19_999);
    expect(senal?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(senal?.aborted).toBe(true);
    expect(await lectura).toBeInstanceOf(ExtractorTiempoAgotadoError);
  });
});
