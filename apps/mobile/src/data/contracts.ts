/**
 * Forma de las respuestas que la app espera del servidor (Edge Functions y tablas con RLS).
 *
 * Dos capas: (1) la respuesta de `recomendar()`, importada de `@vuelto/motor` (la app lo
 * corre en el dispositivo, ADR-010), y (2) los tipos de vista que pintan las pantallas, que
 * arma `vista-recomendacion.ts`.
 *
 * Es la vista del cliente: lo que se le muestra al usuario, nunca el input del motor
 * (ADR-008 §4). Todo campo es requerido; lo ausente es `null` explícito (Principio III).
 * Dinero: enteros en pesos. Fechas: ISO `YYYY-MM-DD`.
 * Documentación: specs/006-app-mobile-pantallas/data-model.md y
 * docs/architecture/02-api-routes.md.
 */

export type Rubro =
  | "supermercado"
  | "combustible"
  | "gastronomia"
  | "farmacia"
  | "indumentaria"
  | "hogar"
  /** Comercio fuera del catálogo: sin rubro conocido, no se estima reintegro. */
  | "otro";

export type Periodo = "mes" | "semana";

/** Base de un estimado (Principio V). El texto lo arma el servidor. */
export type Base =
  | { tipo: "compras"; cantidad: number; periodo: Periodo; texto: string }
  | { tipo: "sin-compras"; texto: string }
  | { tipo: "contacto"; texto: string };

/** Lo decide el motor (`formatearEstimacion`): `queda-poco` con ≤20% del tope (DESIGN.md §5). */
export type EstadoTope = "disponible" | "queda-poco" | "agotado" | "sin-base";

export type MedioDePago = {
  id: string;
  banco: string;
  nombre: string;
  /** "Galicia", para "Usar Galicia". */
  nombreCorto: string;
  /** "Crédito · Banco Galicia", "Billetera virtual". */
  detalle: string;
  inicial: string;
  /** `false`: medio sin promos en el corpus (Mercado Pago). Sin topes ni reintegros. */
  conCobertura: boolean;
};

export type Comercio = {
  id: string;
  nombre: string;
  inicial: string;
  rubro: Rubro;
  /** Id de categoría de MODO (`categorias` en Supabase). `null` fuera del catálogo. */
  categoriaId: number | null;
  frecuente: boolean;
};

// ─── Respuesta del motor ──────────────────────────────────────────────────────

export type {
  BaseEstimacion,
  Canal,
  CausaDescarte,
  Descarte,
  OpcionDePago,
  PromocionAplicada,
  Recomendacion as RespuestaRecomendar,
} from "@vuelto/motor";

/**
 * La compra que se evalúa, con el monto opcional (constitución §I). Hasta que #43 agregue
 * `monto: null` al motor, `calculo.ts` lo consulta como 0.
 */
export type PedidoRecomendar = {
  comercio: string | null;
  categoriaId: number;
  monto: number | null;
  canal: "presencial" | "online";
};

/** Promoción del catálogo (lectura con RLS), para nombrar lo que el motor devuelve por id. */
export type PromocionCatalogo = {
  id: string;
  titulo: string;
  bancoId: string;
  categoriaId: number;
};

// ─── Vista: lo que pintan las pantallas ───────────────────────────────────────

/** Otra opción de pago o una promo que no aplica, ya con nombre. */
export type Alternativa = {
  /** Medio del usuario al que corresponde, si se puede saber. */
  medioId: string | null;
  titulo: string;
  inicial: string;
  motivo: string;
  estado: "otra-opcion" | "no-aplica" | "agotado";
};

export type Recomendacion = {
  comercio: Comercio;
  /** "hoy miércoles" */
  dia: string;
  resultado: "recomendado" | "sin-promo";
  medio: MedioDePago | null;
  /** El `motivo` del motor. */
  razon: string | null;
  /** Tope disponible antes de la compra (estimado). Solo sin monto y con base. */
  topeDisponible: number | null;
  base: Base | null;
  /** Eco del monto pedido. */
  monto: number | null;
  /** Solo con monto. */
  reintegro: number | null;
  teSale: number | null;
  /** Solo con monto y con base. */
  topeDespues: { disponible: number } | null;
  alternativas: Alternativa[];
  /** Para `sin-promo`: la promo que aplica otro día ("Santander Mastercard crédito: la promo es los jueves"). */
  proximaPromo: string | null;
};

/** Qué saldo es, como lo agrupa el motor: el grupo si es compartido, la promo si es propio. */
export type ClaveTope = `grupo:${string}` | `promo:${string}`;

