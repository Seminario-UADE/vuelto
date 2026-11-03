import { CATEGORIAS_MODO } from "@vuelto/motor";
import { describe, expect, it } from "vitest";
import { cargarCorpus, leerEntorno, TAMANO_DE_LOTE } from "./cargar.ts";
import type { ClienteCorpus } from "./cargar.ts";
import { aFila } from "./filas.ts";
import type { FilaPromocion } from "./filas.ts";
import { BANCO_GALICIA, BANCO_ICBC, entrada } from "./test/fabricas.ts";
import type { EntradaCorpus, Insumos } from "./tipos.ts";

const BANCOS = [
  { id: BANCO_ICBC, name: "ICBC" },
  { id: BANCO_GALICIA, name: "Galicia" },
];

function insumos(promociones: EntradaCorpus[]): Insumos {
  return { archivo: { version: 1, promociones }, exclusiones: [], gruposTope: {}, bancos: BANCOS };
}

interface BaseFalsa {
  cliente: ClienteCorpus;
  promociones: Map<string, FilaPromocion>;
  bancos: Map<string, { id: string; nombre: string }>;
  categorias: Map<number, { id: number; nombre: string }>;
  llamadas: string[];
  lotes: { promociones: number[]; bajas: number[]; bancos: number[] };
  enviadas: FilaPromocion[];
}

/** Una base en memoria que aplica de verdad lo que se le escribe: sirve para probar la idempotencia. */
function baseFalsa(inicial: FilaPromocion[] = []): BaseFalsa {
  const promociones = new Map<string, FilaPromocion>();
  for (const f of inicial) promociones.set(`${f.fuente}|${f.fuente_id}`, structuredClone(f));
  const bancos = new Map<string, { id: string; nombre: string }>();
  const categorias = new Map<number, { id: number; nombre: string }>();
  const llamadas: string[] = [];
  const lotes = { promociones: [] as number[], bajas: [] as number[], bancos: [] as number[] };
  const enviadas: FilaPromocion[] = [];
  const cliente: ClienteCorpus = {
    leerCategorias: async () => {
      llamadas.push("leerCategorias");
      return [...categorias.values()];
    },
    leerBancos: async () => {
      llamadas.push("leerBancos");
      return [...bancos.values()];
    },
    leerPromociones: async () => {
      llamadas.push("leerPromociones");
      return [...promociones.values()].map((f) => structuredClone(f));
    },
    guardarCategorias: async (filas) => {
      llamadas.push("guardarCategorias");
      for (const f of filas) categorias.set(f.id, { ...f });
    },
    guardarBancos: async (filas) => {
      llamadas.push("guardarBancos");
      lotes.bancos.push(filas.length);
      for (const f of filas) bancos.set(f.id, { ...f });
    },
    guardarPromociones: async (filas) => {
      llamadas.push("guardarPromociones");
      lotes.promociones.push(filas.length);
      for (const f of filas) {
        enviadas.push(f);
        promociones.set(`${f.fuente}|${f.fuente_id}`, structuredClone(f));
      }
    },
    darDeBaja: async (ids, cuando) => {
      llamadas.push("darDeBaja");
      lotes.bajas.push(ids.length);
      for (const fila of promociones.values()) if (ids.includes(fila.id)) fila.dada_de_baja_en = cuando;
    },
  };
  return { cliente, promociones, bancos, categorias, llamadas, lotes, enviadas };
}

const AHORA = () => "2026-11-02T20:00:00.000Z";

/** Una fila de la base para una entrada, como la dejaría una carga anterior. */
function filaDe(e: EntradaCorpus, cambios: Partial<FilaPromocion> = {}): FilaPromocion {
  return { ...aFila(e), ...cambios };
}

describe("cargarCorpus — modo de prueba (por defecto)", () => {
  it("no escribe nada y cuenta lo que haría", async () => {
    const base = baseFalsa();
    const r = await cargarCorpus(insumos([entrada(), entrada({ fuenteId: "otra" })]), base.cliente, { aplicar: false, ahora: AHORA });
    expect(r.ok).toBe(true);
    expect(r.aplicado).toBe(false);
    expect(r.resumen.promociones).toMatchObject({ insertar: 2, actualizar: 0, reactivar: 0, darDeBaja: 0, sinCambios: 0 });
    expect(r.resumen.bancos).toEqual({ insertar: 2, actualizar: 0 });
    expect(r.resumen.categorias).toEqual({ insertar: CATEGORIAS_MODO.length, actualizar: 0 });
    expect(base.llamadas.filter((l) => l.startsWith("guardar") || l === "darDeBaja")).toEqual([]);
  });
});

