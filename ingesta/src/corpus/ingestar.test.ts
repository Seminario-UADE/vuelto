import { describe, expect, it, vi } from "vitest";
import { codigoDeSalida, cosechar, informe, leerCatalogo, opcionesDeArgumentos } from "./ingestar.ts";
import type { ResumenCosecha } from "./ingestar.ts";
import { clienteCon, detalleDe, fixture, tarjeta } from "./test/modo-falso.ts";
import type { Libre } from "./test/modo-falso.ts";

const HOY = "2026-11-03";

/** Un MODO con una sección de estas tarjetas y los detalles que se le pasen (por defecto, Petrelli con el slug). */
function modo(tarjetas: Libre[], detalles: Record<string, Libre | null | Error> = {}) {
  return clienteCon(
    { seccion: tarjetas },
    vi.fn(async (slug: string) => {
      const d = detalles[slug];
      if (d instanceof Error) throw d;
      return d === undefined ? detalleDe(slug) : d;
    }),
  );
}

describe("cosechar", () => {
  it("lista, baja el detalle, mapea y deja cada promo publicable con su captura", async () => {
    const { cosecha, resumen } = await cosechar(modo([tarjeta("a"), tarjeta("b")]), HOY);
    expect(cosecha.publicables.map((p) => p.promocion.fuenteId)).toEqual(["a", "b"]);
    expect(cosecha.publicables[0]!.promocion).toMatchObject({ fuente: "modo", categoriaId: 1, porcentaje: 20 });
    expect(cosecha.capturas.map((c) => c.origen)).toEqual([
      "https://www.modo.com.ar/promos/api/rewards/v2/benefit/a",
      "https://www.modo.com.ar/promos/api/rewards/v2/benefit/b",
    ]);
    expect(cosecha.publicables[0]!.origen).toBe(cosecha.capturas[0]!.origen);
    expect(resumen.publicables).toBe(2);
    expect(resumen.descartes).toEqual({});
  });

  it("la captura guarda la tarjeta y el detalle tal cual, en JSON canónico", async () => {
    const { cosecha } = await cosechar(modo([tarjeta("a")]), HOY);
    const guardado = JSON.parse(cosecha.capturas[0]!.contenido) as Libre;
    expect(guardado.tarjeta.benefit.publication.slug).toBe("a");
    expect(guardado.detalle.slug).toBe("a");
    expect(Object.keys(guardado)).toEqual(["detalle", "tarjeta"]);
    // Repetirlo da exactamente el mismo texto: así una captura igual no se vuelve a guardar.
    const otra = await cosechar(modo([tarjeta("a")]), HOY);
    expect(otra.cosecha.capturas[0]!.contenido).toBe(cosecha.capturas[0]!.contenido);
  });

  it("publica todas las categorías de MODO, no solo súper y farmacia", async () => {
    const t = tarjeta("nafta", { categorias: ["8"] });
    const { cosecha } = await cosechar(modo([t], { nafta: detalleDe("nafta", (d) => (d.offers[0].categories = ["8"])) }), HOY);
    expect(cosecha.publicables[0]!.promocion.categoriaId).toBe(8);
  });

  it("guarda la captura de una promo descartada y deja el motivo", async () => {
    const diario = detalleDe("diario", (d) => (d.offers[0].limits.period_cap.reset_by = "day"));
    const { cosecha, resumen } = await cosechar(modo([tarjeta("diario")], { diario }), HOY);
    expect(cosecha.publicables).toEqual([]);
    expect(cosecha.capturas).toHaveLength(1);
    expect(resumen.descartes).toEqual({ tope_no_representable: 1 });
    expect(resumen.detalleDescartes[0]).toMatchObject({ slug: "diario", motivo: "tope_no_representable" });
  });

  it("un detalle inexistente (404) es un descarte, sin captura", async () => {
    const { cosecha, resumen } = await cosechar(modo([tarjeta("a"), tarjeta("b")], { b: null }), HOY);
    expect(cosecha.capturas).toHaveLength(1);
    expect(resumen.descartes).toEqual({ detalle_inexistente: 1 });
  });

  it("un detalle que falla no frena a los demás y su slug queda marcado para no darlo de baja", async () => {
    const { cosecha, resumen } = await cosechar(modo([tarjeta("a"), tarjeta("b")], { b: new Error("MODO respondió 500") }), HOY);
    expect(cosecha.publicables.map((p) => p.promocion.fuenteId)).toEqual(["a"]);
    expect([...cosecha.slugsSinDatos]).toEqual(["b"]);
    expect(resumen.detalleConError).toEqual([{ slug: "b", error: "MODO respondió 500" }]);
  });

  it("un error que no es un Error se informa igual", async () => {
    const cliente = clienteCon({ seccion: [tarjeta("a")] }, vi.fn(async () => Promise.reject("se cortó")));
    const { resumen } = await cosechar(cliente, HOY);
    expect(resumen.detalleConError).toEqual([{ slug: "a", error: "se cortó" }]);
  });

  it("un formato que el mapeo no reconoce se informa con su ruta y no se publica", async () => {
    const raro = detalleDe("raro", (d) => (d.conditions.schedule.days_of_week = ["someday"]));
    const { cosecha, resumen } = await cosechar(modo([tarjeta("raro")], { raro }), HOY);
    expect(cosecha.publicables).toEqual([]);
    expect(resumen.formatoDesconocido).toEqual([{ slug: "raro", ruta: "conditions.schedule.days_of_week[0]" }]);
    expect(resumen.descartes).toEqual({ formato_desconocido: 1 });
  });

  it("una promo que no pasa la validación se descarta entera, con todas sus partes", async () => {
    const BANCO_FUERA = "00000000-0000-4000-8000-000000000000";
    const d = detalleDe("mixta", (x) => (x.offers[0].requirements.banks.list = ["bcfcac03-6f79-4995-bfab-7b8916b0747a", BANCO_FUERA]));
    const { cosecha, resumen } = await cosechar(modo([tarjeta("mixta")], { mixta: d }), HOY);
    expect(cosecha.publicables).toEqual([]);
    expect(resumen.detalleDescartes[0]).toMatchObject({ motivo: "no_publicable", detalle: expect.stringContaining(BANCO_FUERA) });
  });

  it("dos promos de MODO que dan el mismo fuenteId: la segunda se descarta", async () => {
    // El listado trae dos slugs, pero el detalle de «b» dice ser «a».
    const { cosecha, resumen } = await cosechar(modo([tarjeta("a"), tarjeta("b")], { b: detalleDe("a") }), HOY);
    expect(cosecha.publicables).toHaveLength(1);
    expect(resumen.detalleDescartes[0]).toMatchObject({ slug: "b", motivo: "no_publicable", detalle: expect.stringMatching(/repetido/) });
  });

  it("una promo multibanco publica una fila por banco con el tope compartido", async () => {
    const real = fixture("dona-catalina");
    const t = { ...tarjeta("dona-catalina-nov26"), card: { validity_place: "Doña Catalina", participating_bank: "Bancos adheridos" } };
    const { cosecha } = await cosechar(modo([t], { "dona-catalina-nov26": real.detalle as Libre }), "2026-11-03");
    expect(cosecha.publicables).toHaveLength(24);
    expect(new Set(cosecha.publicables.map((p) => p.promocion.tope.grupoTopeId))).toEqual(new Set(["modo:dona-catalina-nov26"]));
  });

  it("junta los avisos del mapeo", async () => {
    const d = detalleDe("a", (x) => x.conditions.payment_methods.methods.push({ type: "credit_card", issuer: "patagonia_365" }));
    const { resumen } = await cosechar(modo([tarjeta("a")], { a: d }), HOY);
    expect(resumen.avisos.join(" ")).toMatch(/a: .*patagonia_365/);
  });
});

