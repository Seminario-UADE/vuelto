/**
 * Ids estables de las promos del corpus (research D9): un UUID v5 calculado
 * de la clave natural. El seed, la carga remota y las fixtures del motor usan
 * la misma función, así que un mismo `fuenteId` da siempre el mismo id aunque
 * se reinicie la base o se vuelva a cargar. Sin dependencias: `node:crypto`.
 */
import { createHash } from "node:crypto";
import type { Promocion } from "@vuelto/motor";

/** Espacio de nombres propio de Vuelto para los ids de promociones. No cambiar: cambia todos los ids. */
const ESPACIO_DE_NOMBRES = "6f1c8e0a-3b52-4c7e-9d1a-2b8f5e7a4c10";

const FORMATO_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** UUID v5 (RFC 4122 §4.3): SHA-1 de `namespace` + `nombre`. */
export function uuidV5(namespace: string, nombre: string): string {
  if (!FORMATO_UUID.test(namespace)) throw new Error(`namespace inválido (no es un UUID): ${namespace}`);
  const base = Buffer.from(namespace.replace(/-/g, ""), "hex");
  const hash = createHash("sha1").update(base).update(nombre, "utf8").digest();
  const bytes = hash.subarray(0, 16);
  bytes[6] = (bytes[6]! & 0x0f) | 0x50; // versión 5
  bytes[8] = (bytes[8]! & 0x3f) | 0x80; // variante RFC 4122
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Id de una promo del corpus: depende solo de la fuente y de su `fuenteId`. */
export function idDePromocion(fuente: Promocion["fuente"], fuenteId: string): string {
  if (fuenteId.trim() === "") throw new Error("fuenteId vacío: no se puede calcular el id de la promo");
  return uuidV5(ESPACIO_DE_NOMBRES, `${fuente}:${fuenteId}`);
}

/** `dona-catalina-nov26#b-049ad22b.c-1` → `dona-catalina-nov26`: el slug de MODO de una entrada, partida o no. */
export function slugBase(fuenteId: string): string {
  const i = fuenteId.indexOf("#");
  return i === -1 ? fuenteId : fuenteId.slice(0, i);
}
