/**
 * Los comercios del buscador (issue #43, spec 004 FR-030): salen de las promociones del corpus,
 * no de una lista armada a mano. Funciones puras: el selector `selectCatalogoComercios` las
 * llama con el corpus del store y `hoy` (ADR-010), así el buscador anda sin red.
 */
import { CATEGORIAS_MODO, type FechaISO, type Promocion } from "@vuelto/motor";
import { RUBROS } from "../lib/rubros";
import { normalizarComercio } from "../perfil/modelo";
import type { Comercio, Rubro } from "./contracts";

/** Las categorías de MODO que la app ya conoce como rubro (ícono y textos propios). */
const RUBRO_DE_CATEGORIA = new Map<number, Rubro>(
  (Object.entries(RUBROS) as [Rubro, (typeof RUBROS)[Rubro]][]).flatMap(([rubro, r]) =>
    r.categoriaId === null ? [] : [[r.categoriaId, rubro] as [number, Rubro]],
  ),
);

/**
 * Clave para comparar nombres en el buscador (spec 004 FR-002): sin mayúsculas, acentos ni
 * espacios de más. «Café  Martínez» y «cafe martinez» son el mismo comercio.
 */
export function claveDeComercio(nombre: string): string {
  return normalizarComercio(nombre).normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

/** El mismo comercio en el mismo rubro tiene siempre el mismo id, venga de la promo que venga. */
export function idDeComercio(nombre: string, categoriaId: number): string {
  return `${categoriaId}-${claveDeComercio(nombre).replace(/ /g, "-")}`;
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
    if (nombre === "") continue;
    // El mismo par con otra escritura («Café» / «Cafe») queda con el primer nombre que llegó.
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
 * El del catálogo con ese nombre, o `undefined`. Si está en dos rubros, el primero (por
 * categoría): solo para cuando no hay cómo preguntar cuál (un nombre escrito en un ticket).
 */
export function comercioDelCatalogo(nombre: string, catalogo: readonly Comercio[]): Comercio | undefined {
  return comerciosConNombre(nombre, catalogo)[0];
}
