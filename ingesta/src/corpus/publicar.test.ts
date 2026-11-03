import { CATEGORIAS_MODO } from "@vuelto/motor";
import { describe, expect, it } from "vitest";
import { aFila } from "./filas.ts";
import type { FilaPromocion } from "./filas.ts";
import { MINIMO_PARA_RESGUARDO, TAMANO_DE_LOTE, leerEntorno, publicar } from "./publicar.ts";
import type { Captura, ClienteBase, Cosecha } from "./publicar.ts";
import { BANCO_GALICIA, BANCO_ICBC, promocion } from "./test/fabricas.ts";
import type { PromocionIngestada } from "./tipos.ts";

const BANCOS = [
  { id: BANCO_ICBC, name: "ICBC" },
  { id: BANCO_GALICIA, name: "Galicia" },
];

const origen = (slug: string) => `https://www.modo.com.ar/promos/api/rewards/v2/benefit/${slug}`;

/** Una cosecha con estas promos, cada una con su captura (contenido = el slug, salvo que se diga otro). */
function cosecha(promos: PromocionIngestada[], extra: Partial<Cosecha> = {}, contenido: (slug: string) => string = (s) => s): Cosecha {
  const slugs = [...new Set(promos.map((p) => p.fuenteId.split("#")[0]!))];
  return {
    bancos: BANCOS,
    capturas: slugs.map((s) => ({ origen: origen(s), contenido: contenido(s) })),
    publicables: promos.map((p) => ({ promocion: p, origen: origen(p.fuenteId.split("#")[0]!) })),
    slugsSinDatos: new Set(),
    ...extra,
  };
}

const varias = (n: number, prefijo = "p") => Array.from({ length: n }, (_, i) => promocion({ fuenteId: `${prefijo}-${i}` }));

interface BaseFalsa {
  cliente: ClienteBase;
  promociones: Map<string, FilaPromocion>;
  capturas: ({ id: string; capturada: number } & Captura)[];
  bancos: Map<string, { id: string; nombre: string }>;
  llamadas: string[];
  lotes: { promociones: number[]; bajas: number[]; capturas: number[] };
}

/** Una base en memoria que aplica de verdad lo que se le escribe: sirve para probar la idempotencia. */
function baseFalsa(inicial: FilaPromocion[] = []): BaseFalsa {
  const promociones = new Map<string, FilaPromocion>();
  for (const f of inicial) promociones.set(`${f.fuente}|${f.fuente_id}`, structuredClone(f));
  const capturas: BaseFalsa["capturas"] = [];
  const bancos = new Map<string, { id: string; nombre: string }>();
  const categorias = new Map<number, { id: number; nombre: string }>();
  const llamadas: string[] = [];
  const lotes = { promociones: [] as number[], bajas: [] as number[], capturas: [] as number[] };
  const cliente: ClienteBase = {
    leerCategorias: async () => [...categorias.values()],
    leerBancos: async () => [...bancos.values()],
    leerPromociones: async () => [...promociones.values()].filter((f) => f.fuente === "modo").map((f) => structuredClone(f)),
    leerUltimasCapturas: async (origenes) => {
      llamadas.push("leerUltimasCapturas");
      if (origenes.length > TAMANO_DE_LOTE) throw new Error("demasiados orígenes");
      return origenes.flatMap((o) => {
        const ultima = capturas.filter((c) => c.origen === o).sort((a, b) => b.capturada - a.capturada)[0];
        return ultima === undefined ? [] : [{ id: ultima.id, origen: ultima.origen, contenido: ultima.contenido }];
      });
    },
    guardarCategorias: async (filas) => {
      llamadas.push("guardarCategorias");
      for (const f of filas) categorias.set(f.id, { ...f });
    },
    guardarBancos: async (filas) => {
      llamadas.push("guardarBancos");
      for (const f of filas) bancos.set(f.id, { ...f });
    },
    guardarCapturas: async (filas) => {
      llamadas.push("guardarCapturas");
      lotes.capturas.push(filas.length);
      return filas.map((f) => {
        const id = `captura-${capturas.length + 1}`;
        capturas.push({ ...f, id, capturada: capturas.length });
        return { id, origen: f.origen };
      });
    },
    guardarPromociones: async (filas) => {
      llamadas.push("guardarPromociones");
      lotes.promociones.push(filas.length);
      for (const f of filas) promociones.set(`${f.fuente}|${f.fuente_id}`, structuredClone(f));
    },
    darDeBaja: async (ids, cuando) => {
      llamadas.push("darDeBaja");
      lotes.bajas.push(ids.length);
      for (const fila of promociones.values()) if (ids.includes(fila.id)) fila.dada_de_baja_en = cuando;
    },
  };
  return { cliente, promociones, capturas, bancos, llamadas, lotes };
}

