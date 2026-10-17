/**
 * Forma de las respuestas que la app espera del servidor (Edge Functions y tablas con RLS).
 *
 * Es la vista del cliente: lo que se le muestra al usuario, nunca el input del motor
 * (ADR-008 §4). Todo campo es requerido; lo ausente es `null` explícito (Principio III).
 * Dinero: enteros en pesos. Fechas: ISO `YYYY-MM-DD`.
 * Documentación: specs/002-app-mobile-pantallas/data-model.md y
 * docs/architecture/02-api-routes.md.
 */

export type Rubro =
  | "supermercado"
  | "combustible"
  | "gastronomia"
  | "farmacia"
  | "indumentaria"
  | "hogar";

export type Periodo = "mes" | "semana";

/** Base de un estimado (Principio V). El texto lo arma el servidor. */
export type Base =
  | { tipo: "compras"; cantidad: number; periodo: Periodo; texto: string }
  | { tipo: "sin-compras"; texto: string }
  | { tipo: "contacto"; texto: string };

/** Lo decide el servidor: `queda-poco` con ≤30% del tope nominal (spec 002 FR-022). */
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
  frecuente: boolean;
};

export type Alternativa = {
  medio: MedioDePago;
  motivo: string;
  estado: "no-aplica" | "agotado" | "sin-promo";
};

export type Recomendacion = {
  comercio: Comercio;
  /** "hoy miércoles" */
  dia: string;
  resultado: "recomendado" | "sin-promo";
  medio: MedioDePago | null;
  razon: string | null;
  porcentaje: number | null;
  /** Tope disponible antes de la compra (estimado). */
  topeDisponible: number | null;
  base: Base | null;
  /** Eco del monto pedido. */
  monto: number | null;
  /** Solo con monto. */
  reintegro: number | null;
  teSale: number | null;
  topeDespues: { disponible: number; estado: EstadoTope } | null;
  alternativas: Alternativa[];
  /** Para `sin-promo`: cuándo sí hay ("Santander Mastercard: 15% los jueves"). */
  proximaPromo: string | null;
};

export type TopeMedio = {
  medio: MedioDePago;
  rubro: Rubro;
  /** "20% en supermercados · miércoles" */
  promo: string;
  nominal: number;
  periodo: Periodo;
  disponible: number | null;
  estado: EstadoTope;
  base: Base;
  /** "vuelve el 1/11", "se reinicia el lunes" */
  reinicio: string;
  /** Consejo del día con datos del usuario; uno por pantalla como máximo. */
  consejo: string | null;
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
};

export type ResumenCompras = {
  mes: string;
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
  | { tipo: "vos" }
  | { tipo: "contacto"; contactoId: string }
  | { tipo: "sin-cuenta"; nombre: string };

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
