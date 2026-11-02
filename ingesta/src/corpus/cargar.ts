/**
 * Carga remota del corpus al Supabase al que apunta el entorno (research D1, D2).
 *
 *   node --env-file=supabase/.env ingesta/src/corpus/cargar.ts            # prueba: no escribe
 *   node --env-file=supabase/.env ingesta/src/corpus/cargar.ts --aplicar  # escribe
 *
 * Es idempotente: cargar dos veces seguidas no cambia nada (el trigger de
 * `promociones` no mueve `actualizada_en` si no cambia ningún valor, así la app
 * no vuelve a bajar el corpus). Una promo manual que sale del archivo se da de
 * baja (`dada_de_baja_en`) y nunca se borra; si vuelve, se reactiva.
 *
 * Escribe con la service role key, que se lee solo del entorno de quien corre el
 * comando (constitución §IV): nunca va al repo ni se imprime. Escribe en lotes de
 * hasta 50 filas, cada uno en su propio pedido, para que cada confirmación sea
 * corta (contrato de escritura de `docs/architecture/04-infrastructure.md`).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { CATEGORIAS_MODO } from "@vuelto/motor";
import { ejecutarComoScript, parsearArgumentos, raizDelRepo } from "./args.ts";
import { COLUMNAS_PROMOCION, aFila, comparable } from "./filas.ts";
import type { FilaEscrita, FilaPromocion } from "./filas.ts";
import { validarInsumos } from "./generar.ts";
import { slugBase } from "./ids.ts";
import { leerInsumos } from "./insumos.ts";
import { FUENTE_CORPUS } from "./tipos.ts";
import type { Insumos } from "./tipos.ts";
import type { Hallazgo } from "./validar.ts";

export const TAMANO_DE_LOTE = 50;

/**
 * Lo que la carga necesita de la base. No tiene ninguna operación de borrado a
 * propósito. En los tests es una base en memoria; en producción, `supabase-js`.
 */
export interface ClienteCorpus {
  leerCategorias(): Promise<{ id: number; nombre: string }[]>;
  leerBancos(): Promise<{ id: string; nombre: string }[]>;
  /** Las promos de fuente `manual` y `modo`. */
  leerPromociones(): Promise<FilaPromocion[]>;
  guardarCategorias(filas: { id: number; nombre: string }[]): Promise<void>;
  guardarBancos(filas: { id: string; nombre: string }[]): Promise<void>;
  /** Upsert por `(fuente, fuente_id)` de un lote. */
  guardarPromociones(filas: FilaPromocion[]): Promise<void>;
  darDeBaja(ids: string[], cuando: string): Promise<void>;
}

export interface ResumenCarga {
  categorias: { insertar: number; actualizar: number };
  bancos: { insertar: number; actualizar: number };
  promociones: {
    insertar: number;
    actualizar: number;
    reactivar: number;
    darDeBaja: number;
    sinCambios: number;
    /** `fuente_id` de las manuales que no se escriben porque ya existe la promo como `modo` activa. */
    omitidasPorModo: string[];
    /** Cuántas promos del archivo hay por categoría. */
    porCategoria: Record<number, number>;
  };
}

export interface ResultadoCarga {
  ok: boolean;
  aplicado: boolean;
  errores: Hallazgo[];
  avisos: Hallazgo[];
  resumen: ResumenCarga;
}

export interface OpcionesCarga {
  aplicar: boolean;
  /** Instante ISO de «ahora», para `dada_de_baja_en`. */
  ahora: () => string;
}

const resumenVacio = (): ResumenCarga => ({
  categorias: { insertar: 0, actualizar: 0 },
  bancos: { insertar: 0, actualizar: 0 },
  promociones: { insertar: 0, actualizar: 0, reactivar: 0, darDeBaja: 0, sinCambios: 0, omitidasPorModo: [], porCategoria: {} },
});

/** Las filas sin `fuente_id` no son del corpus: no se leen ni se tocan. */
const tieneClave = (fila: FilaPromocion): fila is FilaEscrita => fila.fuente_id !== null;

function lotes<T>(items: readonly T[]): T[][] {
  const resultado: T[][] = [];
  for (let i = 0; i < items.length; i += TAMANO_DE_LOTE) resultado.push(items.slice(i, i + TAMANO_DE_LOTE));
  return resultado;
}

