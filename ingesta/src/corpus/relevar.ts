/**
 * Relevamiento de las promos vigentes de MODO: baja todas las secciones que
 * muestra la web de promos, se queda con los reintegros vigentes de las
 * categorías pedidas, baja el detalle de cada uno y guarda el crudo
 * (`supabase/seed/crudo/<slug>.json`, RNF-08). Después suma el listado por
 * categoría del endpoint anterior, que trae algunas promos vigentes que la web ya
 * no muestra. Una misma promo aparece en varias secciones y en los dos listados
 * (por ejemplo, Coto en «carrusel», «destacadas» y «supermercados»): cuenta una
 * vez, con la tarjeta de la web si la tiene.
 *
 *   npm run corpus:relevar -w ingesta -- --categorias 1,4
 *
 * Primero valida los slugs de todo el listado y recién después baja y guarda
 * los detalles: cada crudo se escribe completo. Un detalle que falla (error de
 * servidor o de red tras los reintentos) no frena a los demás, pero el comando
 * sale con código distinto de cero porque el relevamiento quedó incompleto.
 *
 * Después prueba el mapeo sobre cada crudo para informar cuántas promos dan
 * borrador, cuántas se proponen como exclusión y cuáles fallan por un formato
 * que no reconoce. El crudo se guarda igual: sirve para reproducir el error.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { ejecutarComoScript, hoyEnArgentina, listaDeEnteros, parsearArgumentos, raizDelRepo } from "./args.ts";
import { SLUG_SEGURO, bancoDeLaTarjeta, esObjeto } from "./crudo.ts";
import { leerCatalogoBancos } from "./insumos.ts";
import { intentarMapear } from "./mapear.ts";
import { crearClienteMODO, urlDetalle } from "./modo.ts";
import type { ClienteMODO } from "./modo.ts";
import type { BancoCatalogo, MotivoExclusion } from "./tipos.ts";

const PAUSA_POR_DEFECTO_MS = 1200;
const CARPETA_POR_DEFECTO = "supabase/seed/crudo";

export interface DependenciasRelevar {
  cliente: ClienteMODO;
  escribir: (ruta: string, contenido: string) => void;
  /** Fecha ISO de hoy. */
  hoy: string;
  carpeta: string;
  /** Categorías cuyo borrador se emite al probar el mapeo. */
  categoriasDelDueno: readonly number[];
  catalogoBancos: readonly BancoCatalogo[] | null;
}

export interface ResumenRelevamiento {
  candidatas: number;
  porCategoria: Record<number, number>;
  porBanco: Record<string, number>;
  /** Las secciones de la web que se recorrieron. */
  secciones: string[];
  /** Promos vigentes que solo trae el listado anterior por categoría: la web no las muestra en ninguna sección. */
  soloEnElListadoAnterior: string[];
  descartadas: { noVigente: number; noEsReintegro: number; otraCategoria: number };
  detalleInexistente: string[];
  /** Promos cuyo detalle falló (error de servidor o de red tras los reintentos): se reintentan en otra corrida. */
  detalleConError: { slug: string; error: string }[];
  mapeo: {
    borradores: number;
    exclusiones: { slug: string; motivo: MotivoExclusion }[];
    errores: { slug: string; ruta: string }[];
  };
}

/** Lo que el relevamiento lee de una tarjeta, venga de `/v2/slots` o del listado anterior. */
interface LecturaDeTarjeta {
  slug: unknown;
  id: string | null;
  vigente: boolean;
  esReintegro: boolean;
  categorias: number[];
}

/** `categoriaDelListado` es la categoría pedida al listado anterior, que no la repite en la tarjeta. */
function leerTarjeta(t: Record<string, unknown>, categoriaDelListado: number | null): LecturaDeTarjeta {
  const vigente = t.calculated_status === "RUNNING";
  if (esObjeto(t.benefit)) {
    const publicacion = esObjeto(t.benefit.publication) ? t.benefit.publication : {};
    const oferta = esObjeto(t.offer) ? t.offer : {};
    return {
      slug: publicacion.slug,
      id: typeof t.benefit.id === "string" ? t.benefit.id : null,
      vigente,
      esReintegro: t.benefit.type === "cashback",
      categorias: Array.isArray(oferta.categories) ? oferta.categories.map(Number) : [],
    };
  }
  return {
    slug: t.slug,
    id: typeof t.promo_id === "string" ? t.promo_id : null,
    vigente,
    esReintegro: t.trigger_type === "payment_promotion",
    categorias: categoriaDelListado === null ? [] : [categoriaDelListado],
  };
}

