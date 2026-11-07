import type { ColorValue } from "react-native";

/**
 * Resuelve un rol del tema en Android y web (en iOS lo reemplaza `theme-color.ios.ts`).
 *
 * Acá no hay colores dinámicos del sistema: el valor sale del esquema que fija `TemaProvider` con
 * `useColorScheme()` en cada render, y el provider vuelve a montar el árbol cuando el esquema cambia.
 * Sin React Native a propósito, para que los tests de Vitest (Node) puedan importar el tema.
 */

export type Esquema = "claro" | "oscuro";

let esquemaActual: Esquema = "claro";

/** Fija el esquema activo. Solo lo llama `TemaProvider`. */
export function fijarEsquema(esquema: Esquema): void {
  esquemaActual = esquema;
}

/** `false`: el árbol tiene que volver a montarse para tomar el tema nuevo. */
export const temaSeResuelveSolo = false;

export function colorPorTema(_rol: string, claro: string, oscuro: string): ColorValue {
  return esquemaActual === "oscuro" ? oscuro : claro;
}
