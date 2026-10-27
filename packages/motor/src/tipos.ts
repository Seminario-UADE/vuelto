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
/**
 * `otra_provincia` = vale solo en una provincia fuera del alcance del MVP
 * (CABA y AMBA), por ejemplo Córdoba. El motor la descarta.
 */
export type Jurisdiccion = "nacional" | "pba" | "caba" | "otra_provincia";
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

/** Los períodos que acumulan consumo: "por compra" no acumula. */
export type PeriodoAcumulable = Exclude<Tope["periodo"], "por_compra" | null>;

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

/**
 * En qué se apoya un tope estimado (constitución §V): "≈$3.000, según 4
 * compras registradas". Forma propuesta en la issue #38, que la reutiliza.
 */
export interface BaseEstimacion {
  /** Compras con la promo en el período, hasta la fecha de la consulta. */
  comprasRegistradas: number;
  /** De esas, cuántas no informan `descuentoObtenido` (consumo calculado). */
  comprasSinDescuentoInformado: number;
}

/** Una promo dentro de una opción de pago (issue #37). */
export interface PromocionAplicada {
  promocionId: string;
  /** Puede ser 0 si otra promo de la misma opción agotó el tope compartido. */
  ahorroEstimado: number;
  /**
   * Siempre es un estimado, sostenido por `base`. `null` = la promo no
   * informa tope o su tope es por compra.
   */
  topeRestanteTrasCompra: number | null;
  /** `null` en los mismos casos que `topeRestanteTrasCompra`. */
  base: BaseEstimacion | null;
}

export interface OpcionDePago {
  medioDePagoId: string;
  /** Suma del ahorro de `promociones`. */
  ahorroEstimado: number;
  /** Una, o varias si son acumulables entre sí. */
  promociones: PromocionAplicada[];
  /** Texto determinístico por plantilla, nunca de un LLM (ADR-004). */
  motivo: string;
}

/** Una por regla de elegibilidad, en el orden en que se evalúan. */
export type CausaDescarte =
  | "categoria"
  | "comercio"
  | "vigencia"
  | "dia"
  | "canal"
  | "jurisdiccion"
  | "monto_minimo"
  | "medio_de_pago"
  | "tope_agotado";

/** Promo que no aplica a la compra, con el motivo para mostrarle al usuario. */
export interface Descarte {
  promocionId: string;
  causa: CausaDescarte;
  /**
   * Medios del usuario a los que aplicaba la promo, para el "¿por qué no X?"
   * de la pantalla (issue #46). Vacía si no aplicaba a ninguno, sea cual
   * sea la causa (por ejemplo, una promo de otro banco que además es de otro día).
   */
  mediosDePagoIds: string[];
  /** Solo con causa `tope_agotado`: un tope agotado también es un estimado. */
  base: BaseEstimacion | null;
  motivo: string;
}

export interface Recomendacion {
  mejor: OpcionDePago | null;
  alternativas: OpcionDePago[];
  descartadas: Descarte[];
}

/** Cuánto le queda al usuario de un tope que se va gastando (issue #38). */
export interface EstimacionTope {
  /** `null` si el saldo es propio de una promo. */
  grupoTopeId: string | null;
  /** `null` si las promos vigentes del saldo son de bancos distintos. */
  bancoId: BancoId | null;
  /** Promos vigentes del saldo. */
  promocionIds: string[];
  /** Medios del usuario que sirven para alguna de ellas; vacía si no se pasó perfil. */
  mediosDePagoIds: string[];
  /** En pesos. Siempre estimados, sostenidos por `base`. */
  tope: number;
  consumido: number;
  restante: number;
  base: BaseEstimacion;
  periodo: { tipo: PeriodoAcumulable; desde: FechaISO; hasta: FechaISO };
}

export type EstadoTope = "disponible" | "queda_poco" | "agotado" | "sin_compras";

/** Textos de una estimación, por plantilla (DESIGN.md §5). Las etiquetas las pone cada pantalla. */
export interface TextoEstimacion {
  estado: EstadoTope;
  /** "≈$6.500", "menos de $100", o `null` si está agotado o no hay compras. */
  cifra: string | null;
  /** "según 3 compras de octubre", con " · vuelve el 1/11" si está agotado, o el texto sin compras. */
  base: string;
}
