/**
 * Ingesta automática de las promociones de MODO (issue #35, ADR-011). La corre todos
 * los días el workflow `ingesta.yml` de GitHub Actions; nadie revisa ni carga promos a mano.
 *
 *   node --env-file=supabase/.env ingesta/src/corpus/ingestar.ts            # prueba: no escribe
 *   node --env-file=supabase/.env ingesta/src/corpus/ingestar.ts --aplicar  # escribe
 *
 * 1. Lista las promos vigentes de MODO (todas las secciones de la web más el listado anterior).
 * 2. Baja el detalle de cada una y el catálogo de bancos.
 * 3. Mapea por código, sin modelo de lenguaje (constitución §III), y valida cada promo.
 * 4. Publica en Supabase: capturas crudas, promos nuevas o cambiadas, y bajas.
 *
 * Lo que no se puede representar se descarta solo, con su motivo en el resumen. Sale con
 * código 1 si algo quedó sin leer (un detalle que falló, un formato que el mapeo no
 * reconoce) o si el resguardo frenó la escritura: GitHub avisa por mail al que mantiene
 * el repo. La base queda con lo de la corrida anterior hasta que la siguiente funcione.
 */
import { CATEGORIAS_MODO } from "@vuelto/motor";
import { ejecutarComoScript, hoyEnArgentina, parsearArgumentos } from "./args.ts";
import { esObjeto, jsonCanonico } from "./crudo.ts";
import { listarCandidatas } from "./listado.ts";
import type { ResumenListado } from "./listado.ts";
import { intentarMapear } from "./mapear.ts";
import { crearClienteMODO, urlDetalle } from "./modo.ts";
import type { ClienteMODO } from "./modo.ts";
import { crearClienteSupabase, leerEntorno, publicar } from "./publicar.ts";
import type { Cosecha, ResumenPublicacion } from "./publicar.ts";
import type { BancoCatalogo, Descarte, MotivoDescarte } from "./tipos.ts";
import { validarPromocion } from "./validar.ts";

const PAUSA_POR_DEFECTO_MS = 1200;

export interface ResumenCosecha {
  listado: ResumenListado;
  /** Filas que se publicarían (una promo partida por banco o categoría cuenta varias). */
  publicables: number;
  /** Cuántas promos se descartaron por cada motivo (solo los motivos que aparecieron). */
  descartes: Partial<Record<MotivoDescarte, number>>;
  /** Cada descarte, para buscar una promo puntual en el registro de la corrida. */
  detalleDescartes: Descarte[];
  /** Promos cuyo detalle falló (error de servidor o de red tras los reintentos): se reintentan mañana. */
  detalleConError: { slug: string; error: string }[];
  /** Promos con un campo que el mapeo no reconoce: hay que actualizar el mapeo. */
  formatoDesconocido: { slug: string; ruta: string }[];
  avisos: string[];
}

/** El catálogo de bancos de MODO: solo las entradas con id y nombre. */
export function leerCatalogo(crudo: readonly unknown[]): BancoCatalogo[] {
  const bancos = crudo
    .filter(esObjeto)
    .filter((b) => typeof b.id === "string" && typeof b.name === "string" && b.name.trim() !== "")
    .map((b) => ({ id: b.id as string, name: (b.name as string).trim() }));
  if (bancos.length === 0) throw new Error("El catálogo de bancos de MODO vino vacío");
  return bancos;
}

const contarPorMotivo = (descartes: readonly Descarte[]): Partial<Record<MotivoDescarte, number>> => {
  const cuenta: Partial<Record<MotivoDescarte, number>> = {};
  for (const d of descartes) cuenta[d.motivo] = (cuenta[d.motivo] ?? 0) + 1;
  return cuenta;
};

