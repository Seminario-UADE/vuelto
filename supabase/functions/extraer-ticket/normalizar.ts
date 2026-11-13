/**
 * Conversión de lo impreso a los valores del producto (spec 013 FR-004 y
 * FR-008, research R4). Funciones puras. Traducen lo que está escrito; nunca
 * deducen lo que no está (constitución §III): lo que no encaja queda `null`.
 */
import type { FechaISO, Red, TipoTarjeta } from "@vuelto/motor";

/** Mayúsculas, sin tildes y con cualquier signo convertido en un espacio. */
function palabras(texto: string): string {
  return ` ${texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim()} `;
}

function tienePalabra(normalizado: string, palabra: string): boolean {
  return normalizado.includes(` ${palabra} `);
}

/**
 * Importe en formato argentino: coma decimal y punto de miles. Sin coma, los
 * puntos son de miles solo si separan grupos de 3 dígitos: "24.50" es ambiguo.
 */
export function normalizarImporte(impreso: string | null): number | null {
  if (impreso === null) return null;
  const s = impreso.trim().replace(/^\$\s*/, "").replace(/\s+/g, "");
  if (!/^[\d.,]+$/.test(s)) return null;

  const partes = s.split(",");
  if (partes.length > 2) return null;
  const [entero = "", decimales] = partes;
  if (decimales !== undefined && !/^\d{1,2}$/.test(decimales)) return null;
  if (!/^\d+$/.test(entero) && !/^\d{1,3}(\.\d{3})+$/.test(entero)) return null;

  const valor = Number(`${entero.replace(/\./g, "")}${decimales === undefined ? "" : `.${decimales}`}`);
  return valor > 0 ? valor : null;
}

/**
 * Fecha "dd/mm/aaaa" o "dd/mm/aa" (separador `/`, `-` o `.`), aunque venga con
 * la hora. Vacía si no tiene año, no existe o es posterior a `hoy` (FR-008).
 */
export function normalizarFecha(impresa: string | null, hoy: FechaISO): FechaISO | null {
  if (impresa === null) return null;
  const m = /(?:^|\D)(\d{1,2})[/.-](\d{1,2})[/.-](\d{4}|\d{2})(?!\d)/.exec(impresa);
  if (!m) return null;
  const dia = Number(m[1]);
  const mes = Number(m[2]);
  const anio = m[3]!.length === 2 ? 2000 + Number(m[3]) : Number(m[3]);

  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  const existe = fecha.getUTCFullYear() === anio && fecha.getUTCMonth() === mes - 1 && fecha.getUTCDate() === dia;
  if (!existe) return null;
  const iso = fecha.toISOString().slice(0, 10);
  return iso > hoy ? null : iso;
}

/** Nombres impresos de cada red, comparados como palabras enteras. */
const REDES: [string, Red][] = [
  ["AMERICAN EXPRESS", "american_express"],
  ["AMEX", "american_express"],
  ["DINERS CLUB", "dinners_club"],
  ["DINERS", "dinners_club"],
  ["TARJETA SOL", "tarjeta_sol"],
  ["MASTERCARD", "master"],
  ["MASTER", "master"],
  ["MC", "master"],
  ["MAESTRO", "maestro"],
  ["VISA", "visa"],
  ["CABAL", "cabal"],
  ["NARANJA", "naranja"],
  ["CONFIABLE", "confiable"],
];

/** La red por su nombre impreso. Nunca por los dígitos (US1-6); dos redes distintas → `null`. */
export function normalizarRed(impresa: string | null): Red | null {
  if (impresa === null) return null;
  const normalizado = palabras(impresa);
  const encontradas = new Set(REDES.filter(([nombre]) => tienePalabra(normalizado, nombre)).map(([, red]) => red));
  return encontradas.size === 1 ? [...encontradas][0]! : null;
}

/** Débito o crédito por las palabras impresas; las dos o ninguna → `null`. */
export function normalizarTipo(impreso: string | null): TipoTarjeta | null {
  if (impreso === null) return null;
  const normalizado = palabras(impreso);
  const debito = tienePalabra(normalizado, "DEBITO") || tienePalabra(normalizado, "DEB");
  const credito = tienePalabra(normalizado, "CREDITO") || tienePalabra(normalizado, "CRED");
  if (debito === credito) return null;
  return debito ? "debito" : "credito";
}

/** Exactamente 4 dígitos, sin la máscara impresa ("**** 4114" → "4114"). */
export function normalizarUltimos4(impresos: string | null): string | null {
  if (impresos === null) return null;
  const digitos = impresos.replace(/[\s*xX-]/g, "");
  return /^\d{4}$/.test(digitos) ? digitos : null;
}

/** Banco y comercio: sin espacios de más; vacío → `null`. */
export function normalizarTexto(texto: string | null): string | null {
  if (texto === null) return null;
  const limpio = texto.trim().replace(/\s+/g, " ");
  return limpio === "" ? null : limpio;
}
