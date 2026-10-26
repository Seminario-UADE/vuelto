/**
 * Aritmética de importes con enteros, para que "tope restante $0" sea
 * exactamente 0 y no 0,000000001 (FR-018). Adentro del motor todo es en
 * centavos; se pasa a pesos solo al armar la salida.
 *
 * Los productos son exactos mientras `centavos × 10000` no pase
 * `Number.MAX_SAFE_INTEGER`: compras de hasta ≈$900 millones.
 */

export function aCentavos(pesos: number): number {
  return Math.round(pesos * 100);
}

/** 20% → 2000. Así 33,3% no arrastra errores de coma flotante. */
export function aCentesimosDePunto(porcentaje: number): number {
  return Math.round(porcentaje * 100);
}

/** Redondea hacia abajo: nunca promete más reintegro que el real. */
export function aplicarPorcentaje(centavos: number, centesimosDePunto: number): number {
  return Math.floor((centavos * centesimosDePunto) / 10000);
}

export function aPesos(centavos: number): number {
  return centavos / 100;
}

/** 20000 → "$20.000"; 1500.5 → "$1.500,50". Sin `toLocaleString`: depende del runtime. */
export function pesos(monto: number): string {
  const [entero = "0", decimales = "00"] = monto.toFixed(2).split(".");
  const conMiles = entero.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return decimales === "00" ? `$${conMiles}` : `$${conMiles},${decimales}`;
}
