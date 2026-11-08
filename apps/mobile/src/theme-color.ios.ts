import { DynamicColorIOS, type ColorValue } from "react-native";

/**
 * En iOS cada rol es un `DynamicColorIOS`: UIKit lo resuelve según la apariencia y lo actualiza solo
 * al cambiarla, aun en estilos ya montados o calculados una vez. Nada que volver a montar.
 */

import type { Esquema } from "./theme-esquema";
export type { Esquema };

/** No hace falta: el sistema resuelve los colores dinámicos. */
export const fijarEsquema: (esquema: Esquema) => void = () => {};

export const temaSeResuelveSolo = true;

const cache = new Map<string, ColorValue>();

export function colorPorTema(rol: string, claro: string, oscuro: string): ColorValue {
  let color = cache.get(rol);
  if (!color) {
    color = DynamicColorIOS({ light: claro, dark: oscuro });
    cache.set(rol, color);
  }
  return color;
}
