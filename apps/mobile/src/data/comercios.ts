/**
 * Los comercios del buscador (issue #43, spec 004 FR-030): salen de las promociones del corpus,
 * no de una lista armada a mano. Funciones puras: el selector `selectCatalogoComercios` las
 * llama con el corpus del store y `hoy` (ADR-010), así el buscador anda sin red.
 */
import { CATEGORIAS_MODO, claveComercio, type FechaISO, type Promocion } from "@vuelto/motor";
import { RUBROS } from "../lib/rubros";
import type { Comercio, Rubro } from "./contracts";

/** Las categorías de MODO que la app ya conoce como rubro (ícono y textos propios). */
const RUBRO_DE_CATEGORIA = new Map<number, Rubro>(
  (Object.entries(RUBROS) as [Rubro, (typeof RUBROS)[Rubro]][]).flatMap(([rubro, r]) =>
    r.categoriaId === null ? [] : [[r.categoriaId, rubro] as [number, Rubro]],
  ),
);

/**
 * Clave para comparar nombres en el buscador (spec 004 FR-002): la misma que usa el motor para
 * saber si una promo es de este comercio, sin mayúsculas, acentos, espacios ni puntuación.
 * «Café  Martínez» = «cafe martinez», y «McDonald's» = «Mc Donald's» (issue #147).
 */
export function claveDeComercio(nombre: string): string {
  return claveComercio(nombre);
}

/** El mismo comercio en el mismo rubro tiene siempre el mismo id, venga de la promo que venga. */
export function idDeComercio(nombre: string, categoriaId: number): string {
  return `${categoriaId}-${claveDeComercio(nombre)}`;
}

/**
 * Los pares únicos (comercio, rubro) de las promociones con comercio que siguen vigentes
 * (`hasta` ≥ hoy), ordenados por nombre. Un comercio con promos en dos rubros aparece dos
 * veces, una por rubro (spec 004, Edge Cases). Las promos de toda una categoría (sin
 * comercio) no suman entradas: se eligen por rubro.
 */
export function comerciosDelCorpus(promociones: readonly Promocion[], hoy: FechaISO): Comercio[] {
  const por = new Map<string, Comercio>();
  for (const p of promociones) {
    if (p.comercio === null || p.vigencia.hasta < hoy) continue;
    const nombre = p.comercio.trim().replace(/\s+/g, " ");
    if (claveDeComercio(nombre) === "") continue;
    // El mismo par con otra escritura («Café» / «Cafe», «McDonald's» / «Mc Donald's») es una sola
    // entrada, con el primer nombre que llegó.
    const id = idDeComercio(nombre, p.categoriaId);
    if (por.has(id)) continue;
    por.set(id, {
      id,
      nombre,
      inicial: nombre.charAt(0).toUpperCase(),
      rubro: RUBRO_DE_CATEGORIA.get(p.categoriaId) ?? "otro",
      categoriaId: p.categoriaId,
      frecuente: false,
    });
  }
  // Por nombre y, a igual nombre, por categoría: el orden no depende del orden de las promos.
  return [...por.values()].sort(
    (a, b) => a.nombre.localeCompare(b.nombre, "es") || (a.categoriaId ?? 0) - (b.categoriaId ?? 0),
  );
}

/** Los que contienen lo buscado («farma» encuentra «FARMACITY»); vacío si no se buscó nada. */
export function buscarComercios(catalogo: readonly Comercio[], q: string, limite = 20): Comercio[] {
  const t = claveDeComercio(q);
  if (t === "") return [];
  return catalogo.filter((c) => claveDeComercio(c.nombre).includes(t)).slice(0, limite);
}

/** El rubro para mostrar al lado del nombre: el de la app o, si no lo tiene, el de MODO. */
export function nombreDeRubro(c: Comercio): string {
  if (c.rubro !== "otro" || c.categoriaId === null) return RUBROS[c.rubro].titulo;
  return CATEGORIAS_MODO.find((x) => x.id === c.categoriaId)?.nombre ?? RUBROS.otro.titulo;
}

/**
 * Etiqueta del chip: el nombre solo, salvo que el mismo nombre esté en la lista en otro rubro;
 * ahí lleva el rubro para que el usuario elija cuál (spec 004, Edge Cases).
 */
export function etiquetaDeComercio(c: Comercio, lista: readonly Comercio[]): string {
  const n = claveDeComercio(c.nombre);
  const repetido = lista.some((x) => x.id !== c.id && claveDeComercio(x.nombre) === n);
  return repetido ? `${c.nombre} · ${nombreDeRubro(c)}` : c.nombre;
}

