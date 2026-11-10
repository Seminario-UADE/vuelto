import type { Esquema } from "../theme-esquema";

/**
 * Cómo elige el tema el usuario (DESIGN.md §2, Apariencia): sigue al sistema o queda fijo.
 * Sin React Native a propósito, para probarlo con Vitest (Node).
 */
export const PREFERENCIAS = ["sistema", "claro", "oscuro"] as const;
export type PreferenciaTema = (typeof PREFERENCIAS)[number];

/** Una preferencia del dispositivo, no de la cuenta: sobrevive al cierre de sesión. */
export const CLAVE_APARIENCIA = "vuelto.apariencia.v1";

export function esPreferencia(x: unknown): x is PreferenciaTema {
  return typeof x === "string" && (PREFERENCIAS as readonly string[]).includes(x);
}

/** Lo guardado; cualquier cosa que no sea una preferencia conocida vuelve a «sistema». */
export function leerPreferencia(guardado: string | null): PreferenciaTema {
  return esPreferencia(guardado) ? guardado : "sistema";
}

/** El esquema que se dibuja: la preferencia manda y «sistema» deja el del dispositivo. */
export function esquemaEfectivo(preferencia: PreferenciaTema, delSistema: Esquema): Esquema {
  return preferencia === "sistema" ? delSistema : preferencia;
}

/** Lo que se le pide al sistema operativo: `unspecified` devuelve el control al dispositivo. */
export function esquemaParaElSistema(preferencia: PreferenciaTema): "light" | "dark" | "unspecified" {
  if (preferencia === "claro") return "light";
  if (preferencia === "oscuro") return "dark";
  return "unspecified";
}
