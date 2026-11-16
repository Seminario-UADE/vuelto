import { afterEach, describe, expect, it, vi } from "vitest";
import { ESQUEMA_LECTURA } from "./esquema.ts";
import {
  ExtractorRechazoError,
  ExtractorTiempoAgotadoError,
  RespuestaFueraDeEsquemaError,
  type LecturaCruda,
} from "./extractor.ts";
import { ESPERA_MAXIMA_REINTENTO_S, ExtractorGroq, MODELO_GROQ, URL_GROQ, type OpcionesGroq } from "./extractor-groq.ts";

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
  return new ExtractorGroq(opciones({ fetch: f, modo }));
}

/** Opciones con reloj y espera reales; los tests del reintento los reemplazan. */
function opciones(cambios: Partial<OpcionesGroq> = {}): OpcionesGroq {
  return {
    key: KEY,
    modo: "estricto",
    fetch: fetchQueDevuelve(respuestaGroq(JSON.stringify(LECTURA))).fn,
    limiteMs: 20_000,
    esperar: (ms) => new Promise((r) => setTimeout(r, ms)),
    ahora: () => Date.now(),
    ...cambios,
  };
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
    // Con tope, Groq cortaba la transcripción mucho antes de llegar a él (prueba manual, 13/11).
    expect(cuerpo).not.toHaveProperty("max_completion_tokens");
    // Sin "pensamiento" interno: gasta cupo y puede cortar la respuesta.
    expect(cuerpo["reasoning_effort"]).toBe("none");
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
    // Un ticket real traía "Mozo:(21) Fabi" sin tapar (prueba manual, 13/11).
    expect(instrucciones).toMatch(/mozo, cajero o vendedor/);
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

  it("guarda los tokens y el motivo de fin que informa Groq, sin datos del ticket", async () => {
    const cuerpo = {
      choices: [{ message: { content: JSON.stringify(LECTURA) }, finish_reason: "length" }],
      usage: { prompt_tokens: 1200, completion_tokens: 1500 },
    };
    const { fn } = fetchQueDevuelve(new Response(JSON.stringify(cuerpo), { status: 200 }));
    const e = extractor(fn);
    expect(e.ultimoUso).toBeNull();
    await e.leer(IMAGEN, "image/jpeg");
    expect(e.ultimoUso).toEqual({ tokensEntrada: 1200, tokensSalida: 1500, motivoFin: "length" });

    const sinUso = fetchQueDevuelve(respuestaGroq(JSON.stringify(LECTURA)));
    const otro = extractor(sinUso.fn);
    await otro.leer(IMAGEN, "image/jpeg");
    expect(otro.ultimoUso).toEqual({ tokensEntrada: null, tokensSalida: null, motivoFin: null });
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

  it.each([429, 500, 502, 503, 504])("un %i de Groq es ExtractorNoDisponibleError", async (estado) => {
    const { fn } = fetchQueDevuelve(respuestaGroq(null, estado));
    await expect(extractor(fn).leer(IMAGEN, "image/jpeg")).rejects.toMatchObject({
      name: "ExtractorNoDisponibleError",
      estado,
    });
  });

  it("un 429 trae el mensaje de Groq (sin el id de la organización) y los segundos que pide esperar", async () => {
    const respuesta = new Response(
      JSON.stringify({
        error: { message: "Rate limit reached in organization `org_01abcXYZ` on tokens per minute (TPM): Limit 8000" },
      }),
      // 15 s: más que la espera máxima, así no se reintenta y se ve el error tal cual.
      { status: 429, headers: { "retry-after": "15" } },
    );
    const { fn } = fetchQueDevuelve(respuesta);
    const error = await extractor(fn).leer(IMAGEN, "image/jpeg").catch((e: unknown) => e);
    expect(error).toMatchObject({
      name: "ExtractorNoDisponibleError",
      estado: 429,
      causa: "Rate limit reached in organization `org_…` on tokens per minute (TPM): Limit 8000",
      reintentarEn: 15,
    });
  });

  it("un 503 sin cuerpo ni retry-after no inventa causa ni espera", async () => {
    const { fn } = fetchQueDevuelve(new Response("caído", { status: 503 }));
    await expect(extractor(fn).leer(IMAGEN, "image/jpeg")).rejects.toMatchObject({
      estado: 503,
      causa: null,
      reintentarEn: null,
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

  it("si Groq se cuelga a mitad de la respuesta, el corte de 20 s también la corta", async () => {
    vi.useFakeTimers();
    const fn = ((_url: string, init?: RequestInit) => {
      const senal = init?.signal ?? undefined;
      // Manda los encabezados enseguida, pero el cuerpo nunca termina.
      const cuerpo = new ReadableStream({
        start(control) {
          senal?.addEventListener("abort", () => control.error(new DOMException("aborted", "AbortError")));
        },
      });
      return Promise.resolve(new Response(cuerpo, { status: 200 }));
    }) as unknown as typeof fetch;

    const lectura = extractor(fn).leer(IMAGEN, "image/jpeg").catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(20_000);
    expect(await lectura).toBeInstanceOf(ExtractorTiempoAgotadoError);
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

describe("ExtractorGroq: reintento ante un 429 (FR-015)", () => {
  /**
   * Respuestas en orden, con lo que tarda cada una (`demoras`, en ms), un reloj
   * que avanza con las demoras y las esperas, y las esperas pedidas.
   */
  function escenario(respuestas: Response[], demoras: number[] = []) {
    let reloj = 0;
    const esperas: number[] = [];
    let llamadas = 0;
    const fn = (async () => {
      reloj += demoras[llamadas] ?? 0;
      return respuestas[llamadas++] ?? respuestaGroq(JSON.stringify(LECTURA));
    }) as typeof fetch;
    const e = new ExtractorGroq(
      opciones({
        fetch: fn,
        ahora: () => reloj,
        esperar: async (ms) => {
          esperas.push(ms);
          reloj += ms;
        },
      }),
    );
    return { e, esperas, llamadas: () => llamadas };
  }

  function limite(segundos: number): Response {
    return new Response(JSON.stringify({ error: { message: "Rate limit reached" } }), {
      status: 429,
      headers: { "retry-after": String(segundos) },
    });
  }

  it("si Groq pide esperar hasta 12 s, espera eso y reintenta una vez", async () => {
    const { e, esperas, llamadas } = escenario([limite(9), respuestaGroq(JSON.stringify(LECTURA))]);
    await expect(e.leer(IMAGEN, "image/jpeg")).resolves.toEqual(LECTURA);
    expect(esperas).toEqual([9_000]);
    expect(llamadas()).toBe(2);
  });

  it(`si pide más de ${ESPERA_MAXIMA_REINTENTO_S} s, no espera: no disponible`, async () => {
    const { e, esperas, llamadas } = escenario([limite(ESPERA_MAXIMA_REINTENTO_S + 1)]);
    await expect(e.leer(IMAGEN, "image/jpeg")).rejects.toMatchObject({ name: "ExtractorNoDisponibleError", estado: 429 });
    expect(esperas).toEqual([]);
    expect(llamadas()).toBe(1);
  });

  it("si la espera y una lectura no entran en los 20 s, no reintenta", async () => {
    // El primer pedido tarda 7 s en volver con un 429 que pide 9 s: 7 + 9 + 5 > 20.
    const { e, esperas } = escenario([limite(9)], [7_000]);
    await expect(e.leer(IMAGEN, "image/jpeg")).rejects.toMatchObject({ estado: 429 });
    expect(esperas).toEqual([]);
  });

  it("reintenta una sola vez: si vuelve a dar 429, es no disponible", async () => {
    const { e, esperas, llamadas } = escenario([limite(4), limite(4)]);
    await expect(e.leer(IMAGEN, "image/jpeg")).rejects.toMatchObject({ estado: 429 });
    expect(esperas).toEqual([4_000]);
    expect(llamadas()).toBe(2);
  });

  it("un 429 sin retry-after o un 503 no se reintentan", async () => {
    const sinEspera = escenario([new Response("{}", { status: 429 })]);
    await expect(sinEspera.e.leer(IMAGEN, "image/jpeg")).rejects.toMatchObject({ estado: 429, reintentarEn: null });
    expect(sinEspera.llamadas()).toBe(1);

    const caido = escenario([new Response("{}", { status: 503, headers: { "retry-after": "2" } })]);
    await expect(caido.e.leer(IMAGEN, "image/jpeg")).rejects.toMatchObject({ estado: 503 });
    expect(caido.llamadas()).toBe(1);
  });
});
