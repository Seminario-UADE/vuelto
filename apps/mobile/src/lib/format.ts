/**
 * Formato de cifras y fechas para es-AR. Sin dependencias de React Native, así lo pueden
 * usar los tests y la capa de datos.
 */

// Se agrupa a mano en lugar de usar Intl: el separador de miles de es-AR es el punto, y
// así el resultado no depende de los datos de Intl que traiga cada motor de JS.
function miles(n: number): string {
  const entero = Math.round(Math.abs(n)).toString();
  return entero.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** 24500 → "$24.500" */
export function pesos(n: number): string {
  return `${n < 0 ? "−" : ""}$${miles(n)}`;
}

/** Cifra estimada: 4900 → "≈$4.900" (Principio V). */
export function aprox(n: number): string {
  return `≈${pesos(n)}`;
}

/** "24.500" o "24500" → 24500; vacío o inválido → null. */
export function parseMonto(texto: string): number | null {
  const digitos = texto.replace(/\D/g, "");
  if (digitos === "") return null;
  const n = Number(digitos);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** 24500 → "24.500" (para mostrar en un campo mientras se tipea). */
export function montoEditable(n: number | null): string {
  return n === null ? "" : miles(n);
}

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

function partes(iso: string): { y: number; m: number; d: number; dow: number } {
  const [y = 2026, m = 1, d = 1] = iso.split("-").map(Number);
  return { y, m, d, dow: new Date(Date.UTC(y, m - 1, d)).getUTCDay() };
}

/** "2026-10-14" → "14/10" */
export function fechaCorta(iso: string): string {
  const { m, d } = partes(iso);
  return `${d}/${m}`;
}

/** "2026-10-14" → "Miércoles 14" (encabezado de grupo en Mis compras). */
export function diaDelMes(iso: string): string {
  const { d, dow } = partes(iso);
  return `${DIAS[dow]} ${d}`;
}

/** "2026-10-14" → "miércoles 14 de octubre" */
export function fechaLarga(iso: string): string {
  const { m, d, dow } = partes(iso);
  return `${DIAS[dow]?.toLowerCase()} ${d} de ${MESES[m - 1]}`;
}

/** "Lucía" → "L"; "Mateo Pérez" → "MP" */
export function iniciales(nombre: string): string {
  const palabras = nombre.trim().split(/\s+/).filter(Boolean);
  return palabras
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");
}
