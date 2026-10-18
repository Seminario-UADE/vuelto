/**
 * Contrato de tipos del dominio (issue #33). Lo comparten el motor, las
 * tablas de Supabase, el esquema del extractor y la Edge Function.
 *
 * Regla (constitución §III): un dato ausente es `null` explícito, nunca un
 * campo opcional. En este archivo no hay ningún `?:`.
 *
 * Son datos planos, no clases: viajan como JSON entre Postgres, la Edge
 * Function y la app (ADR-009).
 */

/** Fecha calendario ISO `YYYY-MM-DD`, en hora de Argentina. */
export type FechaISO = string;

/**
 * Id del banco en el catálogo de MODO (`GET /promos/api/rewards/banks`):
 * un UUID string, no el nombre ni el `bcra_code`. Las promos de MODO solo
 * traen el nombre (`name_bank`); la ingesta lo traduce a este id comparando
 * normalizado (minúsculas, sin acentos, sin espacios de más). Si no matchea,
 * queda `null` y el borrador no se publica.
 */
export type BancoId = string;

/** Id numérico de categoría de MODO. Catálogo en la tabla `categorias`. */
export type CategoriaId = number;

export type Dia = "lun" | "mar" | "mie" | "jue" | "vie" | "sab" | "dom";

/**
 * Marca de la tarjeta, con los valores tal cual los usa MODO en
 * `debit_list` / `credit_list` (incluida la ortografía `dinners_club`).
 * Ver `specs/001-perfil-billeteras/spec.md`.
 */
export type Red =
  | "visa"
  | "master"
  | "american_express"
  | "dinners_club"
  | "maestro"
  | "cabal"
  | "naranja"
  | "confiable"
  | "tarjeta_sol";

export type TipoTarjeta = "debito" | "credito";
export type Jurisdiccion = "nacional" | "pba" | "caba";
/** Canal de una compra concreta. */
export type Canal = "presencial" | "online";
/** Canal en que vale una promo. */
export type CanalPromo = Canal | "ambos";

export interface MedioDePago {
  id: string;
  bancoId: BancoId;
  tipo: TipoTarjeta;
  red: Red;
}

export interface Perfil {
  /** Lo elige el usuario, nunca es el email (ADR-008). `null` si todavía no lo eligió. */
  nombreParaMostrar: string | null;
  mediosDePago: MedioDePago[];
  comerciosHabituales: string[];
}

export interface Tope {
  /** En pesos. `null` = la promo no lo informa. */
  monto: number | null;
  periodo: "mensual" | "semanal" | "por_compra" | null;
  alcance: "compartido" | "exclusivo" | null;
  /** Las promos con el mismo id descuentan de un único saldo. */
  grupoTopeId: string | null;
}

/** Redes aceptadas por tipo de tarjeta. Lista vacía = ese tipo no participa. */
export interface TarjetasAceptadas {
  debito: Red[];
  credito: Red[];
}

export interface Vigencia {
  desde: FechaISO;
  hasta: FechaISO;
  /** `null` = todos los días. */
  dias: Dia[] | null;
}

export interface Promocion {
  id: string;
  fuente: "modo" | "manual";
  titulo: string;
  bancoId: BancoId;
  categoriaId: CategoriaId;
  /** `null` = aplica a toda la categoría. */
  comercio: string | null;
  /** Entre 0 y 100. */
  porcentaje: number;
  tarjetas: TarjetasAceptadas;
  vigencia: Vigencia;
  tope: Tope;
  montoMinimo: number | null;
  jurisdiccion: Jurisdiccion | null;
  canal: CanalPromo | null;
  /** `null` se trata como no acumulable (RF-04). */
  acumulable: boolean | null;
}

/**
 * Lo que produce la ingesta antes de validar: la misma forma que `Promocion`,
 * pero los campos obligatorios para publicar pueden venir `null`.
 * `esPromocionPublicable` es la única forma de convertirlo en `Promocion`.
 *
 * El fragmento de letra chica del que sale cada campo (constitución §III)
 * no viaja en este tipo: lo define el esquema del extractor (issue #51) y
 * se guarda junto a la promo en Postgres (`jsonb`, issue #34).
 */
export interface BorradorPromocion
  extends Omit<Promocion, "bancoId" | "categoriaId" | "porcentaje" | "tarjetas" | "vigencia"> {
  bancoId: BancoId | null;
  categoriaId: CategoriaId | null;
  porcentaje: number | null;
  tarjetas: TarjetasAceptadas | null;
  vigencia: { desde: FechaISO | null; hasta: FechaISO | null; dias: Dia[] | null };
}

export type OrigenCompra = "ticket" | "excepcion" | "manual";

export interface Compra {
  id: string;
  fecha: FechaISO;
  monto: number;
  comercio: string;
  categoriaId: CategoriaId | null;
  medioDePagoId: string;
  promocionId: string | null;
  descuentoObtenido: number | null;
  /** No se usa en el MVP; habilita seguimiento futuro sin migración. */
  reintegroEsperado: number | null;
  fechaAcreditacionEstimada: FechaISO | null;
  origen: OrigenCompra;
  /** Texto del ticket; la imagen nunca se guarda. */
  textoExtraido: string | null;
}

/** La compra que el usuario está por hacer: la entrada de `recomendar()`. */
export interface CompraPropuesta {
  comercio: string | null;
  categoriaId: CategoriaId;
  monto: number;
  canal: Canal;
}

export interface OpcionDePago {
  medioDePagoId: string;
  promocionId: string | null;
  ahorroEstimado: number;
  /**
   * Siempre es un estimado. Su base (cuántas compras lo sostienen) la suma
   * la issue #36, reusando la forma de `EstimacionTope.base` de la issue #38.
   */
  topeRestanteTrasCompra: number | null;
  /** Texto determinístico por plantilla, nunca de un LLM (ADR-004). */
  motivo: string;
}

/** Promo que no aplica a la compra, con el motivo para mostrarle al usuario. */
export interface Descarte {
  promocionId: string;
  motivo: string;
}

export interface Recomendacion {
  mejor: OpcionDePago | null;
  alternativas: OpcionDePago[];
  descartadas: Descarte[];
}
