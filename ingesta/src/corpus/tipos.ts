/**
 * Formato del corpus de promociones sembrado a mano (issue #35,
 * `specs/011-corpus-promociones-seed/data-model.md`).
 *
 * Regla (constitución §III): un dato ausente es `null` explícito, nunca un
 * campo opcional. En este archivo no hay ningún `?:`.
 */
import type { Promocion } from "@vuelto/motor";

/** Por qué una promo candidata no entra al corpus. Conjunto cerrado (research D10). */
export const MOTIVOS_EXCLUSION = [
  "fuera_de_zona",
  "comercio_no_determinado",
  "banco_no_determinado",
  "nivel_de_cliente",
  "transversal",
  "no_es_reintegro",
  "tope_no_representable",
  "vencida_en_la_fuente",
  "detalle_inexistente",
  "otro",
] as const;

export type MotivoExclusion = (typeof MOTIVOS_EXCLUSION)[number];

/**
 * Quién y cuándo verificó la promo contra la fuente. Vive solo en el JSON
 * versionado: no es una columna de la base, así no se sincroniza al celular
 * de todos los usuarios (hallazgo A9 de la crítica).
 */
export interface Revision {
  /** Fecha calendario ISO `YYYY-MM-DD`. */
  verificadaEl: string;
  revisor: string;
  notas: string[];
}

/** Una `Promocion` del motor sin `id` (se calcula) más la trazabilidad. */
export interface EntradaCorpus extends Omit<Promocion, "id"> {
  /** Clave natural en la tabla: slug de MODO, con sufijo `#…` si la promo se parte. */
  fuenteId: string;
  /** `{ ruta del campo en Promocion: fragmento de la letra chica | null }`. */
  fragmentosFuente: Record<string, string | null>;
  /** `true` = el generador la copia a los datos de prueba del motor. */
  fixture: boolean;
  revision: Revision;
}

export interface ArchivoCorpus {
  version: 1;
  promociones: EntradaCorpus[];
}

/** Promo candidata que se dejó afuera, con el motivo. */
export interface Exclusion {
  slug: string;
  motivo: MotivoExclusion;
  /** Obligatorio si el motivo es `otro`. */
  detalle: string | null;
  verificadaEl: string;
  revisor: string;
}

/** Saldo de tope que comparten varias promos (research D5). */
export interface GrupoTope {
  /** Nombre del banco en kebab: `macro`, `supervielle`. */
  banco: string;
  clave: string;
  /** Frase de la letra chica que sostiene el grupo. */
  fragmento: string;
  creadoPor: string;
}

/** Clave = `grupoTopeId` (`<banco>:<clave>`). */
export type GruposTope = Record<string, GrupoTope>;

/** Un banco del catálogo de MODO (`GET /promos/api/rewards/banks`), lo que usa el corpus. */
export interface BancoCatalogo {
  id: string;
  name: string;
}

/** Todo lo que lee `corpus:generar` y `corpus:cargar`: el corpus, sus registros y el catálogo de bancos. */
export interface Insumos {
  archivo: ArchivoCorpus;
  exclusiones: Exclusion[];
  gruposTope: GruposTope;
  bancos: BancoCatalogo[];
}

/** La fuente de las promos sembradas a mano (decisión 1 de la spec): una persona las revisa. */
export const FUENTE_CORPUS = "manual" as const satisfies Promocion["fuente"];

/** Las claves de `EntradaCorpus` que tienen que estar siempre presentes. */
export const CLAVES_ENTRADA = [
  "fuenteId",
  "fuente",
  "titulo",
  "bancoId",
  "categoriaId",
  "comercio",
  "porcentaje",
  "tarjetas",
  "vigencia",
  "tope",
  "montoMinimo",
  "jurisdiccion",
  "canal",
  "acumulable",
  "fragmentosFuente",
  "fixture",
  "revision",
] as const satisfies readonly (keyof EntradaCorpus)[];
