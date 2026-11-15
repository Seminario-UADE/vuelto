/**
 * División de un gasto en grupo (spec 013, FR-006 y D3): pesos enteros. Cada
 * uno pone la parte entera de `total / n`; el resto se reparte de a $1 entre
 * los primeros del orden recibido (el del desempate). La suma es exactamente
 * `total`. No distingue débito de crédito (D2).
 */
export function dividir(total: number, n: number): number[] {
  if (!Number.isInteger(total) || total < 0) throw new RangeError("El total tiene que ser un entero ≥ 0.");
  if (!Number.isInteger(n) || n < 1) throw new RangeError("La cantidad tiene que ser un entero ≥ 1.");
  const base = Math.floor(total / n);
  const resto = total - base * n;
  return Array.from({ length: n }, (_, i) => (i < resto ? base + 1 : base));
}
