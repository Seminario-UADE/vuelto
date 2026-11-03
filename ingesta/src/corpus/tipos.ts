/**
 * Tipos de la ingesta automática de promociones de MODO (issue #35, ADR-011).
 *
 * Regla (constitución §III): un dato ausente es `null` explícito, nunca un
 * campo opcional. En este archivo no hay ningún `?:`.
 */
import type { Promocion } from "@vuelto/motor";

/**
 * Por qué una promo vigente de MODO no se publica. Conjunto cerrado: la ingesta
 * descarta sola, sin cola de revisión (ADR-005), y deja el motivo en el registro
 * de la corrida.
 */
export const MOTIVOS_DESCARTE = [
  "banco_no_determinado",
  "nivel_de_cliente",
  "transversal",
  "no_es_reintegro",
  "tope_no_representable",
  "vencida_en_la_fuente",
  "detalle_inexistente",
  "formato_desconocido",
  "no_publicable",
  "otro",
] as const;

export type MotivoDescarte = (typeof MOTIVOS_DESCARTE)[number];

/** Una `Promocion` del motor sin `id` (se calcula de la clave natural) más su trazabilidad. */
export interface PromocionIngestada extends Omit<Promocion, "id"> {
  /** Clave natural en la tabla: slug de MODO, con sufijo `#…` si la promo se parte. */
  fuenteId: string;
  /** `{ ruta del campo en Promocion: de dónde sale | null }`. */
  fragmentosFuente: Record<string, string | null>;
}

/** Una promo vigente que la corrida no publica, con el motivo. */
export interface Descarte {
  slug: string;
  motivo: MotivoDescarte;
  detalle: string | null;
}

/** Un banco del catálogo de MODO (`GET /promos/api/rewards/banks`), lo que usa la ingesta. */
export interface BancoCatalogo {
  id: string;
  name: string;
}

/** Todas las promos de la ingesta son de MODO: `manual` queda para otra fuente, no para esta. */
export const FUENTE_INGESTA = "modo" as const satisfies Promocion["fuente"];
