/**
 * Cobertura del corpus: qué promos relevadas ya tienen destino (entrada o
 * exclusión) y cuáles faltan revisar, y qué promos reales sirven de ejemplo de
 * cada caso que el motor tiene que resolver.
 *
 *   npm run corpus:cobertura -w ingesta                  # resumen
 *   npm run corpus:cobertura -w ingesta -- --lista       # las pendientes, por comercio
 *   npm run corpus:cobertura -w ingesta -- --casos       # candidatas por caso
 *   npm run corpus:cobertura -w ingesta -- --estricto    # falla si queda algo pendiente
 *
 * Lo que sale de la letra chica (acumulabilidad, tope compartido, vencida por
 * la prosa) son **candidatas**: las marca el código con las frases de
 * `resaltar`, pero las confirma una persona. Nada de esto interpreta la prosa
 * ni usa un modelo de lenguaje.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { normalizar } from "@vuelto/motor";
import { ejecutarComoScript, hoyEnArgentina, parsearArgumentos, raizDelRepo } from "./args.ts";
import { FILA_BANCO, FILA_COMERCIO, legalDelCrudo, slugDelCrudo, textoDeLaFila } from "./crudo.ts";
import { slugBase } from "./ids.ts";
import { leerInsumos } from "./insumos.ts";
import { intentarMapear } from "./mapear.ts";
import type { Crudo, OpcionesMapeo } from "./mapear.ts";
import { fechaDeCierreDelLegal, resaltar } from "./resaltar.ts";

export interface Cobertura {
  /** Promos relevadas (un crudo por slug). */
  crudos: number;
  /** Promos con al menos una entrada en el corpus. */
  enCorpus: number;
  /** Promos sin entradas que están en las exclusiones. */
  enExclusiones: number;
  /** Slugs relevados sin ninguna entrada ni exclusión: falta revisarlos. */
  pendientes: string[];
  /** Entradas o exclusiones que no tienen crudo: se rompe la trazabilidad (RNF-08). */
  huerfanas: { entradas: string[]; exclusiones: string[] };
}

export function calcularCobertura(
  slugsCrudos: readonly string[],
  fuenteIds: readonly string[],
  slugsExclusion: readonly string[],
): Cobertura {
  const conCrudo = new Set(slugsCrudos);
  const basesDeEntradas = new Set(fuenteIds.map(slugBase).filter((s) => conCrudo.has(s)));
  const basesDeExclusiones = new Set(
    slugsExclusion.map(slugBase).filter((s) => conCrudo.has(s) && !basesDeEntradas.has(s)),
  );
  return {
    crudos: slugsCrudos.length,
    enCorpus: basesDeEntradas.size,
    enExclusiones: basesDeExclusiones.size,
    pendientes: slugsCrudos.filter((s) => !basesDeEntradas.has(s) && !basesDeExclusiones.has(s)),
    huerfanas: {
      entradas: fuenteIds.filter((id) => !conCrudo.has(slugBase(id))),
      exclusiones: slugsExclusion.filter((s) => !conCrudo.has(slugBase(s))),
    },
  };
}

// ---------- Casos que el motor tiene que resolver ----------

export const CASOS = [
  "solo_debito",
  "solo_credito",
  "dias",
  "monto_minimo",
  "tope_por_compra",
  "tope_semanal",
  "tope_mensual",
  "sin_tope",
  "canal_online",
  "canal_ambos",
  "no_acumulable",
  "acumulable",
  "tope_compartido",
  "vencida_por_letra_chica",
] as const;

export type Caso = (typeof CASOS)[number];

export function candidatasPorCaso(crudos: readonly Crudo[], opciones: OpcionesMapeo): Record<Caso, string[]> {
  const casos = Object.fromEntries(CASOS.map((c) => [c, new Set<string>()])) as Record<Caso, Set<string>>;
  for (const crudo of crudos) {
    const slug = slugDelCrudo(crudo);
    if (slug === null) continue;

    // Campos estructurados: de la primera entrada (las demás de una promo partida comparten condiciones).
    const intento = intentarMapear(crudo, opciones);
    const b = intento.ok ? intento.resultado.borradores[0] : undefined;
    if (b !== undefined) {
      if (b.tarjetas.credito.length === 0) casos.solo_debito.add(slug);
      if (b.tarjetas.debito.length === 0) casos.solo_credito.add(slug);
      if (b.vigencia.dias !== null) casos.dias.add(slug);
      if (b.montoMinimo !== null) casos.monto_minimo.add(slug);
      if (b.tope.monto === null) casos.sin_tope.add(slug);
      if (b.tope.periodo === "por_compra") casos.tope_por_compra.add(slug);
      if (b.tope.periodo === "semanal") casos.tope_semanal.add(slug);
      if (b.tope.periodo === "mensual") casos.tope_mensual.add(slug);
      if (b.canal === "online") casos.canal_online.add(slug);
      if (b.canal === "ambos") casos.canal_ambos.add(slug);
    }

    // Letra chica: candidatas, las confirma una persona.
    const legal = legalDelCrudo(crudo);
    const frases = resaltar(legal);
    if (frases.some((f) => f.terminos.includes("no acumul"))) casos.no_acumulable.add(slug);
    if (frases.some((f) => f.terminos.includes("acumul"))) casos.acumulable.add(slug);
    if (frases.some((f) => f.terminos.includes("tope") && f.terminos.includes("compartid"))) casos.tope_compartido.add(slug);
    const cierre = fechaDeCierreDelLegal(legal);
    if (cierre !== null && cierre < opciones.hoy) casos.vencida_por_letra_chica.add(slug);
  }
  return Object.fromEntries(CASOS.map((c) => [c, [...casos[c]]])) as Record<Caso, string[]>;
}

