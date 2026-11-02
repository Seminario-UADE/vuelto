/**
 * Ayuda para la revisión humana de la letra chica: marca las frases donde
 * suelen estar la acumulabilidad, el tope y su alcance, el monto mínimo, el
 * canal y la zona. **No interpreta nada**: no decide si una promo es
 * acumulable o dónde rige; solo muestra dónde mirar (constitución §III, sin
 * modelos de lenguaje).
 */
import { normalizar } from "@vuelto/motor";
import { esFechaISO } from "./dominio.ts";

export interface Resaltado {
  frase: string;
  /** Términos (normalizados) que aparecen en la frase, en el orden de la lista de términos. */
  terminos: string[];
}

/** Término normalizado y cómo se busca en la frase normalizada. */
const TERMINOS: readonly { nombre: string; patron: RegExp }[] = [
  // La negación puede estar separada: «no será acumulable», «no se superpone ni es acumulativo».
  { nombre: "no acumul", patron: /\bno\b[^.;]{0,25}acumul/ },
  { nombre: "acumul", patron: /acumul/ },
  { nombre: "tope", patron: /tope/ },
  { nombre: "compartid", patron: /compartid/ },
  { nombre: "minim", patron: /minim/ },
  { nombre: "online", patron: /online/ },
  { nombre: "sucursal", patron: /sucursal/ },
  { nombre: "provincia", patron: /provincia/ },
  // Palabra entera: «CABAL» es una tarjeta, no la ciudad.
  { nombre: "caba", patron: /\bcaba\b/ },
  { nombre: "amba", patron: /\bamba\b/ },
];

const ENTIDADES: Readonly<Record<string, string>> = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&quot;": '"',
  "&apos;": "'",
  "&lt;": "<",
  "&gt;": ">",
};

/** HTML del legal → texto plano, con las entidades decodificadas y los espacios juntos. */
export function aTexto(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number.parseInt(dec, 10)))
    .replace(/&[a-z]+;/gi, (entidad) => ENTIDADES[entidad.toLowerCase()] ?? entidad)
    .replace(/\s+/g, " ")
    .trim();
}

/** Las fechas `dd/mm/aaaa` de un texto (ya en texto plano), como ISO y ordenadas. Descarta las que no existen. */
export function fechasDelLegal(texto: string): string[] {
  const fechas: string[] = [];
  for (const m of texto.matchAll(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g)) {
    const iso = `${m[3]}-${m[2]!.padStart(2, "0")}-${m[1]!.padStart(2, "0")}`;
    if (esFechaISO(iso)) fechas.push(iso);
  }
  return fechas.sort();
}

/** La fecha más reciente que menciona la letra chica (HTML), o `null`. Es una pista de cuándo termina, no una conclusión. */
export function fechaDeCierreDelLegal(html: string): string | null {
  return fechasDelLegal(aTexto(html)).at(-1) ?? null;
}

/** Frases del legal que contienen al menos un término de interés. */
export function resaltar(html: string): Resaltado[] {
  const texto = aTexto(html);
  if (texto === "") return [];
  // Una frase termina en «.» o «;» seguido de un espacio: «$10.000» no se parte.
  const frases = texto.split(/(?<=[.;])\s+/);
  const resaltados: Resaltado[] = [];
  for (const frase of frases) {
    const normalizada = normalizar(frase);
    const terminos = TERMINOS.filter((t) => t.patron.test(normalizada)).map((t) => t.nombre);
    // «no acumul» ya contiene a «acumul»: se informa solo el más específico.
    const finales = terminos.includes("no acumul") ? terminos.filter((t) => t !== "acumul") : terminos;
    if (finales.length > 0) resaltados.push({ frase, terminos: finales });
  }
  return resaltados;
}