describe("cargarCorpus — con --aplicar", () => {
  it("escribe en orden: categorías, bancos, promociones y al final las bajas", async () => {
    const base = baseFalsa([filaDe(entrada({ fuenteId: "vieja" }))]);
    await cargarCorpus(insumos([entrada()]), base.cliente, { aplicar: true, ahora: AHORA });
    const escrituras = base.llamadas.filter((l) => l.startsWith("guardar") || l === "darDeBaja");
    expect(escrituras).toEqual(["guardarCategorias", "guardarBancos", "guardarPromociones", "darDeBaja"]);
  });

  it(`escribe en lotes de hasta ${TAMANO_DE_LOTE} filas, cada uno en su propio pedido`, async () => {
    const base = baseFalsa();
    const muchas = Array.from({ length: 120 }, (_, i) => entrada({ fuenteId: `promo-${String(i).padStart(3, "0")}` }));
    await cargarCorpus(insumos(muchas), base.cliente, { aplicar: true, ahora: AHORA });
    expect(TAMANO_DE_LOTE).toBe(50);
    expect(base.lotes.promociones).toEqual([50, 50, 20]);
    expect(base.promociones.size).toBe(120);
  });

  it("los lotes de bajas también son de hasta 50", async () => {
    const viejas = Array.from({ length: 70 }, (_, i) => filaDe(entrada({ fuenteId: `vieja-${i}` })));
    const base = baseFalsa(viejas);
    await cargarCorpus(insumos([]), base.cliente, { aplicar: true, ahora: AHORA });
    expect(base.lotes.bajas).toEqual([50, 20]);
  });

  it("correrlo dos veces deja la base igual y la segunda no escribe nada", async () => {
    const base = baseFalsa();
    const datos = insumos([entrada(), entrada({ fuenteId: "otra", titulo: "otra promo" })]);
    await cargarCorpus(datos, base.cliente, { aplicar: true, ahora: AHORA });
    const foto = structuredClone([...base.promociones.values()]);
    base.llamadas.length = 0;
    const segunda = await cargarCorpus(datos, base.cliente, { aplicar: true, ahora: AHORA });
    expect(segunda.resumen.promociones).toMatchObject({ insertar: 0, actualizar: 0, reactivar: 0, darDeBaja: 0, sinCambios: 2 });
    expect(segunda.resumen.bancos).toEqual({ insertar: 0, actualizar: 0 });
    expect(segunda.resumen.categorias).toEqual({ insertar: 0, actualizar: 0 });
    expect(base.llamadas.filter((l) => l.startsWith("guardar") || l === "darDeBaja")).toEqual([]);
    expect([...base.promociones.values()]).toEqual(foto);
  });

  it("un numeric que la base devuelve como texto no cuenta como cambio", async () => {
    const e = entrada();
    const base = baseFalsa([filaDe(e, { porcentaje: "20.00", tope_monto: "10000.00" })]);
    const r = await cargarCorpus(insumos([e]), base.cliente, { aplicar: true, ahora: AHORA });
    expect(r.resumen.promociones).toMatchObject({ actualizar: 0, sinCambios: 1 });
  });

  it("detecta un cambio y actualiza", async () => {
    const e = entrada();
    const base = baseFalsa([filaDe(e, { titulo: "título viejo" })]);
    const r = await cargarCorpus(insumos([e]), base.cliente, { aplicar: true, ahora: AHORA });
    expect(r.resumen.promociones).toMatchObject({ insertar: 0, actualizar: 1 });
    expect(base.promociones.get("manual|20-paladini-icbc-ago26")!.titulo).toBe(e.titulo);
  });

  it("detecta un cambio en los fragmentos, aunque vengan con las claves en otro orden", async () => {
    const e = entrada({ acumulable: false, jurisdiccion: "caba", fragmentosFuente: { acumulable: "A", jurisdiccion: "B" } });
    const igual = filaDe(e, { fragmentos_fuente: { jurisdiccion: "B", acumulable: "A" } });
    const cambiado = filaDe(e, { fragmentos_fuente: { jurisdiccion: "B", acumulable: "OTRO" } });
    const a = await cargarCorpus(insumos([e]), baseFalsa([igual]).cliente, { aplicar: false, ahora: AHORA });
    const b = await cargarCorpus(insumos([e]), baseFalsa([cambiado]).cliente, { aplicar: false, ahora: AHORA });
    expect(a.resumen.promociones.sinCambios).toBe(1);
    expect(b.resumen.promociones.actualizar).toBe(1);
  });

  it("actualiza un banco cuyo nombre cambió y completa los que faltan", async () => {
    const base = baseFalsa();
    base.bancos.set(BANCO_ICBC, { id: BANCO_ICBC, nombre: "Nombre viejo" });
    const r = await cargarCorpus(insumos([]), base.cliente, { aplicar: true, ahora: AHORA });
    expect(r.resumen.bancos).toEqual({ insertar: 1, actualizar: 1 });
    expect(base.bancos.get(BANCO_ICBC)!.nombre).toBe("ICBC");
  });
});

