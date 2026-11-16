import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { AutenticacionNoDisponibleError, type Autenticador } from "../_shared/autenticar.ts";
import {
  ExtractorNoDisponibleError,
  ExtractorRechazoError,
  ExtractorTiempoAgotadoError,
  RespuestaFueraDeEsquemaError,
} from "./extractor.ts";
import { crearHandlerExtraerTicket } from "./handler.ts";
import { TicketIlegibleError, type ServicioLecturaTicket } from "./servicio.ts";
import { TICKETS } from "./test/tickets.ts";

const URL_FUNCION = "http://localhost/functions/v1/extraer-ticket";
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46]);
const IMAGEN_BASE64 = btoa(String.fromCharCode(...JPEG));
const LECTURA = TICKETS[0]!.esperada;

type Lector = Pick<ServicioLecturaTicket, "leer">;

function autenticadorFijo(usuario: string | null): Autenticador {
  return { usuarioDe: async () => usuario };
}

function lectorQueDevuelve(): Lector & { llamadas: number } {
  const lector = {
    llamadas: 0,
    leer: async () => {
      lector.llamadas++;
      return LECTURA;
    },
  };
  return lector;
}

function lectorQueFalla(error: Error): Lector {
  return {
    leer: async () => {
      throw error;
    },
  };
}

function handler(opciones: { usuario?: string | null; autenticador?: Autenticador; lector?: Lector } = {}) {
  let reloj = 1_000;
  return crearHandlerExtraerTicket({
    autenticador: opciones.autenticador ?? autenticadorFijo(opciones.usuario === undefined ? "u1" : opciones.usuario),
    crearServicio: () => opciones.lector ?? lectorQueDevuelve(),
    // Cada consulta avanza 250 ms: la duración registrada es determinística.
    ahora: () => (reloj += 250),
    limiteMs: 24_000,
  });
}

function pedido(body: unknown, init: RequestInit = {}): Request {
  return new Request(URL_FUNCION, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer token" },
    body: typeof body === "string" ? body : JSON.stringify(body),
    ...init,
  });
}

const PEDIDO_VALIDO = { imagen: IMAGEN_BASE64, tipo: "image/jpeg" };

