/**
 * Contrato de la sincronización (spec 009): las filas tal como las devuelve Postgres y la interfaz
 * del repositorio que las lee. Todo es dato plano; lo ausente es `null`, sin campos opcionales.
 */

/** Una fila de `public.promociones` (columnas de `supabase/migrations/…06_promociones.sql`). */
export interface FilaPromocion {
  id: string;
  fuente: string;
  titulo: string;
  banco_id: string;
  categoria_id: number;
  comercio: string | null;
  /** `numeric` llega como texto o número según PostgREST. */
  porcentaje: number | string;
  debito_redes: string[];
  credito_redes: string[];
  vigencia_desde: string;
  vigencia_hasta: string;
  dias: string[] | null;
  tope_monto: number | string | null;
  tope_periodo: string | null;
  tope_alcance: string | null;
  grupo_tope_id: string | null;
  monto_minimo: number | string | null;
  jurisdiccion: string | null;
  canal: string | null;
  acumulable: boolean | null;
  dada_de_baja_en: string | null;
  /** Texto exacto que devuelve PostgREST: es la marca y el cursor, nunca pasa por `Date`. */
  actualizada_en: string;
}

/** Una fila de `public.compras` (columnas de `supabase/migrations/…07_compras.sql`). */
export interface FilaCompra {
  id: string;
  fecha: string;
  monto: number | string;
  comercio: string;
  categoria_id: number | null;
  /** UUID de `medios_de_pago`; se traduce al medio de la app cuando #41 los sincronice. */
  medio_de_pago_id: string;
  promocion_id: string | null;
  descuento_obtenido: number | string | null;
  reintegro_esperado: number | string | null;
  fecha_acreditacion_estimada: string | null;
  origen: string;
  texto_extraido: string | null;
  /** Orden y cursor de la paginación de compras. */
  creada_en: string;
}

/** Dónde quedó la última página: el valor de la columna de orden (texto exacto) y el `id`. */
export type Cursor = { valor: string; id: string } | null;

export interface FiltroPromociones {
  /** Incremental: piso de `actualizada_en` (ya con el margen). `null` en la primera sincronización. */
  desde: string | null;
  /** Primera sincronización: `vigencia_hasta >= vigenteDesde`. `null` en las incrementales. */
  vigenteDesde: string | null;
  cursor: Cursor;
  limite: number;
  signal: AbortSignal;
}

export interface FiltroCompras {
  /** `fecha >= desde` (inicio del período). */
  desde: string;
  cursor: Cursor;
  limite: number;
  signal: AbortSignal;
}

/**
 * Lo que la sincronización necesita del servidor. La implementación real usa `supabase-js` con la
 * sesión del usuario (nunca la service role); la de memoria sirve a los tests (ADR-009).
 * Un error se propaga como excepción: nunca devuelve resultados parciales.
 */
export interface RepositorioSincronizacion {
  /** `auth.uid()` de la sesión, o `null` si no hay. */
  usuarioId(): Promise<string | null>;
  /** Hasta `limite` promos ordenadas por `(actualizada_en, id)` posteriores al cursor. Excluye `otra_provincia`. */
  promociones(f: FiltroPromociones): Promise<FilaPromocion[]>;
  /** Todos los ids de las promos con `vigencia_hasta >= vigenteDesde` (excluye `otra_provincia`). */
  idsDePromociones(vigenteDesde: string, signal: AbortSignal): Promise<string[]>;
  /** Hasta `limite` compras del usuario con `fecha >= desde`, ordenadas por `(creada_en, id)`. */
  compras(f: FiltroCompras): Promise<FilaCompra[]>;
}
