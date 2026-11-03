/**
 * Orden de las marcas de tiempo del servidor. PostgREST recorta los ceros finales de los segundos
 * fraccionarios, así que el texto solo no se puede comparar: primero se comparan los instantes y,
 * con el mismo milisegundo, el texto (que ya trae los microsegundos).
 */
export function compararMarcas(a: string, b: string): number {
  const d = Date.parse(a) - Date.parse(b);
  if (d !== 0) return d;
  return a < b ? -1 : a > b ? 1 : 0;
}
