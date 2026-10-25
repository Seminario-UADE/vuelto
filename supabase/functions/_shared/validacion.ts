/**
 * Validación del body de `POST /recomendar` (spec 003, FR-019). Vive en la
 * capa imperativa: el motor recibe datos ya validados (ADR-009).
 *
 * La existencia del rubro en el catálogo la chequea el servicio, porque
 * requiere leer la base.
 */
import type { Canal, CompraPropuesta } from "@vuelto/motor";

export type ResultadoValidacion = { ok: true; compra: CompraPropuesta } | { ok: false; campo: string };

const CAMPOS = ["comercio", "categoriaId", "monto", "canal"] as const;
const CANALES: readonly Canal[] = ["presencial", "online"];
const MONTO_MAXIMO = 100_000_000;
const COMERCIO_LARGO_MAXIMO = 100;

/** Hasta 2 decimales, con tolerancia para el redondeo binario (0,29 * 100 = 28,999…). */
function tieneHastaDosDecimales(n: number): boolean {
  return Math.abs(n * 100 - Math.round(n * 100)) < 1e-6;
}

function invalido(campo: string): ResultadoValidacion {
  return { ok: false, campo };
}

export function validarCompraPropuesta(body: unknown): ResultadoValidacion {
  if (typeof body !== "object" || body === null || Array.isArray(body)) return invalido("body");
  const datos = body as Record<string, unknown>;

  const extra = Object.keys(datos).find((k) => !(CAMPOS as readonly string[]).includes(k));
  if (extra !== undefined) return invalido(extra);

  const { categoriaId, monto, canal, comercio } = datos;
  if (typeof categoriaId !== "number" || !Number.isInteger(categoriaId)) return invalido("categoriaId");
  if (
    typeof monto !== "number" ||
    !Number.isFinite(monto) ||
    monto <= 0 ||
    monto > MONTO_MAXIMO ||
    !tieneHastaDosDecimales(monto)
  ) {
    return invalido("monto");
  }
  if (typeof canal !== "string" || !(CANALES as readonly string[]).includes(canal)) return invalido("canal");

  let comercioLimpio: string | null;
  if (comercio === null) {
    comercioLimpio = null;
  } else if (typeof comercio === "string") {
    comercioLimpio = comercio.trim();
    // Caracteres, no unidades UTF-16: un emoji cuenta como 1.
    const largo = [...comercioLimpio].length;
    if (largo === 0 || largo > COMERCIO_LARGO_MAXIMO) return invalido("comercio");
  } else {
    return invalido("comercio");
  }

  return { ok: true, compra: { comercio: comercioLimpio, categoriaId, monto, canal: canal as Canal } };
}
