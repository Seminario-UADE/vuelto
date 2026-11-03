/**
 * Lo que comparten los scripts de la ingesta: argumentos, «hoy» y el arranque como script.
 */
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { fechaArgentina } from "@vuelto/motor";

/** La fecha de hoy en Argentina (`YYYY-MM-DD`), con la misma función que usa el motor. */
export function hoyEnArgentina(ahora: Date = new Date()): string {
  return fechaArgentina(ahora);
}

/**
 * Corre `main` solo si este módulo es el que se ejecutó con `node <archivo>`; un error
 * (también el de una función asíncrona) se muestra y deja el código de salida en 1.
 */
export function ejecutarComoScript(urlDelModulo: string, main: () => void | Promise<void>): void {
  if (!esEntrada(urlDelModulo)) return;
  Promise.resolve()
    .then(main)
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
}

export interface Argumentos {
  /** `--clave valor` y `--clave=valor`. */
  valores: Record<string, string>;
  /** `--clave` sin valor. */
  banderas: string[];
  posicionales: string[];
}

/**
 * `banderasSueltas` son las opciones que no llevan valor (`--aplicar`): sin esa
 * lista, `--aplicar slug` no se puede distinguir de `--categorias 1`.
 */
export function parsearArgumentos(argv: readonly string[], banderasSueltas: readonly string[] = []): Argumentos {
  const resultado: Argumentos = { valores: {}, banderas: [], posicionales: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (!arg.startsWith("--")) {
      resultado.posicionales.push(arg);
      continue;
    }
    const igual = arg.indexOf("=");
    if (igual !== -1) {
      resultado.valores[arg.slice(2, igual)] = arg.slice(igual + 1);
      continue;
    }
    const siguiente = argv[i + 1];
    if (!banderasSueltas.includes(arg.slice(2)) && siguiente !== undefined && !siguiente.startsWith("--")) {
      resultado.valores[arg.slice(2)] = siguiente;
      i++;
    } else {
      resultado.banderas.push(arg.slice(2));
    }
  }
  return resultado;
}

/** ¿Este módulo es el que se ejecutó con `node <archivo>` (y no uno importado)? */
export function esEntrada(urlDelModulo: string): boolean {
  const ejecutado = process.argv[1];
  if (ejecutado === undefined) return false;
  return pathToFileURL(resolve(ejecutado)).href === urlDelModulo;
}
