/**
 * Cuánto pesa el corpus en el dispositivo (spec 009 FR-020, issue #42): serializa las promos con el
 * mismo `JSON.stringify` que guarda la persistencia y compara contra los topes de AsyncStorage en
 * Android (~6 MB en total, ~2 MB por valor). Núcleo funcional: no lee red ni disco.
 */
import type { Promocion } from "@vuelto/motor";
import { corpusAPersistir } from "../store/persistencia";

export const TOPE_TOTAL_BYTES = 6 * 1024 * 1024;
export const TOPE_VALOR_BYTES = 2 * 1024 * 1024;

export interface Medicion {
  cantidad: number;
  /** Bytes (UTF-8) del valor completo que se guarda en `vuelto.corpus.v1`. */
  bytesTotales: number;
  promedioPorPromo: number;
  maximoPorPromo: number;
  /** `bytesTotales / 6 MB`: el corpus frente al tope total de AsyncStorage en Android. */
  fraccionDe6MB: number;
  /** `bytesTotales / 2 MB`: frente al tope de un solo valor (todo el corpus es un valor). */
  fraccionDe2MB: number;
}

const bytes = (texto: string) => new TextEncoder().encode(texto).length;

export function medirCorpus(promociones: Promocion[]): Medicion {
  const porPromo = promociones.map((p) => bytes(JSON.stringify(p)));
  const total = bytes(JSON.stringify(corpusAPersistir({ promociones, marca: null, sincronizadoEn: null, descartadas: 0 })));
  return {
    cantidad: promociones.length,
    bytesTotales: total,
    promedioPorPromo: porPromo.length === 0 ? 0 : Math.round(porPromo.reduce((a, b) => a + b, 0) / porPromo.length),
    maximoPorPromo: porPromo.length === 0 ? 0 : Math.max(...porPromo),
    fraccionDe6MB: total / TOPE_TOTAL_BYTES,
    fraccionDe2MB: total / TOPE_VALOR_BYTES,
  };
}

/**
 * PROYECCIÓN, no medición: el tamaño de `cantidad` promos como las de `muestra`. Sirve mientras no
 * haya un corpus real (#35); siempre se rotula como proyección.
 */
export function proyectarCorpus(muestra: Promocion[], cantidad: number): Medicion {
  const m = medirCorpus(muestra);
  const total = m.promedioPorPromo * cantidad;
  return {
    cantidad,
    bytesTotales: total,
    promedioPorPromo: m.promedioPorPromo,
    maximoPorPromo: m.maximoPorPromo,
    fraccionDe6MB: total / TOPE_TOTAL_BYTES,
    fraccionDe2MB: total / TOPE_VALOR_BYTES,
  };
}

export function informe(m: Medicion, rotulo: string): string {
  const kb = (b: number) => `${(b / 1024).toFixed(1)} KB`;
  return [
    rotulo,
    `  promos:              ${m.cantidad}`,
    `  total serializado:   ${kb(m.bytesTotales)} (${m.bytesTotales} bytes)`,
    `  por promo:           promedio ${m.promedioPorPromo} bytes, máximo ${m.maximoPorPromo} bytes`,
    `  frente a 6 MB (Android, total):    ${(m.fraccionDe6MB * 100).toFixed(1)} %`,
    `  frente a 2 MB (un solo valor):     ${(m.fraccionDe2MB * 100).toFixed(1)} %`,
  ].join("\n");
}
