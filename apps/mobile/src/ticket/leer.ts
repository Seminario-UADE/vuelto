/**
 * La lectura completa de una foto (spec 014, FR-004 a FR-007): preparar → pedir → borrar. Lo
 * nativo (achicar y borrar) y la llamada al servicio llegan por parámetro, así se testea en Node.
 *
 * Las copias de la foto se borran en un `finally`, salga bien o mal, antes de devolver el
 * resultado (constitución 3.0.2, research R4). La foto nunca sale de esta función.
 */

import type { LecturaApp } from "../data/contracts";

/** El máximo que acepta el servicio (spec 013), decodificado. */
export const MAXIMO_BYTES = 2_500_000;

/** La foto lista para mandar: JPEG en base64 y las rutas de las copias que dejó prepararla. */
export type FotoPreparada = { base64: string; temporales: string[] };

export type DependenciasLectura = {
  /** Achica la foto y la pasa a JPEG. */
  preparar: (uri: string) => Promise<FotoPreparada>;
  /** Manda el base64 al servicio. */
  pedir: (base64: string) => Promise<LecturaApp>;
  /** Borra archivos del celular. */
  borrar: (rutas: string[]) => Promise<void>;
};

/** Cuánto pesa, decodificado, un base64. */
export function bytesDe(base64: string): number {
  const relleno = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return (base64.length / 4) * 3 - relleno;
}

/** En web la foto no es un archivo (`blob:` o `data:`): no hay nada que borrar. */
function esArchivo(ruta: string): boolean {
  return !ruta.startsWith("blob:") && !ruta.startsWith("data:");
}

export async function leerFoto(uri: string, deps: DependenciasLectura): Promise<LecturaApp> {
  const temporales = [uri];
  try {
    let foto: FotoPreparada;
    try {
      foto = await deps.preparar(uri);
    } catch {
      // No se pudo abrir ni achicar (dañada, formato raro): con otra foto puede andar (FR-011).
      return { ok: false, resultado: "foto_no_valida" };
    }
    temporales.push(...foto.temporales);
    if (bytesDe(foto.base64) > MAXIMO_BYTES) return { ok: false, resultado: "imagen_demasiado_grande" };
    try {
      return await deps.pedir(foto.base64);
    } catch {
      return { ok: false, resultado: "interno" };
    }
  } finally {
    try {
      const archivos = temporales.filter(esArchivo);
      if (archivos.length > 0) await deps.borrar(archivos);
    } catch {
      // No deja al usuario sin salida: lo que quede se borra al abrir «Escanear ticket» (R4).
    }
  }
}
