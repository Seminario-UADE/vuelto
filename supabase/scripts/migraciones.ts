/**
 * Compara las migraciones del repo con las de la base alojada (issue #127), a partir de la
 * salida de `supabase migration list`. Lógica pura: no lee archivos ni toca la red, así se
 * prueba con salidas de ejemplo. La conexión y el código de salida los pone
 * `verificar-migraciones.ts`.
 *
 * La tabla del CLI tiene tres columnas (`LOCAL │ REMOTE │ TIME (UTC)`). Una versión que
 * está solo en LOCAL es una migración que el repo trae y la base alojada no tiene.
 */

export type FilaMigracion = {
  /** Versión de la migración (el prefijo numérico del nombre del archivo), o `null` si falta. */
  local: string | null;
  remota: string | null;
};

export type EstadoMigraciones = {
  /** Están en el repo y no en la base alojada: hay que aplicarlas. */
  sinAplicar: string[];
  /** Están en la base alojada y no en el repo (se aplicaron desde otra rama o se borraron del repo). */
  soloRemotas: string[];
  /** Cuántas versiones distintas se leyeron en total. */
  leidas: number;
};

const VERSION = /^\d{14}$/;
// Códigos de color del CLI, por si la salida no viene de una terminal sin colores.
// eslint-disable-next-line no-control-regex
const ANSI = /\u001B\[[0-9;]*m/g;

function comoVersion(celda: string | undefined): string | null {
  const valor = (celda ?? "").trim();
  return VERSION.test(valor) ? valor : null;
}

/** Filas de la tabla; ignora el encabezado, los separadores y cualquier otra línea. */
export function leerFilas(salida: string): FilaMigracion[] {
  const filas: FilaMigracion[] = [];
  for (const linea of salida.replace(ANSI, "").split(/\r?\n/)) {
    const celdas = linea.split(/[│|]/);
    if (celdas.length < 2) continue;
    const local = comoVersion(celdas[0]);
    const remota = comoVersion(celdas[1]);
    if (local === null && remota === null) continue;
    filas.push({ local, remota });
  }
  return filas;
}

export function compararMigraciones(salida: string): EstadoMigraciones {
  const filas = leerFilas(salida);
  return {
    sinAplicar: filas.filter((f) => f.local !== null && f.remota === null).map((f) => f.local as string),
    soloRemotas: filas.filter((f) => f.remota !== null && f.local === null).map((f) => f.remota as string),
    leidas: new Set(filas.map((f) => f.local ?? f.remota)).size,
  };
}