const AHORA = () => "2026-11-03T09:00:00.000Z";
const APLICAR = { aplicar: true, ahora: AHORA };
const PRUEBA = { aplicar: false, ahora: AHORA };
const fila = (p: PromocionIngestada, cambios: Partial<FilaPromocion> = {}): FilaPromocion => ({ ...aFila(p, "captura-vieja"), ...cambios });

describe("publicar — modo de prueba (por defecto)", () => {
  it("no escribe nada y cuenta lo que haría", async () => {
    const base = baseFalsa();
    const r = await publicar(cosecha([promocion()]), base.cliente, PRUEBA);
    expect(r).toMatchObject({ ok: true, aplicado: false, motivo: null });
    expect(r.resumen).toEqual({
      categorias: { insertar: CATEGORIAS_MODO.length, actualizar: 0 },
      bancos: { insertar: 2, actualizar: 0 },
      capturas: { nuevas: 1, sinCambios: 0 },
      promociones: { insertar: 1, actualizar: 0, reactivar: 0, darDeBaja: 0, sinCambios: 0 },
    });
    expect(base.llamadas.filter((l) => l.startsWith("guardar") || l === "darDeBaja")).toEqual([]);
  });
});

describe("publicar — con --aplicar", () => {
  it("escribe en orden: categorías, bancos, capturas, promociones y al final las bajas", async () => {
    const base = baseFalsa([fila(promocion({ fuenteId: "vieja" }))]);
    await publicar(cosecha([promocion()]), base.cliente, APLICAR);
    expect(base.llamadas.filter((l) => l !== "leerUltimasCapturas")).toEqual([
      "guardarCategorias",
      "guardarBancos",
      "guardarCapturas",
      "guardarPromociones",
      "darDeBaja",
    ]);
  });

  it("cada promo apunta a la captura de la que salió", async () => {
    const base = baseFalsa();
    await publicar(cosecha([promocion()]), base.cliente, APLICAR);
    const escrita = base.promociones.get("modo|20-paladini-icbc-ago26")!;
    expect(escrita.captura_cruda_id).toBe("captura-1");
    expect(base.capturas[0]).toMatchObject({ id: "captura-1", origen: origen("20-paladini-icbc-ago26") });
  });

  it("las partes de una promo comparten la captura", async () => {
    const base = baseFalsa();
    const partes = [promocion({ fuenteId: "p#b-1" }), promocion({ fuenteId: "p#b-2" })];
    await publicar(cosecha(partes), base.cliente, APLICAR);
    expect(base.capturas).toHaveLength(1);
    expect([...base.promociones.values()].map((f) => f.captura_cruda_id)).toEqual(["captura-1", "captura-1"]);
  });

  it(`escribe en lotes de hasta ${TAMANO_DE_LOTE} filas, cada uno en su propio pedido`, async () => {
    const base = baseFalsa();
    await publicar(cosecha(varias(120)), base.cliente, APLICAR);
    expect(base.lotes.promociones).toEqual([50, 50, 20]);
    expect(base.lotes.capturas).toEqual([50, 50, 20]);
    expect(base.llamadas.filter((l) => l === "leerUltimasCapturas")).toHaveLength(3);
  });

  it("los lotes de bajas también son de hasta 50", async () => {
    const base = baseFalsa(varias(60, "vieja").map((p) => fila(p)));
    // 60 activas y 60 nuevas: el resguardo no se activa.
    await publicar(cosecha(varias(60)), base.cliente, APLICAR);
    expect(base.lotes.bajas).toEqual([50, 10]);
  });

  it("correrlo dos veces deja la base igual y la segunda no escribe nada", async () => {
    const base = baseFalsa();
    const c = cosecha([promocion(), promocion({ fuenteId: "otra" })]);
    await publicar(c, base.cliente, APLICAR);
    const foto = structuredClone([...base.promociones.values()]);
    base.llamadas.length = 0;
    const r = await publicar(c, base.cliente, APLICAR);
    expect(r.resumen.capturas).toEqual({ nuevas: 0, sinCambios: 2 });
    expect(r.resumen.promociones).toEqual({ insertar: 0, actualizar: 0, reactivar: 0, darDeBaja: 0, sinCambios: 2 });
    expect(base.llamadas.filter((l) => l !== "leerUltimasCapturas")).toEqual([]);
    expect([...base.promociones.values()]).toEqual(foto);
  });

  it("una captura que cambió sin cambiar la promo se guarda, pero la promo no se reescribe", async () => {
    const base = baseFalsa();
    await publicar(cosecha([promocion()]), base.cliente, APLICAR);
    const r = await publicar(cosecha([promocion()], {}, () => "otro contenido"), base.cliente, APLICAR);
    expect(r.resumen.capturas).toEqual({ nuevas: 1, sinCambios: 0 });
    expect(r.resumen.promociones.sinCambios).toBe(1);
    expect(base.capturas).toHaveLength(2);
    expect(base.promociones.get("modo|20-paladini-icbc-ago26")!.captura_cruda_id).toBe("captura-1");
  });

  it("una promo que cambió se reescribe con la captura nueva", async () => {
    const base = baseFalsa();
    await publicar(cosecha([promocion()]), base.cliente, APLICAR);
    const r = await publicar(cosecha([promocion({ porcentaje: 25 })], {}, () => "con 25%"), base.cliente, APLICAR);
    expect(r.resumen.promociones.actualizar).toBe(1);
    expect(base.promociones.get("modo|20-paladini-icbc-ago26")).toMatchObject({ porcentaje: 25, captura_cruda_id: "captura-2" });
  });

  it("un numeric que la base devuelve como texto no cuenta como cambio", async () => {
    const p = promocion();
    const base = baseFalsa([fila(p, { porcentaje: "20.00", tope_monto: "10000.00" })]);
    const r = await publicar(cosecha([p]), base.cliente, PRUEBA);
    expect(r.resumen.promociones.sinCambios).toBe(1);
  });

  it("actualiza un banco cuyo nombre cambió y completa los que faltan", async () => {
    const base = baseFalsa();
    base.bancos.set(BANCO_ICBC, { id: BANCO_ICBC, nombre: "ICBC viejo" });
    const r = await publicar(cosecha([]), base.cliente, APLICAR);
    expect(r.resumen.bancos).toEqual({ insertar: 1, actualizar: 1 });
    expect(base.bancos.get(BANCO_ICBC)!.nombre).toBe("ICBC");
  });
});