export async function cargarCorpus(
  insumos: Insumos,
  cliente: ClienteCorpus,
  opciones: OpcionesCarga,
): Promise<ResultadoCarga> {
  // Se valida todo antes de tocar la base: un archivo inválido no escribe (ni lee) nada.
  const { errores, avisos } = validarInsumos(insumos);
  if (errores.length > 0) return { ok: false, aplicado: false, errores, avisos, resumen: resumenVacio() };

  const resumen = resumenVacio();

  // Catálogos.
  const categoriasActuales = new Map((await cliente.leerCategorias()).map((c) => [c.id, c.nombre]));
  const categoriasAEscribir = CATEGORIAS_MODO.filter((c) => categoriasActuales.get(c.id) !== c.nombre).map((c) => ({
    id: c.id,
    nombre: c.nombre,
  }));
  for (const c of categoriasAEscribir) resumen.categorias[categoriasActuales.has(c.id) ? "actualizar" : "insertar"]++;

  const bancosActuales = new Map((await cliente.leerBancos()).map((b) => [b.id, b.nombre]));
  const bancosAEscribir = insumos.bancos
    .filter((b) => bancosActuales.get(b.id) !== b.name)
    .map((b) => ({ id: b.id, nombre: b.name }));
  for (const b of bancosAEscribir) resumen.bancos[bancosActuales.has(b.id) ? "actualizar" : "insertar"]++;

  // Promociones.
  const existentes = await cliente.leerPromociones();
  const manuales = new Map<string, FilaEscrita>();
  // Las de MODO se identifican por el slug: una manual partida (`slug#b-…`) convive con la misma promo de MODO.
  const modoActivas = new Set<string>();
  for (const fila of existentes) {
    if (!tieneClave(fila)) continue;
    if (fila.fuente === FUENTE_CORPUS) manuales.set(fila.fuente_id, fila);
    else if (fila.fuente === "modo" && fila.dada_de_baja_en === null) modoActivas.add(slugBase(fila.fuente_id));
  }

  const deseadas: FilaEscrita[] = insumos.archivo.promociones.map(aFila);
  const enElArchivo = new Set(deseadas.map((f) => f.fuente_id));
  const aEscribir: FilaEscrita[] = [];
  for (const fila of deseadas) {
    resumen.promociones.porCategoria[fila.categoria_id] = (resumen.promociones.porCategoria[fila.categoria_id] ?? 0) + 1;
    if (modoActivas.has(slugBase(fila.fuente_id))) {
      resumen.promociones.omitidasPorModo.push(fila.fuente_id);
      continue;
    }
    const actual = manuales.get(fila.fuente_id);
    if (actual === undefined) {
      resumen.promociones.insertar++;
      aEscribir.push(fila);
    } else if (actual.dada_de_baja_en !== null) {
      resumen.promociones.reactivar++;
      aEscribir.push(fila);
    } else if (comparable(actual) !== comparable(fila)) {
      resumen.promociones.actualizar++;
      aEscribir.push(fila);
    } else {
      resumen.promociones.sinCambios++;
    }
  }
  const aDarDeBaja = [...manuales.values()].filter((f) => f.dada_de_baja_en === null && !enElArchivo.has(f.fuente_id));
  resumen.promociones.darDeBaja = aDarDeBaja.length;

  if (opciones.aplicar) {
    if (categoriasAEscribir.length > 0) await cliente.guardarCategorias(categoriasAEscribir);
    for (const lote of lotes(bancosAEscribir)) await cliente.guardarBancos(lote);
    for (const lote of lotes(aEscribir)) await cliente.guardarPromociones(lote);
    const cuando = opciones.ahora();
    for (const lote of lotes(aDarDeBaja.map((f) => f.id))) await cliente.darDeBaja(lote, cuando);
  }
  return { ok: true, aplicado: opciones.aplicar, errores, avisos, resumen };
}

// ---------- Entorno ----------

/**
 * `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` del entorno. Los mensajes de error
 * nombran la variable pero nunca imprimen un valor: la key es una llave maestra.
 */
