import { describe, expect, it, vi } from "vitest";
import { crearClienteMODO } from "./modo.ts";

interface Pedido {
  url: string;
  cabeceras: Record<string, string>;
}

/** `fetch` simulado: responde según la URL y guarda lo que se pidió. */
function fetchSimulado(responder: (url: string) => { estado: number; cuerpo: string }) {
  const pedidos: Pedido[] = [];
  const fn = vi.fn(async (entrada: string | URL | Request, init?: RequestInit) => {
    const url = String(entrada);
    pedidos.push({ url, cabeceras: Object.fromEntries(new Headers(init?.headers).entries()) });
    const { estado, cuerpo } = responder(url);
    return new Response(cuerpo, { status: estado });
  });
  return { fn: fn as unknown as typeof fetch, pedidos };
}

const json = (x: unknown) => ({ estado: 200, cuerpo: JSON.stringify(x) });
const pagina = (n: number) => ({ data: { cards: Array.from({ length: n }, (_, i) => ({ slug: `s${i}` })) } });

describe("crearClienteMODO — ritmo y User-Agent", () => {
  it("una pausa menor a 1000 ms es un error de configuración", () => {
    const { fn } = fetchSimulado(() => json({}));
    expect(() => crearClienteMODO({ fetch: fn, pausaMs: 999, esperar: async () => {} })).toThrow(/1000/);
  });

  it("se identifica con el User-Agent VueltoBot (UADE)", async () => {
    const { fn, pedidos } = fetchSimulado(() => json([]));
    await crearClienteMODO({ fetch: fn, pausaMs: 1000, esperar: async () => {} }).bancos();
    expect(pedidos[0]!.cabeceras["user-agent"]).toBe("VueltoBot (UADE)");
  });

  it("espera entre pedidos pero no antes del primero", async () => {
    const { fn } = fetchSimulado(() => json({ banks: [] }));
    const esperar = vi.fn(async () => {});
    const cliente = crearClienteMODO({ fetch: fn, pausaMs: 1500, esperar });
    await cliente.detalle("a");
    expect(esperar).not.toHaveBeenCalled();
    await cliente.detalle("b");
    await cliente.detalle("c");
    expect(esperar).toHaveBeenCalledTimes(2);
    expect(esperar).toHaveBeenCalledWith(1500);
  });
});