let log: MockInstance;
let error: MockInstance;
beforeEach(() => {
  log = vi.spyOn(console, "log").mockImplementation(() => {});
  error = vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

/** Todas las líneas que el handler registró, en un solo texto. */
function registros(): string {
  return [...log.mock.calls, ...error.mock.calls].map((args) => args.join(" ")).join("\n");
}

function lineasRegistradas(): number {
  return log.mock.calls.length + error.mock.calls.length;
}

describe("handler extraer-ticket: éxito (US1)", () => {
  it("responde 200 con la lectura del servicio", async () => {
    const r = await handler()(pedido(PEDIDO_VALIDO));
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual(LECTURA);
  });
});

describe("handler extraer-ticket: errores (US3, FR-014)", () => {
  it("si la sesión o el pedido se cuelgan, responde tardo_demasiado a los 24 s, con una sola línea (FR-015)", async () => {
    vi.useFakeTimers();
    const colgado: Autenticador = { usuarioDe: () => new Promise(() => {}) };
    const respuesta = handler({ autenticador: colgado })(pedido(PEDIDO_VALIDO));
    await vi.advanceTimersByTimeAsync(23_999);
    let termino = false;
    void respuesta.then(() => (termino = true));
    await vi.advanceTimersByTimeAsync(0);
    expect(termino).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    const r = await respuesta;
    expect(r.status).toBe(504);
    expect(await r.json()).toEqual({ error: "tardo_demasiado" });
    expect(lineasRegistradas()).toBe(1);
    vi.useRealTimers();
  });

  it("la consulta previa del navegador (OPTIONS): 204 con CORS, sin sesión ni lector ni registro", async () => {
    const lector = lectorQueDevuelve();
    const r = await handler({ usuario: null, lector })(new Request(URL_FUNCION, { method: "OPTIONS" }));
    expect(r.status).toBe(204);
    expect(r.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(lector.llamadas).toBe(0);
    expect(lineasRegistradas()).toBe(0);
  });

  it("un método que no es POST: 405", async () => {
    const r = await handler()(new Request(URL_FUNCION, { method: "GET" }));
    expect(r.status).toBe(405);
    expect(await r.json()).toEqual({ error: "metodo_no_permitido" });
  });

  it("sin sesión o con la anon key: 401, sin llamar al lector (US3-1)", async () => {
    const lector = lectorQueDevuelve();
    const r = await handler({ usuario: null, lector })(pedido(PEDIDO_VALIDO));
    expect(r.status).toBe(401);
    expect(await r.json()).toEqual({ error: "no_autenticado" });
    expect(lector.llamadas).toBe(0);
  });

  it("Auth caído: 500, no 401", async () => {
    const autenticador: Autenticador = {
      usuarioDe: async () => {
        throw new AutenticacionNoDisponibleError();
      },
    };
    const r = await handler({ autenticador })(pedido(PEDIDO_VALIDO));
    expect(r.status).toBe(500);
    expect(await r.json()).toEqual({ error: "interno" });
  });

  it.each([
    ["un cuerpo que no es JSON", "esto no es json", "body"],
    ["sin imagen", { tipo: "image/jpeg" }, "imagen"],
    ["sin tipo", { imagen: IMAGEN_BASE64 }, "tipo"],
  ])("%s: 400 con el campo (US3-2)", async (_, body, campo) => {
    const r = await handler()(pedido(body));
    expect(r.status).toBe(400);
    expect(await r.json()).toEqual({ error: "invalido", campo });
  });

  it.each([
    ["formato_no_soportado", 415, { imagen: IMAGEN_BASE64, tipo: "image/heic" }],
    ["imagen_demasiado_grande", 413, { imagen: "A".repeat(3_400_000), tipo: "image/jpeg" }],
    ["imagen_danada", 422, { imagen: "%%%%", tipo: "image/jpeg" }],
  ])("%s: %i, sin llamar al lector (US3-3 a US3-5)", async (codigo, estado, body) => {
    const lector = lectorQueDevuelve();
    const r = await handler({ lector })(pedido(body));
    expect(r.status).toBe(estado);
    expect(await r.json()).toEqual({ error: codigo });
    expect(lector.llamadas).toBe(0);
  });

  it.each([
    ["sin monto, comercio ni fecha (US3-6)", new TicketIlegibleError(), 422, "ticket_ilegible"],
    ["respuesta fuera de esquema (US3-7)", new RespuestaFueraDeEsquemaError("medio.redImpresa", "tipo"), 422, "ticket_ilegible"],
    ["Groq no contestó a tiempo (US3-8)", new ExtractorTiempoAgotadoError(), 504, "tardo_demasiado"],
    ["Groq sin cupo o caído (US3-9)", new ExtractorNoDisponibleError(429, "Rate limit reached", 30), 503, "no_disponible"],
    ["otro rechazo de Groq", new ExtractorRechazoError(400), 500, "interno"],
    ["un error cualquiera", new Error("algo"), 500, "interno"],
  ])("%s: %i %s", async (_, falla, estado, codigo) => {
    const r = await handler({ lector: lectorQueFalla(falla) })(pedido(PEDIDO_VALIDO));
    expect(r.status).toBe(estado);
    expect(await r.json()).toEqual({ error: codigo });
  });
});

describe("handler extraer-ticket: registros sin datos del ticket (FR-013)", () => {
  it("un éxito deja una sola línea con el resultado y la duración, sin la imagen ni el texto", async () => {
    await handler()(pedido(PEDIDO_VALIDO));
    expect(lineasRegistradas()).toBe(1);
    expect(registros()).toMatch(/^extraer-ticket: ok \d+ms$/);
    expect(registros()).not.toContain(IMAGEN_BASE64);
    expect(registros()).not.toContain("ALMACÉN");
    expect(registros()).not.toContain("24500");
  });

  it("un error de esquema registra el camino y la regla, nunca el valor", async () => {
    const falla = new RespuestaFueraDeEsquemaError("medio.redImpresa", "tipo");
    await handler({ lector: lectorQueFalla(falla) })(pedido(PEDIDO_VALIDO));
    expect(lineasRegistradas()).toBe(1);
    expect(registros()).toMatch(/^extraer-ticket: ticket_ilegible \d+ms medio\.redImpresa tipo$/);
  });

  it("un 429 registra el estado de Groq; un rechazo, el estado; un error, solo su nombre", async () => {
    await handler({ lector: lectorQueFalla(new ExtractorNoDisponibleError(429, "Rate limit reached", 30)) })(
      pedido(PEDIDO_VALIDO),
    );
    await handler({ lector: lectorQueFalla(new ExtractorRechazoError(413)) })(pedido(PEDIDO_VALIDO));
    await handler({ lector: lectorQueFalla(new TypeError("datos del ticket que no van al registro")) })(
      pedido(PEDIDO_VALIDO),
    );
    expect(lineasRegistradas()).toBe(3);
    expect(registros()).toContain("no_disponible");
    expect(registros()).toContain("429");
    expect(registros()).toContain("interno");
    expect(registros()).toContain("413");
    expect(registros()).toContain("TypeError");
    expect(registros()).not.toContain("datos del ticket");
  });

  it("los rechazos antes del lector también dejan una sola línea, sin la imagen", async () => {
    await handler({ usuario: null })(pedido(PEDIDO_VALIDO));
    await handler()(pedido({ imagen: "%%%%", tipo: "image/jpeg" }));
    expect(lineasRegistradas()).toBe(2);
    expect(registros()).toContain("no_autenticado");
    expect(registros()).toContain("imagen_danada");
    expect(registros()).not.toContain("%%%%");
  });
});
