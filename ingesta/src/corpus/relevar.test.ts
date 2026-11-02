import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import type { Crudo } from "./mapear.ts";
import type { ClienteMODO } from "./modo.ts";
import { resolve } from "node:path";
import { raizDelRepo } from "./args.ts";
import { codigoDeSalida, opcionesDeArgumentos, relevar } from "./relevar.ts";

function fixture(nombre: string): Crudo {
  return JSON.parse(readFileSync(new URL(`./test/detalles/${nombre}.json`, import.meta.url), "utf8")) as Crudo;
}

type Libre = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

/** Tarjeta del listado mínima, con el estado, el tipo y el banco (fila 5) que usa el relevamiento. */
function tarjeta(slug: string, extra: Libre = {}): Libre {
  return {
    slug,
    promo_id: `promo-${slug}`,
    calculated_status: "RUNNING",
    trigger_type: "payment_promotion",
    content: { row: [{ text: "Comercio" }, {}, {}, {}, {}, { text: "ICBC" }] },
    ...extra,
  };
}

/** Detalle de Petrelli con otro slug: se mapea a un borrador de la categoría 1. */
function detalleDe(slug: string): Libre {
  const d = structuredClone(fixture("petrelli").detalle) as Libre;
  d.slug = slug;
  return d;
}

function entorno(listados: Record<number, Libre[]>, sinDetalle: string[] = []) {
  const escritos = new Map<string, string>();
  const cliente: ClienteMODO = {
    listarPagina: vi.fn(),
    listarCategoria: vi.fn(async (c: number) => listados[c] ?? []),
    detalle: vi.fn(async (slug: string) => (sinDetalle.includes(slug) ? null : detalleDe(slug))),
    bancos: vi.fn(),
  };
  return {
    escritos,
    deps: {
      cliente,
      escribir: (ruta: string, contenido: string) => void escritos.set(ruta, contenido),
      hoy: "2026-11-02",
      carpeta: "crudo",
      categoriasDelDueno: [1, 4],
      catalogoBancos: null,
    },
  };
}

describe("relevar", () => {
  it("se queda con las promos vigentes de tipo pago y descarta cuotas y sorteos", async () => {
    const { deps, escritos } = entorno({
      1: [
        tarjeta("a"),
        tarjeta("b", { calculated_status: "FINISHED" }),
        tarjeta("c", { trigger_type: "installments" }),
        tarjeta("d", { trigger_type: "payment_scratch" }),
      ],
    });
    const r = await relevar([1], deps);
    expect([...escritos.keys()]).toEqual(["crudo/a.json"]);
    expect(r.candidatas).toBe(1);
    expect(r.descartadas).toEqual({ noVigente: 1, noEsPago: 2 });
  });

  it("dos tarjetas con el mismo slug o promo_id cuentan una vez, también entre categorías", async () => {
    const { deps, escritos } = entorno({
      1: [tarjeta("a"), tarjeta("a", { id: "otra-tarjeta" }), tarjeta("b", { promo_id: "mismo" })],
      4: [tarjeta("a"), tarjeta("c", { promo_id: "mismo" })],
    });
    const r = await relevar([1, 4], deps);
    expect([...escritos.keys()].sort()).toEqual(["crudo/a.json", "crudo/b.json"]);
    expect(r.candidatas).toBe(2);
    expect(r.porCategoria).toEqual({ 1: 2, 4: 0 });
  });

  it("guarda { capturadoEl, url, tarjeta, detalle } y cuenta por banco", async () => {
    const { deps, escritos } = entorno({ 1: [tarjeta("a"), tarjeta("b")] });
    const r = await relevar([1], deps);
    const guardado = JSON.parse(escritos.get("crudo/a.json")!) as Libre;
    expect(guardado.capturadoEl).toBe("2026-11-02");
    expect(guardado.url).toBe("https://www.modo.com.ar/promos/api/rewards/v2/benefit/a");
    expect(guardado.tarjeta.slug).toBe("a");
    expect(guardado.detalle.slug).toBe("a");
    expect(escritos.get("crudo/a.json")!.endsWith("\n")).toBe(true);
    expect(r.porBanco).toEqual({ ICBC: 2 });
  });

  it("un detalle inexistente se informa y no escribe nada", async () => {
    const { deps, escritos } = entorno({ 1: [tarjeta("a"), tarjeta("b")] }, ["b"]);
    const r = await relevar([1], deps);
    expect(r.detalleInexistente).toEqual(["b"]);
    expect([...escritos.keys()]).toEqual(["crudo/a.json"]);
  });

  it("si el detalle de una promo falla, lo registra y sigue con las demás", async () => {
    const escritos = new Map<string, string>();
    const cliente: ClienteMODO = {
      listarPagina: vi.fn(),
      listarCategoria: vi.fn(async () => [tarjeta("a"), tarjeta("b"), tarjeta("c")]),
      detalle: vi.fn(async (slug: string) => {
        if (slug === "b") throw new Error("MODO respondió 500 en .../benefit/b");
        return detalleDe(slug);
      }),
      bancos: vi.fn(),
    };
    const r = await relevar([1], {
      cliente,
      escribir: (ruta, contenido) => void escritos.set(ruta, contenido),
      hoy: "2026-11-02",
      carpeta: "crudo",
      categoriasDelDueno: [1, 4],
      catalogoBancos: null,
    });
    expect([...escritos.keys()].sort()).toEqual(["crudo/a.json", "crudo/c.json"]);
    expect(r.detalleConError).toEqual([{ slug: "b", error: "MODO respondió 500 en .../benefit/b" }]);
  });

  it("repetirlo escribe exactamente lo mismo", async () => {
    const { deps, escritos } = entorno({ 1: [tarjeta("a")] });
    await relevar([1], deps);
    const primera = escritos.get("crudo/a.json");
    await relevar([1], deps);
    expect(escritos.get("crudo/a.json")).toBe(primera);
  });

  it("un slug que no es seguro como nombre de archivo lanza antes de escribir", async () => {
    const { deps, escritos } = entorno({ 1: [tarjeta("../../etc/passwd")] });
    await expect(relevar([1], deps)).rejects.toThrow(/slug/);
    expect(escritos.size).toBe(0);
  });

  it("una tarjeta sin slug lanza", async () => {
    const { deps } = entorno({ 1: [{ calculated_status: "RUNNING", trigger_type: "payment_promotion" }] });
    await expect(relevar([1], deps)).rejects.toThrow(/slug/);
  });

  it("informa cuántas promos mapean a borrador, cuántas a exclusión y cuáles fallan", async () => {
    const escritos = new Map<string, string>();
    const cliente: ClienteMODO = {
      listarPagina: vi.fn(),
      listarCategoria: vi.fn(async () => [tarjeta("ok"), tarjeta("fuera"), tarjeta("rota")]),
      detalle: vi.fn(async (slug: string) => {
        const d = detalleDe(slug);
        if (slug === "fuera") d.offers[0].requirements.banks.list = [];
        if (slug === "rota") d.conditions.schedule.days_of_week = ["someday"];
        return d;
      }),
      bancos: vi.fn(),
    };
    const r = await relevar([1], {
      cliente,
      escribir: (ruta, contenido) => void escritos.set(ruta, contenido),
      hoy: "2026-11-02",
      carpeta: "crudo",
      categoriasDelDueno: [1, 4],
      catalogoBancos: null,
    });
    expect(r.mapeo.borradores).toBe(1);
    expect(r.mapeo.exclusiones).toEqual([{ slug: "fuera", motivo: "banco_no_determinado" }]);
    expect(r.mapeo.errores).toEqual([{ slug: "rota", ruta: "conditions.schedule.days_of_week[0]" }]);
    expect(escritos.size).toBe(3); // el crudo se guarda igual: sirve para reproducir el error
  });
});