describe("cargarCorpus — resumen por categoría", () => {
  it("cuenta las promos del archivo por categoría", async () => {
    const r = await cargarCorpus(
      insumos([entrada({ fuenteId: "a", categoriaId: 1 }), entrada({ fuenteId: "b", categoriaId: 1 }), entrada({ fuenteId: "c", categoriaId: 4 })]),
      baseFalsa().cliente,
      { aplicar: false, ahora: AHORA },
    );
    expect(r.resumen.promociones.porCategoria).toEqual({ 1: 2, 4: 1 });
  });
});

describe("cargarCorpus — bajas y reactivación", () => {
  it("una promo manual que ya no está en el archivo se da de baja, y no se borra", async () => {
    const vieja = filaDe(entrada({ fuenteId: "vieja" }));
    const base = baseFalsa([vieja]);
    const r = await cargarCorpus(insumos([entrada()]), base.cliente, { aplicar: true, ahora: AHORA });
    expect(r.resumen.promociones.darDeBaja).toBe(1);
    expect(base.promociones.get("manual|vieja")!.dada_de_baja_en).toBe("2026-11-02T20:00:00.000Z");
    expect(base.promociones.has("manual|vieja")).toBe(true);
  });

  it("el cliente no tiene ninguna operación de borrado", () => {
    expect(Object.keys(baseFalsa().cliente).filter((k) => /borrar|delete|eliminar/i.test(k))).toEqual([]);
  });

  it("no toca las de MODO, ni las manuales sin fuente_id, ni las que ya estaban dadas de baja", async () => {
    const base = baseFalsa([
      filaDe(entrada({ fuenteId: "de-modo" }), { fuente: "modo" }),
      filaDe(entrada({ fuenteId: "sin-clave" }), { fuente_id: null }),
      filaDe(entrada({ fuenteId: "ya-baja" }), { dada_de_baja_en: "2026-10-01T00:00:00.000Z" }),
    ]);
    const r = await cargarCorpus(insumos([]), base.cliente, { aplicar: true, ahora: AHORA });
    expect(r.resumen.promociones.darDeBaja).toBe(0);
    expect(base.llamadas).not.toContain("darDeBaja");
    expect(base.promociones.get("manual|ya-baja")!.dada_de_baja_en).toBe("2026-10-01T00:00:00.000Z");
  });

  it("una promo que vuelve al archivo se reactiva", async () => {
    const e = entrada();
    const base = baseFalsa([filaDe(e, { dada_de_baja_en: "2026-10-01T00:00:00.000Z" })]);
    const r = await cargarCorpus(insumos([e]), base.cliente, { aplicar: true, ahora: AHORA });
    expect(r.resumen.promociones.reactivar).toBe(1);
    expect(base.promociones.get("manual|20-paladini-icbc-ago26")!.dada_de_baja_en).toBeNull();
  });
});