export async function relevar(categorias: readonly number[], deps: DependenciasRelevar): Promise<ResumenRelevamiento> {
  const resumen: ResumenRelevamiento = {
    candidatas: 0,
    porCategoria: Object.fromEntries(categorias.map((c) => [c, 0])),
    porBanco: {},
    secciones: [],
    soloEnElListadoAnterior: [],
    descartadas: { noVigente: 0, noEsReintegro: 0, otraCategoria: 0 },
    detalleInexistente: [],
    detalleConError: [],
    mapeo: { borradores: 0, exclusiones: [], errores: [] },
  };

  // Primera pasada: listar, filtrar y deduplicar. Nada se escribe hasta validar todos los slugs.
  const vistos = new Set<string>();
  const candidatas: { slug: string; tarjeta: Record<string, unknown> }[] = [];
  const considerar = (t: unknown, origen: string, categoriaDelListado: number | null): void => {
    if (!esObjeto(t)) throw new Error(`Una tarjeta de ${origen} no es un objeto`);
    const { slug, id, vigente, esReintegro, categorias: deLaTarjeta } = leerTarjeta(t, categoriaDelListado);
    if (typeof slug !== "string" || !SLUG_SEGURO.test(slug)) {
      throw new Error(`Una tarjeta de ${origen} trae un slug inválido: ${JSON.stringify(slug)}`);
    }
    const clavePromo = id === null ? null : `promo:${id}`;
    if (vistos.has(`slug:${slug}`) || (clavePromo !== null && vistos.has(clavePromo))) return;
    vistos.add(`slug:${slug}`);
    if (clavePromo !== null) vistos.add(clavePromo);
    if (!vigente) {
      resumen.descartadas.noVigente++;
      return;
    }
    // Cuotas, sorteos y otros beneficios no son reintegros.
    if (!esReintegro) {
      resumen.descartadas.noEsReintegro++;
      return;
    }
    const pedidas = categorias.filter((c) => deLaTarjeta.includes(c));
    if (pedidas.length === 0) {
      resumen.descartadas.otraCategoria++;
      return;
    }
    candidatas.push({ slug, tarjeta: t });
    for (const c of pedidas) resumen.porCategoria[c] = (resumen.porCategoria[c] ?? 0) + 1;
    const banco = bancoDeLaTarjeta(t) ?? "(sin banco)";
    resumen.porBanco[banco] = (resumen.porBanco[banco] ?? 0) + 1;
  };

  resumen.secciones = await deps.cliente.secciones();
  for (const seccion of resumen.secciones) {
    for (const t of await deps.cliente.listarSeccion(seccion)) considerar(t, `la sección ${seccion}`, null);
  }
  const antes = candidatas.length;
  for (const categoria of categorias) {
    for (const t of await deps.cliente.listarCategoria(categoria)) considerar(t, `la categoría ${categoria}`, categoria);
  }
  resumen.soloEnElListadoAnterior = candidatas.slice(antes).map((c) => c.slug);
  resumen.candidatas = candidatas.length;

  // Segunda pasada: detalle, crudo y prueba del mapeo.
  for (const { slug, tarjeta } of candidatas) {
    let detalle: unknown;
    try {
      detalle = await deps.cliente.detalle(slug);
    } catch (error) {
      // Un error de servidor que no se recupera en una promo no frena a las demás.
      resumen.detalleConError.push({ slug, error: error instanceof Error ? error.message : String(error) });
      continue;
    }
    if (detalle === null) {
      resumen.detalleInexistente.push(slug);
      continue;
    }
    const crudo = { capturadoEl: deps.hoy, url: urlDetalle(slug), tarjeta, detalle };
    deps.escribir(`${deps.carpeta}/${slug}.json`, `${JSON.stringify(crudo, null, 2)}\n`);
    const intento = intentarMapear(crudo, {
      categoriasDelDueno: deps.categoriasDelDueno,
      hoy: deps.hoy,
      catalogoBancos: deps.catalogoBancos,
    });
    if (!intento.ok) {
      resumen.mapeo.errores.push({ slug, ruta: intento.ruta });
      continue;
    }
    resumen.mapeo.borradores += intento.resultado.borradores.length;
    for (const e of intento.resultado.exclusiones) resumen.mapeo.exclusiones.push({ slug: e.slug, motivo: e.motivo });
  }
  return resumen;
}

/** 1 si el relevamiento quedó incompleto (algún detalle falló), 0 si no. Un 404 o un formato desconocido no lo invalidan. */
export function codigoDeSalida(resumen: ResumenRelevamiento): number {
  return resumen.detalleConError.length > 0 ? 1 : 0;
}

export interface OpcionesRelevar {
  categorias: number[];
  pausaMs: number;
  /** Carpeta de los crudos; por defecto la del repo, no la del directorio desde el que se corre. */
  carpeta: string;
}

export function opcionesDeArgumentos(argv: readonly string[]): OpcionesRelevar {
  const { valores } = parsearArgumentos(argv);
  if (valores.categorias === undefined) throw new Error("Falta --categorias (por ejemplo: --categorias 1,4)");
  const pausaMs = valores["pausa-ms"] === undefined ? PAUSA_POR_DEFECTO_MS : Number(valores["pausa-ms"]);
  if (!Number.isFinite(pausaMs) || pausaMs < 1000) {
    throw new Error("--pausa-ms tiene que ser un número de al menos 1000 (RNF-13: scraping respetuoso)");
  }
  return {
    categorias: listaDeEnteros(valores.categorias, "--categorias"),
    pausaMs,
    carpeta: valores.carpeta === undefined ? resolve(raizDelRepo(), CARPETA_POR_DEFECTO) : resolve(valores.carpeta),
  };
}

/* v8 ignore start */
async function main(argv: readonly string[]): Promise<void> {
  const opciones = opcionesDeArgumentos(argv);
  const cliente = crearClienteMODO({
    fetch,
    pausaMs: opciones.pausaMs,
    esperar: (ms) => new Promise((resolver) => setTimeout(resolver, ms)),
  });
  const resumen = await relevar(opciones.categorias, {
    cliente,
    hoy: hoyEnArgentina(),
    carpeta: opciones.carpeta,
    categoriasDelDueno: opciones.categorias,
    catalogoBancos: leerCatalogoBancos((ruta) => readFileSync(resolve(raizDelRepo(), ruta), "utf8")),
    escribir: (ruta, contenido) => {
      mkdirSync(dirname(ruta), { recursive: true });
      writeFileSync(ruta, contenido);
    },
  });
  console.log(JSON.stringify(resumen, null, 2));
  if (resumen.detalleConError.length > 0) {
    console.error(`Relevamiento incompleto: falló el detalle de ${resumen.detalleConError.length} promo(s). Volvé a correrlo.`);
  }
  process.exitCode = codigoDeSalida(resumen);
}

ejecutarComoScript(import.meta.url, () => main(process.argv.slice(2)));
/* v8 ignore stop */