describe("leerCatalogo", () => {
  it("se queda con las entradas que tienen id y nombre", () => {
    expect(leerCatalogo([{ id: "x", name: " ICBC " }, { id: "y" }, { name: "Sin id" }, null, { id: "z", name: "" }])).toEqual([
      { id: "x", name: "ICBC" },
    ]);
  });

  it("un catálogo vacío frena la corrida: sin bancos no se puede validar nada", () => {
    expect(() => leerCatalogo([])).toThrow(/vacío/);
  });
});

describe("codigoDeSalida", () => {
  const base: ResumenCosecha = {
    listado: {
      candidatas: 0,
      porCategoria: {},
      porBanco: {},
      secciones: [],
      soloEnElListadoAnterior: [],
      descartadas: { noVigente: 0, noEsReintegro: 0, otraCategoria: 0 },
    },
    publicables: 0,
    descartes: { nivel_de_cliente: 3 },
    detalleDescartes: [],
    detalleConError: [],
    formatoDesconocido: [],
    avisos: [],
  };

  it("0 si todo se leyó y se publicó: un descarte no es un error", () => {
    expect(codigoDeSalida(base, { ok: true })).toBe(0);
  });

  it("1 si un detalle falló, si hay un formato desconocido o si el resguardo frenó la escritura", () => {
    expect(codigoDeSalida({ ...base, detalleConError: [{ slug: "a", error: "x" }] }, { ok: true })).toBe(1);
    expect(codigoDeSalida({ ...base, formatoDesconocido: [{ slug: "a", ruta: "x" }] }, { ok: true })).toBe(1);
    expect(codigoDeSalida(base, { ok: false })).toBe(1);
  });

  it("el informe no repite la lista de descartes uno por uno", () => {
    const i = informe({ ...base, detalleDescartes: [{ slug: "a", motivo: "otro", detalle: null }] }, {} as never);
    expect(Object.keys(i.cosecha as object)).not.toContain("detalleDescartes");
  });
});

describe("opcionesDeArgumentos", () => {
  it("por defecto no escribe y usa la pausa de 1,2 s", () => {
    expect(opcionesDeArgumentos([])).toEqual({ aplicar: false, pausaMs: 1200 });
  });

  it("lee --aplicar y una pausa propia", () => {
    expect(opcionesDeArgumentos(["--aplicar", "--pausa-ms", "2000"])).toEqual({ aplicar: true, pausaMs: 2000 });
  });

  it("una pausa menor a 1000 ms es un error (RNF-13)", () => {
    expect(() => opcionesDeArgumentos(["--pausa-ms", "500"])).toThrow(/1000/);
  });
});
