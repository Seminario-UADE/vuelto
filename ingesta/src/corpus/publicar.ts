/**
 * Publicación en Supabase de lo que cosechó la ingesta (ADR-011, research D1 y D2).
 *
 * Orden: categorías, bancos, capturas crudas y promociones (las promos apuntan a su
 * captura y a su banco). Es idempotente: publicar dos veces lo mismo no cambia nada
 * (el trigger de `promociones` no mueve `actualizada_en` si no cambia ningún valor,
 * así la app no vuelve a bajar el corpus). Una captura solo se agrega si el contenido
 * cambió. Una promo de MODO que deja de publicarse se da de baja (`dada_de_baja_en`)
 * y nunca se borra; si vuelve, se reactiva.
 *
 * Dos resguardos para que una corrida rota no vacíe el corpus:
 * - una promo cuyo detalle no se pudo bajar (error de red o de servidor) no se toca;
 * - si la corrida publicaría menos de la mitad de las promos activas, no escribe nada.
 *
 * Escribe con la service role key, que se lee solo del entorno (constitución §IV):
 * nunca va al repo ni se imprime. Escribe en lotes de hasta 50 filas, cada uno en su
 * propio pedido, para que cada confirmación sea corta (contrato de escritura de
 * `docs/architecture/04-infrastructure.md`).
 */
import { createClient } from "@supabase/supabase-js";
import { CATEGORIAS_MODO } from "@vuelto/motor";
import { COLUMNAS_PROMOCION, aFila, comparable } from "./filas.ts";
import type { FilaEscrita, FilaPromocion } from "./filas.ts";
import { slugBase } from "./ids.ts";
import { FUENTE_INGESTA } from "./tipos.ts";
import type { BancoCatalogo, PromocionIngestada } from "./tipos.ts";

export const TAMANO_DE_LOTE = 50;

/** Con menos promos activas que esto, el resguardo de la mitad no se aplica (la primera carga, una base local). */
export const MINIMO_PARA_RESGUARDO = 20;

export interface Captura {
  /** La URL pública del detalle de la promo. */
  origen: string;
  /** La tarjeta y el detalle, en JSON canónico (claves ordenadas): dos capturas iguales dan el mismo texto. */
  contenido: string;
}

/**
 * Lo que la publicación necesita de la base. No tiene ninguna operación de borrado a
 * propósito. En los tests es una base en memoria; en producción, `supabase-js`.
 */
export interface ClienteBase {
  leerCategorias(): Promise<{ id: number; nombre: string }[]>;
  leerBancos(): Promise<{ id: string; nombre: string }[]>;
  /** Las promos de fuente `modo`. */
  leerPromociones(): Promise<FilaPromocion[]>;
  /** La última captura de cada origen pedido (como mucho 50 orígenes por llamada). */
  leerUltimasCapturas(origenes: string[]): Promise<({ id: string } & Captura)[]>;
  guardarCategorias(filas: { id: number; nombre: string }[]): Promise<void>;
  guardarBancos(filas: { id: string; nombre: string }[]): Promise<void>;
  /** Inserta un lote y devuelve el id que le tocó a cada origen. */
  guardarCapturas(filas: Captura[]): Promise<{ id: string; origen: string }[]>;
  /** Upsert por `(fuente, fuente_id)` de un lote. */
  guardarPromociones(filas: FilaPromocion[]): Promise<void>;
  darDeBaja(ids: string[], cuando: string): Promise<void>;
}

/** Lo que cosechó una corrida de la ingesta. */
export interface Cosecha {
  /** El catálogo de bancos de MODO del día. */
  bancos: BancoCatalogo[];
  /** Una por promo con detalle, publicable o no: el registro crudo de lo que dijo MODO. */
  capturas: Captura[];
  /** Las promos que pasaron el mapeo y la validación, con el origen de su captura. */
  publicables: { promocion: PromocionIngestada; origen: string }[];
  /** Slugs cuyo detalle falló: no se sabe si siguen vigentes, así que sus filas no se tocan. */
  slugsSinDatos: ReadonlySet<string>;
}

export interface ResumenPublicacion {
  categorias: { insertar: number; actualizar: number };
  bancos: { insertar: number; actualizar: number };
  capturas: { nuevas: number; sinCambios: number };
  promociones: { insertar: number; actualizar: number; reactivar: number; darDeBaja: number; sinCambios: number };
}

export interface ResultadoPublicacion {
  ok: boolean;
  aplicado: boolean;
  /** Por qué no se escribió nada, si `ok` es `false`. */
  motivo: string | null;
  resumen: ResumenPublicacion;
}