describe("crearClienteMODO — reintentos", () => {
  /** Responde con la secuencia dada, una por pedido; la última se repite. */
  function secuencia(respuestas: ({ estado: number; cuerpo: string } | "corte")[]) {
    let n = 0;
    const fn = vi.fn(async () => {
      const r = respuestas[Math.min(n++, respuestas.length - 1)]!;
      if (r === "corte") throw new TypeError("fetch failed");
      return new Response(r.cuerpo, { status: r.estado });
    });
    return fn as unknown as typeof fetch;
  }

  it("reintenta un error de servidor y devuelve la respuesta buena", async () => {
    const fn = secuencia([{ estado: 500, cuerpo: "boom" }, json({ slug: "x" })]);
    const esperar = vi.fn(async () => {});
    const cliente = crearClienteMODO({ fetch: fn, pausaMs: 1000, esperar });
    expect(await cliente.detalle("x")).toEqual({ slug: "x" });
    expect(fn).toHaveBeenCalledTimes(2);
    expect(esperar).toHaveBeenCalledTimes(1); // la pausa antes del reintento
  });

  it("reintenta un corte de red", async () => {
    const fn = secuencia(["corte", json({ slug: "x" })]);
    const cliente = crearClienteMODO({ fetch: fn, pausaMs: 1000, esperar: async () => {} });
    expect(await cliente.detalle("x")).toEqual({ slug: "x" });
  });

  it("después de los reintentos lanza el error con la URL", async () => {
    const fn = secuencia([{ estado: 503, cuerpo: "no" }]);
    const cliente = crearClienteMODO({ fetch: fn, pausaMs: 1000, esperar: async () => {}, reintentos: 2 });
    await expect(cliente.detalle("x")).rejects.toThrow(/503.*benefit\/x/);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("un corte de red que no se recupera lanza un error con la URL", async () => {
    const fn = secuencia(["corte"]);
    const cliente = crearClienteMODO({ fetch: fn, pausaMs: 1000, esperar: async () => {}, reintentos: 1 });
    await expect(cliente.detalle("x")).rejects.toThrow(/benefit\/x/);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("un 4xx no se reintenta", async () => {
    const fn = secuencia([{ estado: 403, cuerpo: "no" }]);
    const cliente = crearClienteMODO({ fetch: fn, pausaMs: 1000, esperar: async () => {} });
    await expect(cliente.detalle("x")).rejects.toThrow(/403/);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("un 404 no se reintenta y da null", async () => {
    const fn = secuencia([{ estado: 404, cuerpo: "x" }]);
    const cliente = crearClienteMODO({ fetch: fn, pausaMs: 1000, esperar: async () => {} });
    expect(await cliente.detalle("x")).toBeNull();
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe("crearClienteMODO — listado", () => {
  it("pide la categoría por id numérico, de 100 en 100", async () => {
    const { fn, pedidos } = fetchSimulado(() => json(pagina(3)));
    await crearClienteMODO({ fetch: fn, pausaMs: 1000, esperar: async () => {} }).listarPagina(4, 2);
    const url = new URL(pedidos[0]!.url);
    expect(url.pathname).toBe("/promos/api/rewards/slots");
    expect(url.searchParams.get("slots")).toBe("web-modo-hub-mas-promos");
    expect(url.searchParams.get("categories")).toBe("4");
    expect(url.searchParams.get("page")).toBe("2");
    expect(url.searchParams.get("limit")).toBe("100");
  });

  it("pagina hasta una página corta", async () => {
    const respuestas = [pagina(100), pagina(100), pagina(12)];
    let n = 0;
    const { fn } = fetchSimulado(() => json(respuestas[n++]));
    const tarjetas = await crearClienteMODO({ fetch: fn, pausaMs: 1000, esperar: async () => {} }).listarCategoria(1);
    expect(tarjetas).toHaveLength(212);
    expect(n).toBe(3);
  });

  it("corta si el listado nunca termina", async () => {
    const { fn } = fetchSimulado(() => json(pagina(100)));
    const cliente = crearClienteMODO({ fetch: fn, pausaMs: 1000, esperar: async () => {}, maxPaginas: 3 });
    await expect(cliente.listarCategoria(1)).rejects.toThrow(/3 páginas/);
  });

  it("una respuesta sin data.cards es un error que nombra la URL", async () => {
    const { fn } = fetchSimulado(() => json({ nada: true }));
    const cliente = crearClienteMODO({ fetch: fn, pausaMs: 1000, esperar: async () => {} });
    await expect(cliente.listarPagina(1, 1)).rejects.toThrow(/slots/);
  });
});

describe("crearClienteMODO — detalle y bancos", () => {
  it("pide el detalle por slug", async () => {
    const { fn, pedidos } = fetchSimulado(() => json({ slug: "x" }));
    const detalle = await crearClienteMODO({ fetch: fn, pausaMs: 1000, esperar: async () => {} }).detalle("20-paladini");
    expect(new URL(pedidos[0]!.url).pathname).toBe("/promos/api/rewards/v2/benefit/20-paladini");
    expect(detalle).toEqual({ slug: "x" });
  });

  it("un 404 del detalle devuelve null y no lanza", async () => {
    const { fn } = fetchSimulado(() => ({ estado: 404, cuerpo: "<!DOCTYPE html>" }));
    const detalle = await crearClienteMODO({ fetch: fn, pausaMs: 1000, esperar: async () => {} }).detalle("no-existe");
    expect(detalle).toBeNull();
  });

  it("un error de servidor lanza con el estado y la URL", async () => {
    const { fn } = fetchSimulado(() => ({ estado: 500, cuerpo: "boom" }));
    const cliente = crearClienteMODO({ fetch: fn, pausaMs: 1000, esperar: async () => {} });
    await expect(cliente.detalle("x")).rejects.toThrow(/500.*benefit\/x/);
  });

  it("una respuesta que no es JSON lanza con la URL", async () => {
    const { fn } = fetchSimulado(() => ({ estado: 200, cuerpo: "<html>" }));
    const cliente = crearClienteMODO({ fetch: fn, pausaMs: 1000, esperar: async () => {} });
    await expect(cliente.detalle("x")).rejects.toThrow(/benefit\/x no es JSON/);
  });

  it("los bancos del catálogo llegan como una lista", async () => {
    const { fn, pedidos } = fetchSimulado(() => json([{ id: "a", name: "Macro" }]));
    const bancos = await crearClienteMODO({ fetch: fn, pausaMs: 1000, esperar: async () => {} }).bancos();
    expect(bancos).toEqual([{ id: "a", name: "Macro" }]);
    expect(new URL(pedidos[0]!.url).searchParams.get("source")).toBe("app_modo");
  });

  it("si el catálogo no es una lista lanza un error", async () => {
    const { fn } = fetchSimulado(() => json({ banks: [] }));
    const cliente = crearClienteMODO({ fetch: fn, pausaMs: 1000, esperar: async () => {} });
    await expect(cliente.bancos()).rejects.toThrow(/lista/);
  });
});