describe("publicar — bajas y reactivación", () => {
  it("una promo de MODO que ya no se publica se da de baja, y no se borra", async () => {
    const vieja = promocion({ fuenteId: "vieja" });
    const base = baseFalsa([fila(vieja)]);
    const r = await publicar(cosecha([promocion()]), base.cliente, APLICAR);
    expect(r.resumen.promociones.darDeBaja).toBe(1);
    expect(base.promociones.get("modo|vieja")!.dada_de_baja_en).toBe(AHORA());
    expect(base.promociones.size).toBe(2);
  });

  it("el cliente no tiene ninguna operación de borrado", () => {
    expect(Object.keys(baseFalsa().cliente).filter((k) => /borrar|eliminar|delete/i.test(k))).toEqual([]);
  });

  it("no toca las manuales, ni las filas sin fuente_id, ni las que ya estaban dadas de baja", async () => {
    const base = baseFalsa([
      fila(promocion({ fuenteId: "manual-1" }), { fuente: "manual" }),
      fila(promocion({ fuenteId: "sin-clave" }), { fuente_id: null }),
      fila(promocion({ fuenteId: "ya-baja" }), { dada_de_baja_en: "2026-10-01T00:00:00Z" }),
    ]);
    const r = await publicar(cosecha([promocion()]), base.cliente, APLICAR);
    expect(r.resumen.promociones.darDeBaja).toBe(0);
    expect(base.promociones.get("modo|ya-baja")!.dada_de_baja_en).toBe("2026-10-01T00:00:00Z");
  });

  it("una promo que vuelve se reactiva", async () => {
    const p = promocion();
    const base = baseFalsa([fila(p, { dada_de_baja_en: "2026-10-01T00:00:00Z" })]);
    const r = await publicar(cosecha([p]), base.cliente, APLICAR);
    expect(r.resumen.promociones.reactivar).toBe(1);
    expect(base.promociones.get("modo|20-paladini-icbc-ago26")!.dada_de_baja_en).toBeNull();
  });

  it("una promo cuyo detalle falló no se da de baja: no se sabe si sigue vigente", async () => {
    const base = baseFalsa([fila(promocion({ fuenteId: "caida#b-1" })), fila(promocion({ fuenteId: "caida#b-2" }))]);
    const r = await publicar(cosecha([promocion()], { slugsSinDatos: new Set(["caida"]) }), base.cliente, APLICAR);
    expect(r.resumen.promociones.darDeBaja).toBe(0);
  });

  it("una parte que deja de publicarse (un banco que sale de la promo) se da de baja sola", async () => {
    const base = baseFalsa([fila(promocion({ fuenteId: "p#b-1" })), fila(promocion({ fuenteId: "p#b-2" }))]);
    await publicar(cosecha([promocion({ fuenteId: "p#b-1" })]), base.cliente, APLICAR);
    expect(base.promociones.get("modo|p#b-1")!.dada_de_baja_en).toBeNull();
    expect(base.promociones.get("modo|p#b-2")!.dada_de_baja_en).toBe(AHORA());
  });
});