export function leerEntorno(env: Readonly<Record<string, string | undefined>>): { url: string; clave: string } {
  const url = env.SUPABASE_URL?.trim() ?? "";
  const clave = env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
  const faltan = [url === "" ? "SUPABASE_URL" : null, clave === "" ? "SUPABASE_SERVICE_ROLE_KEY" : null].filter(
    (x): x is string => x !== null,
  );
  if (faltan.length > 0) throw new Error(`Faltan variables de entorno: ${faltan.join(", ")}`);
  let parseada: URL;
  try {
    parseada = new URL(url);
  } catch (error) {
    throw new Error("SUPABASE_URL no es una URL válida", { cause: error });
  }
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(parseada.hostname);
  if (parseada.protocol !== "https:" && !(parseada.protocol === "http:" && local)) {
    throw new Error("SUPABASE_URL tiene que ser https (http solo para localhost)");
  }
  return { url, clave };
}

// ---------- Cliente real y línea de comandos ----------

/* v8 ignore start */
export function crearClienteSupabase(url: string, clave: string, opciones: { fetch?: typeof fetch } = {}): ClienteCorpus {
  const supabase = createClient(url, clave, {
    auth: { persistSession: false, autoRefreshToken: false },
    ...(opciones.fetch === undefined ? {} : { global: { fetch: opciones.fetch } }),
  });
  const fallar = (donde: string, error: { message: string } | null): void => {
    if (error !== null) throw new Error(`${donde}: ${error.message}`);
  };
  return {
    async leerCategorias() {
      const { data, error } = await supabase.from("categorias").select("id,nombre").order("id");
      fallar("leer categorias", error);
      return (data ?? []) as { id: number; nombre: string }[];
    },
    async leerBancos() {
      const { data, error } = await supabase.from("bancos").select("id,nombre").order("id").range(0, 999);
      fallar("leer bancos", error);
      return (data ?? []) as { id: string; nombre: string }[];
    },
    async leerPromociones() {
      const filas: FilaPromocion[] = [];
      for (let desde = 0; ; desde += 1000) {
        const { data, error } = await supabase
          .from("promociones")
          .select(COLUMNAS_PROMOCION.join(","))
          .in("fuente", ["manual", "modo"])
          .order("id")
          .range(desde, desde + 999);
        fallar("leer promociones", error);
        const pagina = (data ?? []) as unknown as FilaPromocion[];
        filas.push(...pagina);
        if (pagina.length < 1000) return filas;
      }
    },
    async guardarCategorias(filas) {
      fallar("guardar categorias", (await supabase.from("categorias").upsert(filas, { onConflict: "id" })).error);
    },
    async guardarBancos(filas) {
      fallar("guardar bancos", (await supabase.from("bancos").upsert(filas, { onConflict: "id" })).error);
    },
    async guardarPromociones(filas) {
      fallar(
        "guardar promociones",
        (await supabase.from("promociones").upsert(filas, { onConflict: "fuente,fuente_id" })).error,
      );
    },
    async darDeBaja(ids, cuando) {
      fallar("dar de baja", (await supabase.from("promociones").update({ dada_de_baja_en: cuando }).in("id", ids)).error);
    },
  };
}

async function main(argv: readonly string[]): Promise<void> {
  const { banderas } = parsearArgumentos(argv, ["aplicar"]);
  const raiz = raizDelRepo();
  const insumos = leerInsumos((ruta) => readFileSync(resolve(raiz, ruta), "utf8"));
  const { url, clave } = leerEntorno(process.env);
  const aplicar = banderas.includes("aplicar");
  console.log(`Base: ${new URL(url).host} — ${aplicar ? "se va a ESCRIBIR" : "modo de prueba (no escribe)"}`);
  const r = await cargarCorpus(insumos, crearClienteSupabase(url, clave), { aplicar, ahora: () => new Date().toISOString() });
  for (const a of r.avisos) console.warn(`aviso [${a.regla}] ${a.mensaje}`);
  for (const e of r.errores) console.error(`error [${e.regla}] ${e.fuenteId ?? "-"}: ${e.mensaje}`);
  if (!r.ok) {
    console.error("El corpus es inválido: no se tocó la base.");
    process.exitCode = 1;
    return;
  }
  console.log(JSON.stringify(r.resumen, null, 2));
  console.log(aplicar ? "Listo." : "No se escribió nada. Corré con --aplicar para cargar.");
}

ejecutarComoScript(import.meta.url, () => main(process.argv.slice(2)));
/* v8 ignore stop */
