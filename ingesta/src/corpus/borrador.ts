/**
 * Borrador de una promo para la revisión humana.
 *
 *   npm run corpus:borrador -w ingesta -- <slug> [<slug> ...]
 *
 * Lee el crudo de cada slug, imprime la entrada mapeada por código y marca las
 * frases de la letra chica donde mirar. **No escribe** en `promociones.json`:
 * la persona copia el borrador, lo corrige y completa lo que solo está en la
 * prosa. Las pistas que salen de la letra chica (frases resaltadas, la fecha de
 * cierre) se muestran acá y no entran al borrador: el mapeo no interpreta la
 * prosa, y nada de esto usa un modelo de lenguaje.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ejecutarComoScript, hoyEnArgentina, listaDeEnteros, parsearArgumentos, raizDelRepo } from "./args.ts";
import { SLUG_SEGURO, esObjeto, legalDelCrudo, slugDelCrudo } from "./crudo.ts";
import { leerCatalogoBancos } from "./insumos.ts";
import { intentarMapear } from "./mapear.ts";
import type { Crudo, OpcionesMapeo } from "./mapear.ts";
import { aTexto, fechaDeCierreDelLegal, resaltar } from "./resaltar.ts";

const CARPETA_POR_DEFECTO = "supabase/seed/crudo";
/** A partir de cuántas entradas se muestra solo la primera y se lista el resto. */
const MAX_ENTRADAS_COMPLETAS = 3;

const A_COMPLETAR = [
  "acumulable (true, false o null según la letra chica)",
  "tope.alcance (compartido o exclusivo) y tope.grupoTopeId, registrando el grupo en grupos-tope.json",
  "jurisdiccion (solo si el texto la sostiene)",
  "comercio (nombre de marca corto, D3)",
  "fragmentosFuente: el fragmento de cada campo que sale de la prosa",
  "revision.revisor, y revision.notas con lo que verificaste",
];

/** MODO a veces sigue listando como vigente una promo cuya letra chica ya dio por terminada. */
function avisoDeFechaVencida(crudo: Crudo, hoy: string): string | null {
  const cierre = fechaDeCierreDelLegal(legalDelCrudo(crudo));
  if (cierre === null || cierre >= hoy) return null;
  const [anio, mes, dia] = cierre.split("-");
  const schedule = esObjeto(crudo.detalle) && esObjeto(crudo.detalle.conditions) ? crudo.detalle.conditions.schedule : null;
  const estructura = esObjeto(schedule) && typeof schedule.stop_date === "string" ? schedule.stop_date : null;
  const lista = estructura === null ? "" : `, aunque MODO la lista como vigente hasta ${estructura}`;
  return `La letra chica menciona como fecha más reciente ${dia}/${mes}/${anio}, que ya pasó${lista}. Verificar si venció (la letra chica prevalece).`;
}

export function describirBorrador(crudo: Crudo, opciones: OpcionesMapeo): string {
  const lineas: string[] = [`== ${slugDelCrudo(crudo) ?? "(sin slug)"} ==`];

  const intento = intentarMapear(crudo, opciones);
  if (!intento.ok) {
    lineas.push(`No se pudo mapear: ${intento.ruta}`);
  } else {
    const m = intento.resultado;
    if (m.borradores.length > 0) {
      lineas.push(`Borrador: ${m.borradores.length === 1 ? "1 entrada" : `${m.borradores.length} entradas`}.`);
      if (m.borradores.length > MAX_ENTRADAS_COMPLETAS) {
        lineas.push(
          `Mismas condiciones en las ${m.borradores.length} entradas; cambian solo bancoId, categoriaId y fuenteId. Se muestra la primera.`,
        );
      }
      lineas.push(JSON.stringify(m.borradores[0], null, 2));
      if (m.borradores.length > 1) {
        lineas.push("fuenteId de todas las entradas:");
        for (const b of m.borradores) lineas.push(`  ${b.fuenteId}`);
      }
      lineas.push("A completar a mano:");
      for (const item of A_COMPLETAR) lineas.push(`  - ${item}`);
    }
    for (const e of m.exclusiones) {
      lineas.push(`Exclusión propuesta: ${e.motivo}${e.detalle === null ? "" : ` — ${e.detalle}`}`);
    }
    for (const a of m.avisos) lineas.push(`Aviso: ${a}`);
  }

  const fecha = avisoDeFechaVencida(crudo, opciones.hoy);
  if (fecha !== null) lineas.push(`Aviso: ${fecha}`);

  const legal = legalDelCrudo(crudo);
  const frases = resaltar(legal);
  lineas.push("Letra chica — frases para revisar:");
  if (frases.length === 0) {
    lineas.push(legal === "" ? "  (el detalle no trae letra chica)" : "  (sin frases para revisar)");
  }
  for (const f of frases) lineas.push(`  [${f.terminos.join(", ")}] ${f.frase}`);
  if (legal !== "") lineas.push(`Letra chica completa (${aTexto(legal).length} caracteres): ver el crudo.`);
  return lineas.join("\n");
}

/** Lee `<carpeta>/<slug>.json`. `leer` se inyecta para los tests. */
export function leerCrudo(slug: string, carpeta: string, leer: (ruta: string) => string): Crudo {
  if (!SLUG_SEGURO.test(slug)) throw new Error(`slug inválido: ${JSON.stringify(slug)}`);
  const crudo = JSON.parse(leer(`${carpeta}/${slug}.json`)) as Partial<Crudo> | null;
  if (crudo === null || typeof crudo !== "object" || !("detalle" in crudo) || !("capturadoEl" in crudo)) {
    throw new Error(`El archivo de ${slug} no es un crudo (falta capturadoEl o detalle).`);
  }
  return crudo as Crudo;
}

export interface OpcionesBorrador {
  slugs: string[];
  /** Carpeta de los crudos; por defecto la del repo, no la del directorio desde el que se corre. */
  carpeta: string;
  categoriasDelDueno: number[];
}

export function opcionesDeArgumentos(argv: readonly string[]): OpcionesBorrador {
  const { valores, posicionales } = parsearArgumentos(argv);
  if (posicionales.length === 0) throw new Error("Falta al menos un slug (por ejemplo: corpus:borrador -- 20-paladini-icbc-ago26)");
  return {
    slugs: posicionales,
    carpeta: valores.carpeta === undefined ? resolve(raizDelRepo(), CARPETA_POR_DEFECTO) : resolve(valores.carpeta),
    categoriasDelDueno: valores.categorias === undefined ? [1, 4] : listaDeEnteros(valores.categorias, "--categorias"),
  };
}

/* v8 ignore start */
function main(argv: readonly string[]): void {
  const opciones = opcionesDeArgumentos(argv);
  const catalogoBancos = leerCatalogoBancos((ruta) => readFileSync(resolve(raizDelRepo(), ruta), "utf8"));
  for (const slug of opciones.slugs) {
    const crudo = leerCrudo(slug, opciones.carpeta, (ruta) => readFileSync(ruta, "utf8"));
    console.log(describirBorrador(crudo, { categoriasDelDueno: opciones.categoriasDelDueno, hoy: hoyEnArgentina(), catalogoBancos }));
    console.log("");
  }
}

ejecutarComoScript(import.meta.url, () => main(process.argv.slice(2)));
/* v8 ignore stop */