describe("publicar — resguardo ante una corrida rota", () => {
  it("si publicaría menos de la mitad de las activas, no escribe nada", async () => {
    const base = baseFalsa(varias(40, "activa").map((p) => fila(p)));
    const r = await publicar(cosecha(varias(19)), base.cliente, APLICAR);
    expect(r).toMatchObject({ ok: false, aplicado: false, motivo: expect.stringMatching(/19 promos y hay 40 activas/) });
    expect(base.llamadas).toEqual([]);
    expect([...base.promociones.values()].every((f) => f.dada_de_baja_en === null)).toBe(true);
  });

  it("con la mitad justa publica", async () => {
    const base = baseFalsa(varias(40, "activa").map((p) => fila(p)));
    expect((await publicar(cosecha(varias(20)), base.cliente, APLICAR)).ok).toBe(true);
  });

  it(`con menos de ${MINIMO_PARA_RESGUARDO} activas no se aplica (primera carga, base local)`, async () => {
    const base = baseFalsa(varias(MINIMO_PARA_RESGUARDO - 1, "activa").map((p) => fila(p)));
    const r = await publicar(cosecha([]), base.cliente, APLICAR);
    expect(r.ok).toBe(true);
    expect(r.resumen.promociones.darDeBaja).toBe(MINIMO_PARA_RESGUARDO - 1);
  });
});

describe("publicar — consistencia", () => {
  it("una promo sin captura en la cosecha es un error, no una fila sin trazabilidad", async () => {
    const base = baseFalsa();
    const c = { ...cosecha([promocion()]), capturas: [] };
    await expect(publicar(c, base.cliente, APLICAR)).rejects.toThrow(/no tiene captura/);
  });
});


describe("leerEntorno", () => {
  it("devuelve la URL y la clave", () => {
    expect(leerEntorno({ SUPABASE_URL: "https://abc.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "clave-secreta" })).toEqual({
      url: "https://abc.supabase.co",
      clave: "clave-secreta",
    });
  });

  it("nombra las variables que faltan, sin imprimir ningún valor", () => {
    let mensaje = "";
    try {
      leerEntorno({ SUPABASE_URL: "https://abc.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "" });
    } catch (e) {
      mensaje = (e as Error).message;
    }
    expect(mensaje).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(mensaje).not.toContain("abc.supabase.co");
  });

  it("falta todo: nombra las dos", () => {
    expect(() => leerEntorno({})).toThrow(/SUPABASE_URL.*SUPABASE_SERVICE_ROLE_KEY/);
  });

  it("una URL inválida es un error que no incluye la clave", () => {
    let mensaje = "";
    try {
      leerEntorno({ SUPABASE_URL: "no-es-url", SUPABASE_SERVICE_ROLE_KEY: "clave-secreta" });
    } catch (e) {
      mensaje = (e as Error).message;
    }
    expect(mensaje).toMatch(/SUPABASE_URL/);
    expect(mensaje).not.toContain("clave-secreta");
  });
});

describe("leerEntorno — solo https salvo localhost", () => {
  it("rechaza http contra un host remoto", () => {
    expect(() => leerEntorno({ SUPABASE_URL: "http://abc.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "k" })).toThrow(/https/);
  });

  it("acepta http contra localhost y 127.0.0.1", () => {
    expect(leerEntorno({ SUPABASE_URL: "http://127.0.0.1:54321", SUPABASE_SERVICE_ROLE_KEY: "k" }).url).toBe("http://127.0.0.1:54321");
    expect(leerEntorno({ SUPABASE_URL: "http://localhost:54321", SUPABASE_SERVICE_ROLE_KEY: "k" }).url).toBe("http://localhost:54321");
  });
});
