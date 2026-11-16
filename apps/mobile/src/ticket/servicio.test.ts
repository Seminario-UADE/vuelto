import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { pedirLectura, type ClienteFunciones } from "./servicio";

// Spec 014, research R3: la llamada al servicio de la spec 013 y la traducción de cada respuesta.

const LECTURA = {
  monto: 24500,
  comercio: "COTO",
  fecha: "2026-11-14",
  medio: { banco: null, tipo: "debito", red: "visa", ultimos4: "1234" },
  textoExtraido: "COTO CICSA\nVISA DEBITO ****1234   24.500,00",
};

function cliente(respuesta: () => Promise<{ data: unknown; error: unknown }>) {
  const invoke = vi.fn(respuesta);
  return { cliente: { functions: { invoke } } as unknown as ClienteFunciones, invoke };
}

function errorHttp(estado: number, cuerpo: unknown): FunctionsHttpError {
  const texto = typeof cuerpo === "string" ? cuerpo : JSON.stringify(cuerpo);
  return new FunctionsHttpError(new Response(texto, { status: estado, headers: { "Content-Type": "application/json" } }));
}

const LIMITE = { limiteMs: 30_000 };

afterEach(() => {
  vi.useRealTimers();
});

describe("pedirLectura", () => {
  it("manda la foto a extraer-ticket como JPEG, sin ninguna key", async () => {
    const { cliente: c, invoke } = cliente(async () => ({ data: LECTURA, error: null }));
    await pedirLectura(c, "QUJD", LIMITE);
    expect(invoke).toHaveBeenCalledTimes(1);
    const [nombre, opciones] = invoke.mock.calls[0] as unknown as [string, { body: unknown; headers?: unknown }];
    expect(nombre).toBe("extraer-ticket");
    expect(opciones.body).toEqual({ imagen: "QUJD", tipo: "image/jpeg" });
    expect(opciones.headers).toBeUndefined();
    expect(JSON.stringify(opciones).toLowerCase()).not.toMatch(/gsk_|groq|api[_-]?key/);
  });

  it("200 → la lectura, con el medio leído tal cual", async () => {
    const { cliente: c } = cliente(async () => ({ data: LECTURA, error: null }));
    expect(await pedirLectura(c, "QUJD", LIMITE)).toEqual({ ok: true, ...LECTURA });
  });

  it("200 con campos en null → la lectura con esos null", async () => {
    const vacia = {
      monto: null,
      comercio: null,
      fecha: null,
      medio: { banco: null, tipo: null, red: null, ultimos4: null },
      textoExtraido: "algo",
    };
    const { cliente: c } = cliente(async () => ({ data: vacia, error: null }));
    expect(await pedirLectura(c, "QUJD", LIMITE)).toEqual({ ok: true, ...vacia });
  });

  it("200 con un cuerpo que no es del contrato → interno", async () => {
    for (const data of [null, "texto", { ...LECTURA, textoExtraido: 3 }, { ...LECTURA, medio: null }]) {
      const { cliente: c } = cliente(async () => ({ data, error: null }));
      expect(await pedirLectura(c, "QUJD", LIMITE)).toEqual({ ok: false, resultado: "interno" });
    }
  });

  it.each([
    [401, "no_autenticado", "no_autenticado"],
    [400, "invalido", "foto_no_valida"],
    [405, "metodo_no_permitido", "interno"],
    [413, "imagen_demasiado_grande", "imagen_demasiado_grande"],
    [415, "formato_no_soportado", "foto_no_valida"],
    [422, "imagen_danada", "foto_no_valida"],
    [422, "ticket_ilegible", "ticket_ilegible"],
    [500, "interno", "interno"],
    [503, "no_disponible", "no_disponible"],
    [504, "tardo_demasiado", "tardo_demasiado"],
  ])("HTTP %i { error: %s } → %s", async (estado, codigo, resultado) => {
    const { cliente: c } = cliente(async () => ({ data: null, error: errorHttp(estado, { error: codigo }) }));
    expect(await pedirLectura(c, "QUJD", LIMITE)).toEqual({ ok: false, resultado });
  });

  it("un 401 de la puerta de Supabase (sesión vencida, antes de llegar al servicio) → no_autenticado", async () => {
    for (const cuerpo of [{ code: 401, message: "Invalid JWT" }, { msg: "Missing authorization header" }, "Unauthorized"]) {
      const { cliente: c } = cliente(async () => ({ data: null, error: errorHttp(401, cuerpo) }));
      expect(await pedirLectura(c, "QUJD", LIMITE)).toEqual({ ok: false, resultado: "no_autenticado" });
    }
  });

  it("un error HTTP con un cuerpo fuera del contrato → interno", async () => {
    for (const cuerpo of ["<html>Bad Gateway</html>", { mensaje: "otra cosa" }, { error: "nuevo_codigo" }]) {
      const { cliente: c } = cliente(async () => ({ data: null, error: errorHttp(502, cuerpo) }));
      expect(await pedirLectura(c, "QUJD", LIMITE)).toEqual({ ok: false, resultado: "interno" });
    }
  });

  it("FunctionsFetchError (el pedido no llegó) → sin_conexion", async () => {
    const { cliente: c } = cliente(async () => ({ data: null, error: new FunctionsFetchError(new TypeError("Network request failed")) }));
    expect(await pedirLectura(c, "QUJD", LIMITE)).toEqual({ ok: false, resultado: "sin_conexion" });
  });

  it("FunctionsRelayError → interno", async () => {
    const { cliente: c } = cliente(async () => ({ data: null, error: new FunctionsRelayError({}) }));
    expect(await pedirLectura(c, "QUJD", LIMITE)).toEqual({ ok: false, resultado: "interno" });
  });

  it("invoke que tira una excepción → sin_conexion", async () => {
    const { cliente: c } = cliente(async () => {
      throw new TypeError("Network request failed");
    });
    expect(await pedirLectura(c, "QUJD", LIMITE)).toEqual({ ok: false, resultado: "sin_conexion" });
  });

  it("30 s sin respuesta → tardo_demasiado, y el pedido se corta", async () => {
    vi.useFakeTimers();
    let senal: AbortSignal | undefined;
    const { cliente: c } = cliente(
      (...args: unknown[]) => {
        senal = (args[1] as { signal?: AbortSignal }).signal;
        return new Promise(() => {});
      },
    );
    const pendiente = pedirLectura(c, "QUJD", LIMITE);
    await vi.advanceTimersByTimeAsync(29_999);
    expect(senal?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(await pendiente).toEqual({ ok: false, resultado: "tardo_demasiado" });
    expect(senal?.aborted).toBe(true);
  });
});
