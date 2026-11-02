/**
 * Relevamiento de las promos vigentes de MODO: baja el listado de cada
 * categoría, se queda con las promos de pago vigentes, baja el detalle de cada
 * una y guarda el crudo (`supabase/seed/crudo/<slug>.json`, RNF-08).
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
import { FILA_BANCO, SLUG_SEGURO, esObjeto, textoDeLaFila } from "./crudo.ts";
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
  descartadas: { noVigente: number; noEsPago: number };
  detalleInexistente: string[];
  /** Promos cuyo detalle falló (error de servidor o de red tras los reintentos): se reintentan en otra corrida. */
  detalleConError: { slug: string; error: string }[];
  mapeo: {
    borradores: number;
    exclusiones: { slug: string; motivo: MotivoExclusion }[];
    errores: { slug: string; ruta: string }[];
  };
}

export async function relevar(categorias: readonly number[], deps: DependenciasRelevar): Promise<ResumenRelevamiento> {
  const resumen: ResumenRelevamiento = {
    candidatas: 0,
    porCategoria: Object.fromEntries(categorias.map((c) => [c, 0])),
    porBanco: {},
    descartadas: { noVigente: 0, noEsPago: 0 },
    detalleInexistente: [],
    detalleConError: [],
    mapeo: { borradores: 0, exclusiones: [], errores: [] },
  };

  // Primera pasada: listar, filtrar y deduplicar. Nada se escribe hasta validar todos los slugs.
  const vistos = new Set<string>();
  const candidatas: { slug: string; tarjeta: Record<string, unknown> }[] = [];
  for (const categoria of categorias) {
    for (const t of await deps.cliente.listarCategoria(categoria)) {
      if (!esObjeto(t)) throw new Error(`Una tarjeta de la categoría ${categoria} no es un objeto`);
      if (t.calculated_status !== "RUNNING") {
        resumen.descartadas.noVigente++;
        continue;
      }
      if (t.trigger_type !== "payment_promotion") {
        resumen.descartadas.noEsPago++;
        continue;
      }
      if (typeof t.slug !== "string" || !SLUG_SEGURO.test(t.slug)) {
        throw new Error(`Una tarjeta de la categoría ${categoria} trae un slug inválido: ${JSON.stringify(t.slug)}`);
      }
      const clavePromo = typeof t.promo_id === "string" ? `promo:${t.promo_id}` : null;
      if (vistos.has(`slug:${t.slug}`) || (clavePromo !== null && vistos.has(clavePromo))) continue;
      vistos.add(`slug:${t.slug}`);
      if (clavePromo !== null) vistos.add(clavePromo);
      candidatas.push({ slug: t.slug, tarjeta: t });
      resumen.porCategoria[categoria] = (resumen.porCategoria[categoria] ?? 0) + 1;
      const banco = textoDeLaFila(t, FILA_BANCO) ?? "(sin banco)";
      resumen.porBanco[banco] = (resumen.porBanco[banco] ?? 0) + 1;
    }
  }
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