describe("cargarCorpus — convivencia con la ingesta (research D2)", () => {
  it("no escribe una manual cuyo fuente_id ya existe como modo activa", async () => {
    const e = entrada();
    const base = baseFalsa([filaDe(e, { fuente: "modo" })]);
    const r = await cargarCorpus(insumos([e]), base.cliente, { aplicar: true, ahora: AHORA });
    expect(r.resumen.promociones.omitidasPorModo).toEqual(["20-paladini-icbc-ago26"]);
    expect(r.resumen.promociones.insertar).toBe(0);
    expect(base.promociones.has("manual|20-paladini-icbc-ago26")).toBe(false);
  });

  it("una promo partida (slug#b-…) también se omite si existe la de modo con el slug", async () => {
    const entradaPartida = entrada({ fuenteId: "promo-x#b-0123abcd" });
    const base = baseFalsa([filaDe(entrada({ fuenteId: "promo-x" }), { fuente: "modo" })]);
    const r = await cargarCorpus(insumos([entradaPartida]), base.cliente, { aplicar: true, ahora: AHORA });
    expect(r.resumen.promociones.omitidasPorModo).toEqual(["promo-x#b-0123abcd"]);
    expect(r.resumen.promociones.insertar).toBe(0);
    expect(base.promociones.size).toBe(1);
  });

  it("da de baja la manual activa cuando ya existe la de modo, aunque siga en el archivo", async () => {
    const e = entrada();
    const manual = filaDe(e);
    const deModo = filaDe(e, { fuente: "modo", id: "e1000000-0000-4000-8000-000000000001" });
    const base = baseFalsa([manual, deModo]);
    const r = await cargarCorpus(insumos([e]), base.cliente, { aplicar: true, ahora: AHORA });
    expect(r.resumen.promociones).toMatchObject({ darDeBaja: 1, omitidasPorModo: ["20-paladini-icbc-ago26"] });
    expect(base.promociones.get("manual|20-paladini-icbc-ago26")!.dada_de_baja_en).toBe(AHORA());
    expect(base.promociones.get("modo|20-paladini-icbc-ago26")!.dada_de_baja_en).toBeNull();
  });

  it("también da de baja una manual partida (slug#b-…) si la de modo tiene ese slug", async () => {
    const partida = entrada({ fuenteId: "promo-x#b-0123abcd" });
    const deModo = filaDe(entrada({ fuenteId: "promo-x" }), { fuente: "modo" });
    const base = baseFalsa([filaDe(partida), deModo]);
    const r = await cargarCorpus(insumos([partida]), base.cliente, { aplicar: true, ahora: AHORA });
    expect(r.resumen.promociones.darDeBaja).toBe(1);
    expect(base.promociones.get("manual|promo-x#b-0123abcd")!.dada_de_baja_en).toBe(AHORA());
  });

  it("si la de modo está dada de baja, la manual se escribe normalmente", async () => {
    const e = entrada();
    const base = baseFalsa([filaDe(e, { fuente: "modo", dada_de_baja_en: "2026-10-01T00:00:00.000Z" })]);
    const r = await cargarCorpus(insumos([e]), base.cliente, { aplicar: true, ahora: AHORA });
    expect(r.resumen.promociones.omitidasPorModo).toEqual([]);
    expect(r.resumen.promociones.insertar).toBe(1);
  });
});

describe("cargarCorpus — lo que no se manda y lo que se valida antes", () => {
  it("no envía la revisión ni la marca de fixture: no son columnas", async () => {
    const base = baseFalsa();
    await cargarCorpus(
      insumos([entrada({ fixture: true, revision: { verificadaEl: "2026-11-02", revisor: "persona-x", notas: ["nota"] } })]),
      base.cliente,
      { aplicar: true, ahora: AHORA },
    );
    const claves = Object.keys(base.enviadas[0]!);
    expect(claves).not.toContain("revision");
    expect(claves).not.toContain("fixture");
    expect(JSON.stringify(base.enviadas)).not.toContain("persona-x");
    expect(base.enviadas[0]!.dada_de_baja_en).toBeNull();
  });

  it("un archivo inválido no toca la base, ni siquiera para leer", async () => {
    const base = baseFalsa();
    const r = await cargarCorpus(insumos([entrada({ porcentaje: 150 })]), base.cliente, { aplicar: true, ahora: AHORA });
    expect(r.ok).toBe(false);
    expect(r.errores.map((e) => e.regla)).toContain("porcentaje");
    expect(base.llamadas).toEqual([]);
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
