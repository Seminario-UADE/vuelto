import { Platform } from "react-native";

/** Lo mínimo del navegador que se lee: el proyecto compila sin los tipos de `lib.dom`. */
type Ventana = {
  navigator?: { standalone?: boolean };
  matchMedia?: (consulta: string) => { matches: boolean };
};

/** `true` si es la web abierta como app desde la pantalla de inicio (no una pestaña de Safari). */
export function esWebAppInstalada(): boolean {
  if (Platform.OS !== "web") return false;
  const ventana = globalThis as Ventana;
  return ventana.navigator?.standalone === true || ventana.matchMedia?.("(display-mode: standalone)").matches === true;
}

/**
 * Alto extra que se suma arriba, en pt, solo en la web app instalada del iPhone.
 *
 * iOS 26 difumina el contenido que queda bajo la barra de estado (un efecto de borde del sistema
 * que no se puede apagar desde la web) y el difuminado llega unos 25 pt más abajo del área segura. Con
 * esto el primer renglón de cada pantalla queda por debajo de esa franja y se lee nítido. En la
 * app nativa y en el navegador común no se suma nada.
 */
export const EXTRA_ARRIBA_WEB_APP = 8;

export function extraArribaWebApp(): number {
  return esWebAppInstalada() ? EXTRA_ARRIBA_WEB_APP : 0;
}
