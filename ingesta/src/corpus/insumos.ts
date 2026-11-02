/**
 * Lectura de los archivos del corpus (los usan `corpus:generar` y `corpus:cargar`).
 * `leer` se inyecta: recibe una ruta relativa a la raíz del repo y devuelve el texto.
 */
import type { ArchivoCorpus, BancoCatalogo, Exclusion, GruposTope, Insumos } from "./tipos.ts";

export const RUTAS_INSUMOS = {
  promociones: "supabase/seed/promociones.json",
  exclusiones: "supabase/seed/exclusiones.json",
  gruposTope: "supabase/seed/grupos-tope.json",
  bancos: "docs/product/data/modo-bancos-raw.json",
} as const;

function leerJson(leer: (ruta: string) => string, ruta: string): unknown {
  let texto: string;
  try {
    texto = leer(ruta);
  } catch (error) {
    throw new Error(`No se pudo leer ${ruta}: ${error instanceof Error ? error.message : String(error)}`, { cause: error });
  }
  try {
    return JSON.parse(texto) as unknown;
  } catch (error) {
    throw new Error(`${ruta} no es un JSON válido`, { cause: error });
  }
}

/** El catálogo de bancos de MODO (`docs/product/data/modo-bancos-raw.json`): solo el id y el nombre. */
export function leerCatalogoBancos(leer: (ruta: string) => string): BancoCatalogo[] {
  const catalogo = leerJson(leer, RUTAS_INSUMOS.bancos) as { bancos?: unknown } | null;
  if (catalogo === null || !Array.isArray(catalogo.bancos)) {
    throw new Error(`${RUTAS_INSUMOS.bancos} no trae la lista de bancos (clave "bancos")`);
  }
  return (catalogo.bancos as BancoCatalogo[]).map((b) => ({ id: b.id, name: b.name }));
}

export function leerInsumos(leer: (ruta: string) => string): Insumos {
  const bancos = leerCatalogoBancos(leer);
  return {
    archivo: leerJson(leer, RUTAS_INSUMOS.promociones) as ArchivoCorpus,
    exclusiones: leerJson(leer, RUTAS_INSUMOS.exclusiones) as Exclusion[],
    gruposTope: leerJson(leer, RUTAS_INSUMOS.gruposTope) as GruposTope,
    bancos,
  };
}