/** Pasos 1 a 3: todo lo que se lee de MODO, mapeado y validado. No escribe nada. */
export async function cosechar(
  cliente: ClienteMODO,
  hoy: string,
): Promise<{ cosecha: Cosecha; resumen: ResumenCosecha }> {
  const categorias = CATEGORIAS_MODO.map((c) => c.id);
  const bancos = leerCatalogo(await cliente.bancos());
  const idsDeBancos = new Set(bancos.map((b) => b.id));
  const { candidatas, resumen: listado } = await listarCandidatas(cliente, categorias);

  const cosecha: Cosecha = { bancos, capturas: [], publicables: [], slugsSinDatos: new Set() };
  const slugsSinDatos = new Set<string>();
  const descartes: Descarte[] = [];
  const resumen: Omit<ResumenCosecha, "descartes" | "detalleDescartes"> = {
    listado,
    publicables: 0,
    detalleConError: [],
    formatoDesconocido: [],
    avisos: [],
  };
  const vistos = new Set<string>();

  for (const { slug, tarjeta } of candidatas) {
    let detalle: unknown;
    try {
      detalle = await cliente.detalle(slug);
    } catch (error) {
      // Un error de servidor que no se recupera en una promo no frena a las demás.
      slugsSinDatos.add(slug);
      resumen.detalleConError.push({ slug, error: error instanceof Error ? error.message : String(error) });
      continue;
    }
    if (detalle === null) {
      descartes.push({ slug, motivo: "detalle_inexistente", detalle: null });
      continue;
    }
    const origen = urlDetalle(slug);
    cosecha.capturas.push({ origen, contenido: jsonCanonico({ tarjeta, detalle }) });
    const intento = intentarMapear(
      { capturadoEl: hoy, url: origen, tarjeta, detalle },
      { categorias, hoy, catalogoBancos: bancos },
    );
    if (!intento.ok) {
      resumen.formatoDesconocido.push({ slug, ruta: intento.ruta });
      descartes.push({ slug, motivo: "formato_desconocido", detalle: intento.ruta });
      continue;
    }
    descartes.push(...intento.resultado.descartes);
    resumen.avisos.push(...intento.resultado.avisos);
    // Las partes de una promo se publican todas o ninguna: si una no pasa, el tope compartido quedaría a medias.
    const errores = intento.resultado.promociones.flatMap((p) => {
      const propios = validarPromocion(p, idsDeBancos);
      if (vistos.has(p.fuenteId)) propios.push(`fuente-id: ${p.fuenteId} repetido en la corrida`);
      return propios.map((e) => `${p.fuenteId}: ${e}`);
    });
    if (errores.length > 0) {
      descartes.push({ slug, motivo: "no_publicable", detalle: errores.join("; ") });
      continue;
    }
    for (const promocion of intento.resultado.promociones) {
      vistos.add(promocion.fuenteId);
      cosecha.publicables.push({ promocion, origen });
    }
  }
  cosecha.slugsSinDatos = slugsSinDatos;
  resumen.publicables = cosecha.publicables.length;
  return { cosecha, resumen: { ...resumen, descartes: contarPorMotivo(descartes), detalleDescartes: descartes } };
}

/** 1 si algo quedó sin leer o la publicación se frenó; 0 si no. Un descarte no es un error. */
export function codigoDeSalida(resumen: ResumenCosecha, publicacion: { ok: boolean }): number {
  return !publicacion.ok || resumen.detalleConError.length > 0 || resumen.formatoDesconocido.length > 0 ? 1 : 0;
}

/** Lo que se imprime al final: sin la lista de descartes uno por uno, que va aparte. */
export function informe(resumen: ResumenCosecha, publicacion: ResumenPublicacion): Record<string, unknown> {
  const cosecha: Partial<ResumenCosecha> = { ...resumen };
  delete cosecha.detalleDescartes;
  return { cosecha, publicacion };
}

export function opcionesDeArgumentos(argv: readonly string[]): { aplicar: boolean; pausaMs: number } {
  const { valores, banderas } = parsearArgumentos(argv, ["aplicar"]);
  const pausaMs = valores["pausa-ms"] === undefined ? PAUSA_POR_DEFECTO_MS : Number(valores["pausa-ms"]);
  if (!Number.isFinite(pausaMs) || pausaMs < 1000) {
    throw new Error("--pausa-ms tiene que ser un número de al menos 1000 (RNF-13: scraping respetuoso)");
  }
  return { aplicar: banderas.includes("aplicar"), pausaMs };
}

/* v8 ignore start */
async function main(argv: readonly string[]): Promise<void> {
  const { aplicar, pausaMs } = opcionesDeArgumentos(argv);
  // El entorno se lee antes de pedir nada a MODO: sin credenciales no tiene sentido bajar cientos de detalles.
  const { url, clave } = leerEntorno(process.env);
  console.log(`Base: ${new URL(url).host} — ${aplicar ? "se va a ESCRIBIR" : "modo de prueba (no escribe)"}`);
  const clienteMODO = crearClienteMODO({
    fetch,
    pausaMs,
    esperar: (ms) => new Promise((resolver) => setTimeout(resolver, ms)),
  });
  const { cosecha, resumen } = await cosechar(clienteMODO, hoyEnArgentina());
  const publicacion = await publicar(cosecha, crearClienteSupabase(url, clave), {
    aplicar,
    ahora: () => new Date().toISOString(),
  });
  console.log(JSON.stringify(informe(resumen, publicacion.resumen), null, 2));
  console.log("Descartes:");
  for (const d of resumen.detalleDescartes) console.log(`  ${d.motivo}\t${d.slug}\t${d.detalle ?? ""}`);
  for (const e of resumen.detalleConError) console.error(`Falló el detalle de ${e.slug}: ${e.error}`);
  for (const f of resumen.formatoDesconocido) console.error(`Formato desconocido en ${f.slug}: ${f.ruta}`);
  if (publicacion.motivo !== null) console.error(publicacion.motivo);
  console.log(aplicar && publicacion.ok ? "Listo." : "No se escribió nada.");
  process.exitCode = codigoDeSalida(resumen, publicacion);
}

ejecutarComoScript(import.meta.url, () => main(process.argv.slice(2)));
/* v8 ignore stop */