export interface OpcionesPublicacion {
  aplicar: boolean;
  /** Instante ISO de «ahora», para `dada_de_baja_en`. */
  ahora: () => string;
}

const resumenVacio = (): ResumenPublicacion => ({
  categorias: { insertar: 0, actualizar: 0 },
  bancos: { insertar: 0, actualizar: 0 },
  capturas: { nuevas: 0, sinCambios: 0 },
  promociones: { insertar: 0, actualizar: 0, reactivar: 0, darDeBaja: 0, sinCambios: 0 },
});

/** Las filas sin `fuente_id` no son de la ingesta: no se leen ni se tocan. */
const tieneClave = (fila: FilaPromocion): fila is FilaEscrita => fila.fuente_id !== null;

function lotes<T>(items: readonly T[]): T[][] {
  const resultado: T[][] = [];
  for (let i = 0; i < items.length; i += TAMANO_DE_LOTE) resultado.push(items.slice(i, i + TAMANO_DE_LOTE));
  return resultado;
}

/** Id provisorio de una captura que todavía no se escribió (solo en modo de prueba). */
const SIN_ESCRIBIR = "00000000-0000-0000-0000-000000000000";

export async function publicar(
  cosecha: Cosecha,
  cliente: ClienteBase,
  opciones: OpcionesPublicacion,
): Promise<ResultadoPublicacion> {
  const resumen = resumenVacio();

  // Promociones: primero el resguardo, antes de escribir nada.
  const existentes = (await cliente.leerPromociones()).filter(tieneClave).filter((f) => f.fuente === FUENTE_INGESTA);
  const porClave = new Map(existentes.map((f) => [f.fuente_id, f]));
  const activas = existentes.filter((f) => f.dada_de_baja_en === null);
  const deseadas = new Set(cosecha.publicables.map((p) => p.promocion.fuenteId));
  if (activas.length >= MINIMO_PARA_RESGUARDO && deseadas.size * 2 < activas.length) {
    return {
      ok: false,
      aplicado: false,
      motivo: `La corrida publicaría ${deseadas.size} promos y hay ${activas.length} activas: menos de la mitad. Puede ser un cambio de formato de MODO; no se escribió nada.`,
      resumen,
    };
  }

  // Catálogos.
  const categoriasActuales = new Map((await cliente.leerCategorias()).map((c) => [c.id, c.nombre]));
  const categoriasAEscribir = CATEGORIAS_MODO.filter((c) => categoriasActuales.get(c.id) !== c.nombre).map((c) => ({
    id: c.id,
    nombre: c.nombre,
  }));
  for (const c of categoriasAEscribir) resumen.categorias[categoriasActuales.has(c.id) ? "actualizar" : "insertar"]++;

  const bancosActuales = new Map((await cliente.leerBancos()).map((b) => [b.id, b.nombre]));
  const bancosAEscribir = cosecha.bancos
    .filter((b) => bancosActuales.get(b.id) !== b.name)
    .map((b) => ({ id: b.id, nombre: b.name }));
  for (const b of bancosAEscribir) resumen.bancos[bancosActuales.has(b.id) ? "actualizar" : "insertar"]++;

  // Capturas: una nueva solo si cambió el contenido respecto de la última del mismo origen.
  const idDeCaptura = new Map<string, string>();
  const ultimas = new Map<string, { id: string; contenido: string }>();
  for (const lote of lotes([...new Set(cosecha.capturas.map((c) => c.origen))])) {
    for (const c of await cliente.leerUltimasCapturas(lote)) ultimas.set(c.origen, c);
  }
  const capturasAEscribir: Captura[] = [];
  for (const captura of cosecha.capturas) {
    const ultima = ultimas.get(captura.origen);
    if (ultima !== undefined && ultima.contenido === captura.contenido) {
      resumen.capturas.sinCambios++;
      idDeCaptura.set(captura.origen, ultima.id);
    } else {
      resumen.capturas.nuevas++;
      capturasAEscribir.push(captura);
    }
  }

  const aEscribir: { promocion: PromocionIngestada; origen: string }[] = [];
  for (const publicable of cosecha.publicables) {
    // La captura todavía no tiene id si es nueva: se compara con un id provisorio, que `comparable` ignora.
    const fila = aFila(publicable.promocion, SIN_ESCRIBIR);
    const actual = porClave.get(fila.fuente_id);
    if (actual === undefined) resumen.promociones.insertar++;
    else if (actual.dada_de_baja_en !== null) resumen.promociones.reactivar++;
    else if (comparable(actual) !== comparable(fila)) resumen.promociones.actualizar++;
    else {
      resumen.promociones.sinCambios++;
      continue;
    }
    aEscribir.push(publicable);
  }
  const aDarDeBaja = activas.filter((f) => !deseadas.has(f.fuente_id) && !cosecha.slugsSinDatos.has(slugBase(f.fuente_id)));
  resumen.promociones.darDeBaja = aDarDeBaja.length;

  if (opciones.aplicar) {
    if (categoriasAEscribir.length > 0) await cliente.guardarCategorias(categoriasAEscribir);
    for (const lote of lotes(bancosAEscribir)) await cliente.guardarBancos(lote);
    for (const lote of lotes(capturasAEscribir)) {
      for (const { id, origen } of await cliente.guardarCapturas(lote)) idDeCaptura.set(origen, id);
    }
    const filas = aEscribir.map(({ promocion, origen }) => {
      const id = idDeCaptura.get(origen);
      if (id === undefined) throw new Error(`La promo ${promocion.fuenteId} no tiene captura (${origen})`);
      return aFila(promocion, id);
    });
    for (const lote of lotes(filas)) await cliente.guardarPromociones(lote);
    const cuando = opciones.ahora();
    for (const lote of lotes(aDarDeBaja.map((f) => f.id))) await cliente.darDeBaja(lote, cuando);
  }
  return { ok: true, aplicado: opciones.aplicar, motivo: null, resumen };
}

