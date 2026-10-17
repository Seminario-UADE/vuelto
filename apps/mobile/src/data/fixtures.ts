/**
 * Datos de ejemplo de docs/design/DESIGN.md §9 (Martín, octubre de 2026).
 *
 * Hacen de "base de datos" del servidor mientras no existen las Edge Functions.
 * Solo los leen `servidor-simulado.ts` y `api.ts`; las pantallas nunca importan
 * este archivo.
 */
import type { Comercio, Compra, Contacto, MedioDePago, Periodo, Rubro } from "./contracts";

/** Reloj fijo del mock: miércoles 14 de octubre de 2026 (FR-038). */
export const HOY = "2026-10-14";
export const DIA_HOY = 3; // 0 = domingo … 3 = miércoles
export const MES = "octubre";
export const REINICIO_MENSUAL = "1/11";
export const DIAS_PARA_REINICIO = 18;

export const medios = {
  galicia: {
    id: "galicia-visa-credito",
    banco: "Galicia",
    nombre: "Galicia Visa crédito",
    nombreCorto: "Galicia",
    inicial: "G",
    conCobertura: true,
  },
  santander: {
    id: "santander-mastercard-credito",
    banco: "Santander",
    nombre: "Santander Mastercard crédito",
    nombreCorto: "Santander",
    inicial: "S",
    conCobertura: true,
  },
  provincia: {
    id: "provincia-visa-debito",
    banco: "Provincia",
    nombre: "Provincia Visa débito",
    nombreCorto: "Provincia",
    inicial: "P",
    conCobertura: true,
  },
  macro: {
    id: "macro-visa-debito",
    banco: "Macro",
    nombre: "Macro Visa débito",
    nombreCorto: "Macro",
    inicial: "M",
    conCobertura: true,
  },
  bbva: {
    id: "bbva-visa-credito",
    banco: "BBVA",
    nombre: "BBVA Visa crédito",
    nombreCorto: "BBVA",
    inicial: "B",
    conCobertura: true,
  },
  mercadoPago: {
    id: "mercado-pago",
    banco: "Mercado Pago",
    nombre: "Mercado Pago",
    nombreCorto: "Mercado Pago",
    inicial: "M",
    conCobertura: false,
  },
} satisfies Record<string, MedioDePago>;

/** Catálogo que se ofrece en el onboarding. */
export const catalogoMedios: MedioDePago[] = [
  medios.galicia,
  medios.santander,
  medios.provincia,
  medios.macro,
  medios.bbva,
  medios.mercadoPago,
];

/** Medios que declaró Martín. */
export const mediosDeclarados: MedioDePago[] = [
  medios.galicia,
  medios.santander,
  medios.provincia,
  medios.macro,
];

const comercio = (id: string, nombre: string, rubro: Rubro, frecuente: boolean): Comercio => ({
  id,
  nombre,
  inicial: nombre.charAt(0),
  rubro,
  frecuente,
});

export const comercios = {
  coto: comercio("coto", "Coto", "supermercado", true),
  jumbo: comercio("jumbo", "Jumbo", "supermercado", true),
  farmacity: comercio("farmacity", "Farmacity", "farmacia", true),
  ypf: comercio("ypf", "YPF", "combustible", true),
  carrefour: comercio("carrefour", "Carrefour", "supermercado", true),
  dia: comercio("dia", "Día", "supermercado", false),
  shell: comercio("shell", "Shell", "combustible", false),
  disco: comercio("disco", "Disco", "supermercado", false),
  laParolaccia: comercio("la-parolaccia", "La Parolaccia", "gastronomia", false),
  cafeMartinez: comercio("cafe-martinez", "Café Martínez", "gastronomia", false),
  farmaplus: comercio("farmaplus", "Farmaplus", "farmacia", false),
  easy: comercio("easy", "Easy", "hogar", false),
} satisfies Record<string, Comercio>;

export const catalogoComercios: Comercio[] = Object.values(comercios);

export const nombreRubro: Record<Rubro, string> = {
  supermercado: "supermercados",
  combustible: "combustibles",
  gastronomia: "gastronomía",
  farmacia: "farmacias",
  indumentaria: "indumentaria",
  hogar: "hogar",
};

/** Promo vigente de cada medio declarado (corpus de MODO simplificado). */
export type PromoFixture = {
  medioId: string;
  rubro: Rubro;
  porcentaje: number;
  /** Días de la semana en que aplica (0 = domingo). `null` = todos los días. */
  dias: number[] | null;
  diasTexto: string;
  nominal: number;
  periodo: Periodo;
  /** Tope consumido según las compras registradas; `null` si no hay compras en el periodo. */
  consumido: number | null;
  comprasEnPeriodo: number;
  reinicio: string;
};

