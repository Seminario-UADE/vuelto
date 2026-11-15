/** Un objeto JSON: ni `null`, ni un array, ni un valor suelto. */
export function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}