// ---------- Acceso a la base ----------

/**
 * Lee categorías, bancos, promociones y capturas crudas antes de bajar nada de MODO: si la
 * clave no sirve, la corrida falla en segundos y no después de casi una hora de pedidos.
 * Cubre el caso de una clave anon o publishable. Las capturas crudas son lo que la distingue:
 * categorías, bancos y promociones las puede leer también `anon` (migración
 * `catalogos_lectura_anon`, issue #112), pero esa tabla solo la lee la service role. Una clave
 * que lee pero no escribe recién falla al publicar. La lectura completa de promociones es a
 * propósito: `publicar` la repite después de la cosecha para el resguardo, y con unas miles de
 * filas son pocos segundos.
 */
export async function comprobarAcceso(cliente: ClienteBase): Promise<void> {
  try {
    await cliente.leerCategorias();
    await cliente.leerBancos();
    await cliente.leerPromociones();
    // Un origen que no existe: no trae filas, pero la tabla se consulta y `anon` no puede.
    await cliente.leerUltimasCapturas(["comprobar-acceso"]);
  } catch (error) {
    const detalle = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Sin acceso a la base: ${detalle}. Si es un «permission denied», revisá que ` +
        "SUPABASE_SERVICE_ROLE_KEY sea la service role (o la secret key) del mismo proyecto que " +
        "SUPABASE_URL, no la anon ni la publishable.",
      { cause: error },
    );
  }
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

// ---------- Cliente real ----------

/* v8 ignore start */
export function crearClienteSupabase(url: string, clave: string): ClienteBase {
  const supabase = createClient(url, clave, { auth: { persistSession: false, autoRefreshToken: false } });
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
          .eq("fuente", FUENTE_INGESTA)
          .order("id")
          .range(desde, desde + 999);
        fallar("leer promociones", error);
        const pagina = (data ?? []) as unknown as FilaPromocion[];
        filas.push(...pagina);
        if (pagina.length < 1000) return filas;
      }
    },
    async leerUltimasCapturas(origenes) {
      // Trae todas las versiones de esos orígenes y se queda con la más nueva de cada uno: una promo
      // cambia pocas veces, así que son pocas filas.
      const { data, error } = await supabase
        .from("capturas_crudas")
        .select("id,origen,contenido,capturada_en")
        .in("origen", origenes)
        .order("capturada_en", { ascending: false });
      fallar("leer capturas", error);
      const ultimas = new Map<string, { id: string } & Captura>();
      for (const c of (data ?? []) as ({ id: string } & Captura)[]) if (!ultimas.has(c.origen)) ultimas.set(c.origen, c);
      return [...ultimas.values()];
    },
    async guardarCategorias(filas) {
      fallar("guardar categorias", (await supabase.from("categorias").upsert(filas, { onConflict: "id" })).error);
    },
    async guardarBancos(filas) {
      fallar("guardar bancos", (await supabase.from("bancos").upsert(filas, { onConflict: "id" })).error);
    },
    async guardarCapturas(filas) {
      const { data, error } = await supabase.from("capturas_crudas").insert(filas).select("id,origen");
      fallar("guardar capturas", error);
      return (data ?? []) as { id: string; origen: string }[];
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
/* v8 ignore stop */
