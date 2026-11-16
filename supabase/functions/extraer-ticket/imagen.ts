/**
 * Validación del pedido antes de llamar al proveedor (spec 013 FR-001 y
 * FR-002, research R3): tipo, tamaño, base64 y los primeros bytes de cada
 * formato. Rechaza sin gastar el cupo de Groq. La imagen no sale de memoria.
 */
import { esObjeto } from "../_shared/objeto.ts";
import type { TipoImagen } from "./extractor.ts";

/** Imagen decodificada: con margen bajo el límite del proveedor para imágenes en el pedido (FR-002). */
export const MAXIMO_BYTES_IMAGEN = 2_500_000;

/** Largo máximo del texto en base64 para `MAXIMO_BYTES_IMAGEN` bytes. */
const MAXIMO_LARGO_BASE64 = Math.ceil(MAXIMO_BYTES_IMAGEN / 3) * 4;

/**
 * Los formatos aceptados y sus primeros bytes. En WebP, `null` es "cualquier
 * byte" (el largo del archivo). Sumar un formato es sumarlo a `TipoImagen` y
 * acá: el compilador exige los dos.
 */
const FIRMAS: Record<TipoImagen, readonly (number | null)[]> = {
  "image/jpeg": [0xff, 0xd8, 0xff],
  "image/png": [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  "image/webp": [0x52, 0x49, 0x46, 0x46, null, null, null, null, 0x57, 0x45, 0x42, 0x50],
};

export type ResultadoImagen =
  | { ok: true; bytes: Uint8Array; tipo: TipoImagen }
  | {
      ok: false;
      codigo: "invalido" | "formato_no_soportado" | "imagen_demasiado_grande" | "imagen_danada";
      /** Solo con `invalido`: qué dato del pedido falta. */
      campo: string | null;
    };

function decodificar(base64: string): Uint8Array | null {
  if (base64 === "" || base64.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) return null;
  try {
    const binario = atob(base64);
    const bytes = new Uint8Array(binario.length);
    for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

function esTipoImagen(tipo: string): tipo is TipoImagen {
  return Object.hasOwn(FIRMAS, tipo);
}

function coincideFirma(bytes: Uint8Array, tipo: TipoImagen): boolean {
  const firma = FIRMAS[tipo];
  return bytes.length >= firma.length && firma.every((b, i) => b === null || bytes[i] === b);
}

export function validarPedidoImagen(cuerpo: unknown): ResultadoImagen {
  if (!esObjeto(cuerpo)) return { ok: false, codigo: "invalido", campo: "body" };
  const { imagen, tipo } = cuerpo;
  if (typeof imagen !== "string") return { ok: false, codigo: "invalido", campo: "imagen" };
  if (typeof tipo !== "string") return { ok: false, codigo: "invalido", campo: "tipo" };
  if (!esTipoImagen(tipo)) return { ok: false, codigo: "formato_no_soportado", campo: null };

  // Antes de decodificar: una imagen demasiado grande no se procesa.
  if (imagen.length > MAXIMO_LARGO_BASE64) return { ok: false, codigo: "imagen_demasiado_grande", campo: null };

  const bytes = decodificar(imagen);
  if (bytes === null || !coincideFirma(bytes, tipo)) return { ok: false, codigo: "imagen_danada", campo: null };
  if (bytes.length > MAXIMO_BYTES_IMAGEN) return { ok: false, codigo: "imagen_demasiado_grande", campo: null };
  return { ok: true, bytes, tipo };
}
