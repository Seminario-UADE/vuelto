/** Por código de carácter, no por idioma: el mismo orden en Node y en Deno. */
export function compararIds(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
