import type { Canal } from "@vuelto/motor";
import type { ResultadoLectura } from "../ticket/resultados";
import type { MedioLeido } from "../ticket/sugerencia";
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

/** Lo decide el motor (`formatearEstimacion`): `queda-poco` con ≤30% del tope (DESIGN.md §5). */
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

/** La compra que se evalúa, con el monto opcional (constitución §I, issue #75). */
export type PedidoRecomendar = {
  comercio: string | null;
  categoriaId: number;
  monto: number | null;
  canal: "presencial" | "online";
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
  /** Hoy aplica alguna de sus promos (día de la semana y vigencia): lo que muestra Inicio (v9). */
  aplicaHoy: boolean;
};

/**
 * Cuánto tope te queda, sumando los topes que ya tienen compras este mes (Inicio, v9, issue
 * #149): el gráfico de torta. Estimado como cada tope, con su base (Principio V). `topes` en 0:
 * todavía no usaste ninguno, y no hay suma para mostrar.
 */
export type UsoDeTopes = {
  nominal: number;
  disponible: number;
  /** De 0 a 1: la parte del tope total que todavía queda. */
  queda: number;
  topes: number;
  /** "según 4 compras de octubre" o, sin compras, "Todavía no usaste ningún tope este mes". */
  base: string;
  /**
   * Un tramo por tope usado, en el orden de `medios` (Inicio v10): el anillo segmentado dibuja lo
   * que queda de cada uno, así se ve cuál se está agotando.
   */
  tramos: TramoDeUso[];
};

export type TramoDeUso = {
  clave: ClaveTope;
  /** Nombre del medio, para la leyenda. */
  nombre: string;
  disponible: number;
  nominal: number;
  estado: EstadoTope;
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
};

export type ResumenCompras = {
  mes: string;
  /** Total gastado en el mes (lo suma el servidor). */
  gastaste: number;
  /** Cuántas compras hay en el mes en curso (las de `gastaste`). */
  cantidadDelMes: number;
  /** Lo gastado en el mes por tramos de 7 días (1–7, 8–14…), para el gráfico de Compras (v7). */
  semanas: GastoSemana[];
  devolvieron: { monto: number; base: Base };
  compras: Compra[];
};

export type GastoSemana = {
  /** "1–7" */
  etiqueta: string;
  monto: number;
  /** El tramo de hoy. */
  actual: boolean;
  /** Un tramo que todavía no empezó. */
  futuro: boolean;
};

/**
 * Lectura del ticket (spec 014, data-model). Nunca contiene la imagen (Principio IV). El medio es
 * lo que dice el ticket, no una tarjeta del perfil: «Revisá» lo cruza con el perfil y lo sugiere,
 * nunca lo marca (RF-10).
 */
export type LecturaApp =
  | {
      ok: true;
      comercio: string | null;
      fecha: string | null;
      monto: number | null;
      medio: MedioLeido;
      textoExtraido: string;
    }
  | { ok: false; resultado: ResultadoLectura };

export type BorradorCompra = {
  modo: OrigenCompra;
  comercio: string | null;
  fecha: string;
  monto: number | null;
  medioId: string | null;
  textoExtraido: string | null;
  /** `false` = el usuario quitó la promo propuesta (spec 010, FR-024). Por defecto, `true`. */
  usarPromo: boolean;
  /** El canal con el que se recomendó (#43); sin él, presencial. */
  canal?: Canal;
  /** El rubro con el que se recomendó: desambigua un comercio que está en dos rubros (#43). */
  categoriaId?: number | null;
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
  /** `vuelto://i/<token>` (en Expo Go, el link que da Expo). El QR codifica este mismo link. */
  link: string;
  /** ISO: cuándo vence (24 h desde que se creó). */
  venceEn: string;
  usoUnico: true;
};

export type EstadoInvitacion = "valida" | "vencida" | "usada" | "propia" | "ya-contacto" | "inexistente" | "sin-nombre";

export type VistaInvitacion = {
  estado: EstadoInvitacion;
  /** `null` si la invitación no existe. */
  quienInvita: string | null;
  /** ISO, solo si es válida. */
  venceEn: string | null;
  comparte: string[];
  noComparte: string[];
  sePuedeDeducir: string;
};

/** Alguien sin cuenta en el grupo: su nombre vive solo en el teléfono (D5); al servidor va la cantidad. */
export type SinCuentaEnGrupo = { posicion: number; nombre: string };

/** El grupo que arma Armar (spec 016). Sin fecha: la compra es de hoy, según el servidor (FR-025). */
export type PedidoGrupo = {
  /** Resuelto en el paso de compra, siempre con rubro (FR-029). */
  comercio: Comercio & { categoriaId: number };
  canal: Canal;
  monto: number;
  /** Ids de los contactos vinculados marcados. */
  contactos: string[];
  sinCuenta: SinCuentaEnGrupo[];
};

export type FilaIntegrante = {
  /** `vos`, el id del contacto o `sin-<posición>`: las filas no se identifican por el nombre (US3-7). */
  clave: string;
  nombre: string;
  /** `null` para "Vos" (avatar sin inicial, auditoría P2 #11). */
  iniciales: string | null;
  esVos: boolean;
  /** Nunca nombra medios no recomendados de un contacto ni dice nada de su tope (FR-021). */
  detalle: string;
  /** Cuánto pone, en pesos enteros (FR-006). */
  pone: number;
};

/** Lo que muestra Gasto en grupo, armado en el teléfono con la respuesta del servidor (`grupo/vista.ts`). */
export type RecomendacionGrupo = {
  titulo: string;
  comercio: Comercio;
  /** "hoy sábado" o, si el servidor evaluó otro día, "domingo 16/11" (US3-8). */
  cuando: string;
  monto: number;
  /** `null` si nadie del grupo tiene reintegro en esta compra. */
  quienPaga: { clave: string; nombre: string; esVos: boolean; iniciales: string | null } | null;
  /** Solo el medio de quien paga: "su Galicia Visa crédito" o "tu Provincia Visa débito". */
  medio: string | null;
  /**
   * El id del medio **propio** con el que pagás, solo si quien paga sos vos: es lo que necesita la
   * compra por confirmar (#138). `null` si paga un contacto (su medio no tiene id para la app) o si
   * nadie paga.
   */
  medioPropioId: string | null;
  /** Qué da la promo, sin nada del tope: "20% en gastronomía". */
  razon: string | null;
  reintegro: number | null;
  /** La base en palabras (constitución §V). */
  base: string | null;
  /**
   * Un aviso cuando nadie más que «Vos» tiene datos (solo gente sin cuenta): la decisión salió
   * únicamente de tus medios y la pantalla lo dice. `null` si hay algún contacto vinculado (#139).
   */
  aviso: string | null;
  integrantes: FilaIntegrante[];
};

export type Perfil = {
  nombre: string;
  medios: MedioDePago[];
  comercios: Comercio[];
};