export const promos: PromoFixture[] = [
  {
    medioId: medios.galicia.id,
    rubro: "supermercado",
    porcentaje: 20,
    dias: [3],
    diasTexto: "los miércoles",
    nominal: 10000,
    periodo: "mes",
    consumido: 3500,
    comprasEnPeriodo: 3,
    reinicio: `se reinicia el ${REINICIO_MENSUAL}`,
  },
  {
    medioId: medios.santander.id,
    rubro: "combustible",
    porcentaje: 15,
    dias: [4],
    diasTexto: "los jueves",
    nominal: 8000,
    periodo: "mes",
    consumido: 5700,
    comprasEnPeriodo: 4,
    reinicio: `se reinicia el ${REINICIO_MENSUAL}`,
  },
  {
    medioId: medios.provincia.id,
    rubro: "gastronomia",
    porcentaje: 25,
    dias: [6],
    diasTexto: "los sábados",
    nominal: 5000,
    periodo: "semana",
    consumido: null,
    comprasEnPeriodo: 0,
    reinicio: "se reinicia el lunes",
  },
  {
    medioId: medios.macro.id,
    rubro: "farmacia",
    porcentaje: 15,
    dias: null,
    diasTexto: "todos los días",
    nominal: 6000,
    periodo: "mes",
    consumido: 6000,
    comprasEnPeriodo: 2,
    reinicio: `vuelve el ${REINICIO_MENSUAL}`,
  },
];

/** Consejo del día, armado con datos del usuario (DESIGN.md §5). Uno solo. */
export const consejos: Record<string, string> = {
  [medios.galicia.id]: "Hoy es miércoles: en el súper, con Galicia te quedan ≈$6.500 de tope.",
};

const compra = (
  id: string,
  c: Comercio,
  fecha: string,
  monto: number,
  medio: MedioDePago,
  reintegro: number | null,
  origen: Compra["origen"],
): Compra => ({ id, comercio: c, fecha, monto, medio, reintegro, origen });

/**
 * Compras de octubre. Cuentas que cierran con los topes:
 * Galicia 1.800 + 1.000 + 700 = 3.500 · Santander 3.000 + 1.200 + 900 + 600 = 5.700 ·
 * Macro 3.600 + 2.400 = 6.000 · total devuelto 15.200 en 10 compras.
 */
export const comprasOctubre: Compra[] = [
  compra("c10", comercios.farmacity, "2026-10-09", 16000, medios.macro, 2400, "ticket"),
  compra("c9", comercios.ypf, "2026-10-08", 20000, medios.santander, 3000, "excepcion"),
  compra("c8", comercios.shell, "2026-10-08", 4000, medios.santander, 600, "manual"),
  compra("c7", comercios.jumbo, "2026-10-07", 9000, medios.galicia, 1800, "ticket"),
  compra("c6", comercios.carrefour, "2026-10-07", 5000, medios.galicia, 1000, "excepcion"),
  compra("c5", comercios.coto, "2026-10-07", 3500, medios.galicia, 700, "ticket"),
  compra("c4", comercios.coto, "2026-10-06", 6000, medios.provincia, null, "manual"),
  compra("c3", comercios.farmacity, "2026-10-03", 24000, medios.macro, 3600, "ticket"),
  compra("c2", comercios.ypf, "2026-10-01", 8000, medios.santander, 1200, "ticket"),
  compra("c1", comercios.shell, "2026-10-01", 6000, medios.santander, 900, "excepcion"),
];

export const usuario = { nombre: "Martín", email: "martin@ejemplo.com" };

export const contactos: Contacto[] = [
  { id: "lucia", nombre: "Lucía", iniciales: "L", vinculadoDesde: "2026-10-12" },
  { id: "mateo", nombre: "Mateo", iniciales: "M", vinculadoDesde: "2026-10-02" },
];

/**
 * Lo que el servidor sabe de cada contacto para evaluar un grupo (ADR-008 §3, columna
 * "¿Llega al motor?"). Nunca viaja a la app: `api.ts` solo devuelve lo que arma
 * `servidor-simulado.ts` con la columna "¿Lo ve el usuario?".
 */
export type MedioContacto = {
  nombre: string;
  rubro: Rubro;
  porcentaje: number;
  dias: number[] | null;
  diasTexto: string;
  nominal: number;
  disponible: number | null;
};

export const contactoServidor: Record<string, { tieneCompras: boolean; medios: MedioContacto[] }> = {
  lucia: {
    tieneCompras: false,
    medios: [
      {
        nombre: "Galicia Visa crédito",
        rubro: "supermercado",
        porcentaje: 20,
        dias: [3],
        diasTexto: "los miércoles",
        nominal: 10000,
        disponible: null,
      },
    ],
  },
  mateo: {
    tieneCompras: true,
    medios: [
      {
        nombre: "Provincia Visa débito",
        rubro: "gastronomia",
        porcentaje: 25,
        dias: [6],
        diasTexto: "los sábados",
        nominal: 5000,
        disponible: 5000,
      },
    ],
  },
};

/** Gasto en grupo de ejemplo (DESIGN.md §9). */
export const grupoDeEjemplo = {
  nombre: "Cena del sábado",
  comercioId: "la-parolaccia",
  monto: 41000,
  fecha: "2026-10-17",
};

export const ticketDeEjemplo = {
  comercio: "Coto",
  fecha: HOY,
  monto: 24500,
  textoExtraido:
    "COTO C.I.C.S.A. · SUC. 112 ALMAGRO\n14/10/2026 18:42\nVARIOS SUPERMERCADO\nTOTAL $ 24.500,00\nGRACIAS POR SU COMPRA",
};

export const invitacionPropia = {
  link: "vuelto.app/i/k7Qm2x",
  venceEn: "24 h",
};