/** Todos los del catálogo con ese nombre («coto» = «COTO»): uno por rubro, en el orden del catálogo. */
export function comerciosConNombre(nombre: string, catalogo: readonly Comercio[]): Comercio[] {
  const n = claveDeComercio(nombre);
  return catalogo.filter((c) => claveDeComercio(c.nombre) === n);
}

/**
 * El del catálogo con ese nombre, o `undefined`. Si está en dos rubros, el de `categoriaId` (el
 * que eligió el usuario) o, sin él, el primero por categoría: solo para cuando no hay cómo
 * preguntar cuál (un nombre escrito en un ticket).
 */
export function comercioDelCatalogo(
  nombre: string,
  catalogo: readonly Comercio[],
  categoriaId?: number,
): Comercio | undefined {
  const mismos = comerciosConNombre(nombre, catalogo);
  return (categoriaId === undefined ? undefined : mismos.find((c) => c.categoriaId === categoriaId)) ?? mismos[0];
}

const PREFIJO_RUBRO = "rubro-";

/**
 * Elegir un rubro sin comercio (spec 004 FR-001): uno de los 13 de MODO. Se representa como un
 * comercio con el nombre de la categoría; el pedido al motor va sin comercio, así solo aplican
 * las promos de todo el rubro.
 */
export function comercioDeRubro(categoriaId: number): Comercio {
  const nombre = CATEGORIAS_MODO.find((x) => x.id === categoriaId)?.nombre ?? RUBROS.otro.titulo;
  return {
    id: `${PREFIJO_RUBRO}${categoriaId}`,
    nombre,
    inicial: nombre.charAt(0).toUpperCase(),
    rubro: RUBRO_DE_CATEGORIA.get(categoriaId) ?? "otro",
    categoriaId,
    frecuente: false,
  };
}

/** Los 13 rubros de MODO, en su orden. */
export const RUBROS_DE_MODO: readonly Comercio[] = CATEGORIAS_MODO.map((x) => comercioDeRubro(x.id));

/** Se eligió un rubro, no un comercio. */
export function esComercioDeRubro(c: Comercio): boolean {
  return c.id.startsWith(PREFIJO_RUBRO);
}

/** Nombres de MODO que no entran en un chip: el corto para los chips de rubro (elegir comercio, v10). */
const NOMBRE_CORTO_DE_CATEGORIA: ReadonlyMap<number, string> = new Map([
  [4, "Farmacias"],
  [10, "Electro"],
  [11, "Ferretería"],
  [13, "Jugueterías"],
]);

/** El nombre de un rubro de MODO para un chip («Farmacias» en vez de «Farmacias, Perfumerías y Peluquerías»). */
export function nombreCortoDeRubro(categoriaId: number): string {
  return NOMBRE_CORTO_DE_CATEGORIA.get(categoriaId) ?? CATEGORIAS_MODO.find((x) => x.id === categoriaId)?.nombre ?? RUBROS.otro.titulo;
}

/**
 * Lo que lista «¿Dónde estás comprando?» (v10): los comercios del catálogo, con los del usuario
 * primero y después por nombre; con `categoriaId`, solo los de ese rubro; con `q`, los que
 * coinciden, primero los que empiezan con lo escrito. Sin repetir un mismo comercio del mismo rubro.
 */
export function comerciosParaElegir(
  catalogo: readonly Comercio[],
  propios: readonly Comercio[],
  { q = "", categoriaId = null }: { q?: string; categoriaId?: number | null } = {},
): Comercio[] {
  const t = claveDeComercio(q);
  const pasa = (c: Comercio) =>
    (categoriaId === null || c.categoriaId === categoriaId) && (t === "" || claveDeComercio(c.nombre).includes(t));
  // Buscando, primero lo que empieza con lo escrito, después lo que tiene una palabra que empieza así.
  const cercania = (c: Comercio) => {
    if (t === "") return 0;
    const n = claveDeComercio(c.nombre);
    return n.startsWith(t) ? 0 : n.split(/\s+/).some((w) => w.startsWith(t)) ? 1 : 2;
  };
  const primeros = propios.filter(pasa).sort((a, b) => cercania(a) - cercania(b));
  const resto = catalogo
    .filter((c) => pasa(c) && !primeros.some((p) => p.id === c.id))
    .sort(
      (a, b) =>
        cercania(a) - cercania(b) || Number(b.frecuente) - Number(a.frecuente) || a.nombre.localeCompare(b.nombre, "es"),
    );
  return [...primeros, ...resto];
}
