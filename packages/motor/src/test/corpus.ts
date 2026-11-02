/**
 * GENERADO por `npm run corpus:generar -w ingesta` desde supabase/seed/promociones.json. No editar a mano.
 * Promos reales del corpus (las marcadas con `fixture: true`) para los tests del motor.
 * Foto fechada: no depende de `ingesta/` ni de `supabase/`. No se compila a `dist/`.
 */
import type { Promocion } from "../tipos.ts";

/** El «ahora» fijo de los tests con fixtures reales: las promos vencen, los tests no. */
export const AHORA_CORPUS = new Date("2026-11-04T15:00:00Z");

export const PROMOS_CORPUS: Promocion[] = [];