export type TopeMedio = {
  clave: ClaveTope;
  medio: MedioDePago;
  rubro: Rubro;
  /** "20% en supermercados · miércoles" */
  promo: string;
  nominal: number;
  periodo: Periodo;
  disponible: number | null;
  /** Cifra del motor, redondeada hacia abajo a la centena ("≈$6.500", "menos de $100"); `null` sin compras o agotado. */
  cifra: string | null;
  estado: EstadoTope;
  base: Base;
  /** "vuelve el 1/11", "se reinicia el lunes" */
  reinicio: string;
  /** Consejo del día con datos del usuario; uno por pantalla como máximo. */
  consejo: string | null;
  /** Títulos de las promos vigentes que descuentan de este tope (las vencidas de un grupo no figuran). */
  promociones: string[];
  /** Las compras que lo consumieron, tal como las contó el motor (issue #45). */
  compraIds: string[];
};

export type ResumenTopes = {
  mes: string;
  devolvieron: { monto: number; base: Base };
  mediosConTope: number;
  reinicioMensualEnDias: number;
  medios: TopeMedio[];
};

/** Alineado con docs/architecture/01-data-models.md (`excepción` = acepta una recomendación). */
export type OrigenCompra = "ticket" | "excepcion" | "manual";

export type Compra = {
  id: string;
  comercio: Comercio;
  fecha: string;
  monto: number;
  medio: MedioDePago;
  reintegro: number | null;
  origen: OrigenCompra;
  /** Texto que el extractor leyó del ticket (se guarda; la imagen no). `null` si no hubo ticket. */
  textoExtraido: string | null;
};

/** «Compras de un tope» (issue #45): el tope, con su base, y las compras que lo consumieron. */
export type ComprasDeTope = {
  tope: TopeMedio;
  compras: Compra[];
  /** Las que el motor contó pero no se pueden mostrar (medio fuera del catálogo): la base las incluye. */
  sinMostrar: number;
};

export type ResumenCompras = {
  mes: string;
  /** Total gastado en el mes (lo suma el servidor). */
  gastaste: number;
  devolvieron: { monto: number; base: Base };
  compras: Compra[];
};

/** Lectura del ticket. Nunca contiene la imagen (Principio IV). */
export type LecturaTicket =
  | {
      ok: true;
      comercio: string | null;
      fecha: string | null;
      monto: number | null;
      /** `null` si el ticket no lo dice: se pregunta, nunca se infiere (RF-10). */
      medio: MedioDePago | null;
      textoExtraido: string;
    }
  | { ok: false; error: string };

export type BorradorCompra = {
  modo: OrigenCompra;
  comercio: string | null;
  fecha: string;
  monto: number | null;
  medioId: string | null;
  textoExtraido: string | null;
  /** `false` = el usuario quitó la promo propuesta (spec 010, FR-024). Por defecto, `true`. */
  usarPromo: boolean;
};

/** Contacto vinculado: solo lo que ADR-008 §3 deja ver. Sin topes, compras ni medios. */
export type Contacto = {
  id: string;
  nombre: string;
  iniciales: string;
  /** Fecha del vínculo (dato de la relación, no del contacto). */
  vinculadoDesde: string;
};

export type Invitacion = {
  link: string;
  venceEn: string;
  usoUnico: true;
};

export type EstadoInvitacion = "valida" | "vencida" | "usada" | "propia" | "ya-contacto";

export type VistaInvitacion = {
  estado: EstadoInvitacion;
  quienInvita: string | null;
  comparte: string[];
  noComparte: string[];
  sePuedeDeducir: string;
};

export type IntegranteGrupo =
  { tipo: "vos" } | { tipo: "contacto"; contactoId: string } | { tipo: "sin-cuenta"; nombre: string };

export type FilaIntegrante = {
  nombre: string;
  /** `null` para "Vos" (avatar sin inicial, auditoría P2 #11). */
  iniciales: string | null;
  esVos: boolean;
  /** Texto armado por el servidor. Nunca nombra medios no recomendados de un contacto. */
  detalle: string;
};

export type PedidoGrupo = {
  nombre: string | null;
  comercioId: string;
  monto: number;
  /** Día de la compra (ISO). La cena del ejemplo es el sábado 17/10. */
  fecha: string;
  integrantes: IntegranteGrupo[];
};

export type RecomendacionGrupo = {
  nombre: string | null;
  comercio: Comercio;
  /** "sábado 17/10" u "hoy miércoles" */
  cuando: string;
  monto: number;
  /** `null` si nadie del grupo tiene promo para esta compra. */
  quienPaga: { nombre: string; esVos: boolean } | null;
  /** Solo el medio de quien paga: "su Provincia Visa débito". */
  medio: string | null;
  razon: string | null;
  reintegro: number | null;
  base: Base | null;
  partePorPersona: number;
  integrantes: FilaIntegrante[];
};

export type Perfil = {
  nombre: string;
  medios: MedioDePago[];
  comercios: Comercio[];
};