// ---------- Lista de revisión ----------

export interface ItemDeRevision {
  slug: string;
  comercio: string;
  banco: string;
  /** Entradas que el mapeo propone (0 si se propone excluir o falló). */
  entradas: number;
  /** Motivo de la exclusión propuesta, si hay. */
  exclusion: string | null;
  /** Ruta del campo que el mapeo no reconoció, si falló. */
  error: string | null;
}

export function listaDeRevision(crudos: readonly Crudo[], opciones: OpcionesMapeo): ItemDeRevision[] {
  const items: ItemDeRevision[] = crudos.map((crudo) => {
    const item: ItemDeRevision = {
      slug: slugDelCrudo(crudo) ?? "(sin slug)",
      comercio: textoDeLaFila(crudo.tarjeta, FILA_COMERCIO) ?? "(sin comercio)",
      banco: textoDeLaFila(crudo.tarjeta, FILA_BANCO) ?? "(sin banco)",
      entradas: 0,
      exclusion: null,
      error: null,
    };
    const intento = intentarMapear(crudo, opciones);
    if (intento.ok) {
      item.entradas = intento.resultado.borradores.length;
      item.exclusion = intento.resultado.exclusiones[0]?.motivo ?? null;
    } else {
      item.error = intento.ruta;
    }
    return item;
  });
  return items.sort(
    (a, b) => normalizar(a.comercio).localeCompare(normalizar(b.comercio)) || a.slug.localeCompare(b.slug),
  );
}

// ---------- Línea de comandos ----------

/* v8 ignore start */
function main(argv: readonly string[]): void {
  const { banderas } = parsearArgumentos(argv, ["lista", "casos", "estricto", "todos"]);
  const raiz = raizDelRepo();
  const insumos = leerInsumos((ruta) => readFileSync(resolve(raiz, ruta), "utf8"));
  const carpeta = resolve(raiz, "supabase/seed/crudo");
  if (!existsSync(carpeta)) {
    throw new Error("No hay crudos en supabase/seed/crudo: corré `npm run corpus:relevar -w ingesta -- --categorias 1,4`.");
  }
  const crudos = readdirSync(carpeta)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => JSON.parse(readFileSync(resolve(carpeta, f), "utf8")) as Crudo);
  const slugs = crudos.flatMap((c) => slugDelCrudo(c) ?? []);
  const opciones: OpcionesMapeo = { categoriasDelDueno: [1, 4], hoy: hoyEnArgentina(), catalogoBancos: insumos.bancos };

  const c = calcularCobertura(
    slugs,
    insumos.archivo.promociones.map((e) => e.fuenteId),
    insumos.exclusiones.map((e) => e.slug),
  );
  console.log(
    `Promos relevadas: ${c.crudos} | con entradas en el corpus: ${c.enCorpus} | excluidas: ${c.enExclusiones} | pendientes de revisar: ${c.pendientes.length}`,
  );
  if (c.huerfanas.entradas.length + c.huerfanas.exclusiones.length > 0) {
    console.error(`Sin crudo (se rompe la trazabilidad): ${[...c.huerfanas.entradas, ...c.huerfanas.exclusiones].join(", ")}`);
    process.exitCode = 1;
  }
  if (banderas.includes("lista")) {
    const pendientes = new Set(c.pendientes);
    const lista = listaDeRevision(crudos.filter((x) => pendientes.has(slugDelCrudo(x) ?? "")), opciones);
    let comercio = "";
    for (const i of lista) {
      if (i.comercio !== comercio) console.log(`\n${(comercio = i.comercio)}`);
      const nota = i.error !== null ? ` [no se pudo mapear: ${i.error}]` : i.exclusion !== null ? ` [propone excluir: ${i.exclusion}]` : "";
      console.log(`  ${i.banco.padEnd(18)} ${String(i.entradas).padStart(2)} entrada(s)  ${i.slug}${nota}`);
    }
  }
  if (banderas.includes("casos")) {
    const casos = candidatasPorCaso(crudos, opciones);
    console.log("\nCandidatas por caso (las de letra chica las confirma una persona):");
    for (const caso of CASOS) {
      const slugsDelCaso = casos[caso];
      const muestra = banderas.includes("todos") ? slugsDelCaso : slugsDelCaso.slice(0, 5);
      console.log(`  ${caso.padEnd(24)} ${String(slugsDelCaso.length).padStart(3)}  ${muestra.join(", ")}${muestra.length < slugsDelCaso.length ? ", …" : ""}`);
    }
  }
  if (banderas.includes("estricto") && c.pendientes.length > 0) {
    console.error(`\n--estricto: quedan ${c.pendientes.length} promos sin revisar.`);
    process.exitCode = 1;
  }
}

ejecutarComoScript(import.meta.url, () => main(process.argv.slice(2)));
/* v8 ignore stop */