describe("opcionesDeArgumentos", () => {
  it("lee las categorías y usa los valores por defecto", () => {
    expect(opcionesDeArgumentos(["--categorias", "1,4"])).toEqual({
      categorias: [1, 4],
      pausaMs: 1200,
      carpeta: resolve(raizDelRepo(), "supabase/seed/crudo"),
    });
  });

  it("acepta pausa y carpeta propias", () => {
    const o = opcionesDeArgumentos(["--categorias", "1", "--pausa-ms", "2000", "--carpeta", "x"]);
    expect(o).toMatchObject({ pausaMs: 2000, carpeta: resolve("x") });
  });

  it("una pausa menor a 1000 ms es un error (RNF-13)", () => {
    expect(() => opcionesDeArgumentos(["--categorias", "1", "--pausa-ms", "500"])).toThrow(/1000/);
  });

  it("sin --categorias es un error", () => {
    expect(() => opcionesDeArgumentos([])).toThrow(/--categorias/);
  });
});

describe("la carpeta de crudos no depende de dónde se corre el comando", () => {
  it("por defecto es la del repo, aunque npm corra el script con cwd = ingesta/", () => {
    const { carpeta } = opcionesDeArgumentos(["--categorias", "1"]);
    expect(carpeta).toBe(resolve(raizDelRepo(), "supabase", "seed", "crudo"));
  });
});

describe("codigoDeSalida", () => {
  const resumen = (cambios: Partial<Parameters<typeof codigoDeSalida>[0]> = {}) => ({
    candidatas: 1,
    porCategoria: {},
    porBanco: {},
    descartadas: { noVigente: 0, noEsPago: 0 },
    detalleInexistente: [],
    detalleConError: [],
    mapeo: { borradores: 1, exclusiones: [], errores: [] },
    ...cambios,
  });

  it("0 si el relevamiento quedó completo", () => {
    expect(codigoDeSalida(resumen())).toBe(0);
  });

  it("1 si el detalle de alguna promo falló: el relevamiento quedó incompleto", () => {
    expect(codigoDeSalida(resumen({ detalleConError: [{ slug: "a", error: "500" }] }))).toBe(1);
  });

  it("un detalle inexistente (404) o un formato que el mapeo no reconoce no lo vuelven inválido: el crudo se guardó", () => {
    expect(codigoDeSalida(resumen({ detalleInexistente: ["a"], mapeo: { borradores: 0, exclusiones: [], errores: [{ slug: "b", ruta: "x" }] } }))).toBe(0);
  });
});
