/**
 * Datos de ejemplo de docs/design/DESIGN.md §9 (Martín, octubre de 2026).
 *
 * Hacen de "base de datos" mientras no existe Supabase (#34): el estado inicial del store
 * y los datos del reemplazo de la Edge Function de grupo. Las pantallas nunca importan
 * este archivo.
 */
import { RUBROS } from "../lib/rubros";
import type { Compra as CompraMotor, Dia, MedioDePago as MedioMotor, Promocion } from "@vuelto/motor";
import type { Comercio, Contacto, MedioDePago, Rubro } from "./contracts";
import type { MedioDePago as MedioGuardado } from "../perfil/modelo";
import { medioDelMotor } from "../perfil/vista";

/**
 * Reloj de los datos de ejemplo: miércoles 14 de octubre de 2026 al mediodía de Argentina
 * (spec 006 FR-038, spec 008 FR-006). El mediodía evita que la zona horaria cambie el día.
 */
export const RELOJ_EJEMPLO = "2026-10-14T12:00:00-03:00";

export const medios = {
  galicia: {
    id: "galicia-visa-credito",
    banco: "Galicia",
    nombre: "Galicia Visa crédito",
    nombreCorto: "Galicia",
    detalle: "Crédito · Banco Galicia",
    inicial: "G",
    conCobertura: true,
  },
  santander: {
    id: "santander-mastercard-credito",
    banco: "Santander",
    nombre: "Santander Mastercard crédito",
    nombreCorto: "Santander",
    detalle: "Crédito · Banco Santander",
    inicial: "S",
    conCobertura: true,
  },
  provincia: {
    id: "provincia-visa-debito",
    banco: "Provincia",
    nombre: "Provincia Visa débito",
    nombreCorto: "Provincia",
    detalle: "Débito · Banco Provincia",
    inicial: "P",
    conCobertura: true,
  },
  macro: {
    id: "macro-visa-debito",
    banco: "Macro",
    nombre: "Macro Visa débito",
    nombreCorto: "Macro",
    detalle: "Débito · Banco Macro",
    inicial: "M",
    conCobertura: true,
  },
  bbva: {
    id: "bbva-visa-credito",
    banco: "BBVA",
    nombre: "BBVA Visa crédito",
    nombreCorto: "BBVA",
    detalle: "Crédito · BBVA",
    inicial: "B",
    conCobertura: true,
  },
  mercadoPago: {
    id: "mercado-pago",
    banco: "Mercado Pago",
    nombre: "Mercado Pago",
    nombreCorto: "Mercado Pago",
    detalle: "Billetera virtual",
    inicial: "MP",
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

/** Rubro de la app → id de categoría de MODO. */
export const CATEGORIA_DE_RUBRO = Object.fromEntries(
  Object.entries(RUBROS).map(([r, v]) => [r, v.categoriaId]),
) as Record<Rubro, number | null>;

const comercio = (id: string, nombre: string, rubro: Rubro, frecuente: boolean): Comercio => ({
  id,
  nombre,
  inicial: nombre.charAt(0),
  rubro,
  categoriaId: CATEGORIA_DE_RUBRO[rubro],
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

/**
 * Los medios de ejemplo con la forma que guarda el slice `perfil` (issue #41): la misma que
 * devuelve `medios_de_pago`. Los `bancoId` son slugs porque el corpus de ejemplo los usa así; los
 * de la base son UUID de MODO. `medioVista` arma con ellos los textos de `medios`.
 */
export const mediosGuardados = {
  galicia: { id: medios.galicia.id, bancoId: "galicia", nombreBanco: "Banco Galicia", tipo: "credito", red: "visa" },
  santander: {
    id: medios.santander.id,
    bancoId: "santander",
    nombreBanco: "Banco Santander",
    tipo: "credito",
    red: "master",
  },
  provincia: {
    id: medios.provincia.id,
    bancoId: "provincia",
    nombreBanco: "Banco Provincia",
    tipo: "debito",
    red: "visa",
  },
  macro: { id: medios.macro.id, bancoId: "macro", nombreBanco: "Banco Macro", tipo: "debito", red: "visa" },
  bbva: { id: medios.bbva.id, bancoId: "bbva", nombreBanco: "BBVA", tipo: "credito", red: "visa" },
} satisfies Record<string, MedioGuardado>;

/** Los medios de ejemplo guardados con esos ids; los que no existen quedan afuera. */
export function mediosDeEjemplo(ids: readonly string[]): MedioGuardado[] {
  const todos: MedioGuardado[] = Object.values(mediosGuardados);
  return ids.flatMap((id) => todos.filter((m) => m.id === id));
}

/**
 * Medios de ejemplo con la forma del motor (data-model.md §Medios). Mercado Pago no está: es una
 * billetera sin banco ni red, y el motor no puede evaluarla sin inventarlos.
 */
export const mediosDelMotor: Record<string, MedioMotor> = Object.fromEntries(
  Object.values(mediosGuardados).map((m) => [m.id, medioDelMotor(m)]),
);

const promo = (
  id: string,
  titulo: string,
  bancoId: string,
  rubro: Rubro,
  porcentaje: number,
  tarjetas: Promocion["tarjetas"],
  dias: Dia[] | null,
  tope: number,
  periodo: "mensual" | "semanal",
): Promocion => ({
  id,
  fuente: "manual",
  titulo,
  bancoId,
  categoriaId: CATEGORIA_DE_RUBRO[rubro] ?? 0,
  comercio: null,
  porcentaje,
  tarjetas,
  vigencia: { desde: "2026-10-01", hasta: "2026-12-31", dias },
  tope: { monto: tope, periodo, alcance: "exclusivo", grupoTopeId: null },
  montoMinimo: null,
  jurisdiccion: "nacional",
  canal: "ambos",
  acumulable: false,
});

/** Corpus de ejemplo (MODO simplificado): una promo por banco de Martín. */
export const promociones: Promocion[] = [
  promo(
    "promo-galicia-super-mie",
    "Galicia: 20% en supermercados los miércoles",
    "galicia",
    "supermercado",
    20,
    { debito: [], credito: ["visa"] },
    ["mie"],
    10000,
    "mensual",
  ),
  promo(
    "promo-santander-nafta-jue",
    "Santander: 15% en combustibles los jueves",
    "santander",
    "combustible",
    15,
    { debito: [], credito: ["master"] },
    ["jue"],
    8000,
    "mensual",
  ),
  promo(
    "promo-provincia-gastro-sab",
    "Provincia: 25% en gastronomía los sábados",
    "provincia",
    "gastronomia",
    25,
    { debito: ["visa"], credito: [] },
    ["sab"],
    5000,
    "semanal",
  ),
  promo(
    "promo-macro-farmacias",
    "Macro: 15% en farmacias todos los días",
    "macro",
    "farmacia",
    15,
    { debito: ["visa"], credito: [] },
    null,
    6000,
    "mensual",
  ),
];

const compra = (
  id: string,
  c: Comercio,
  fecha: string,
  monto: number,
  medio: MedioDePago,
  promocionId: string | null,
  descuentoObtenido: number | null,
  origen: CompraMotor["origen"],
): CompraMotor => ({
  id,
  fecha,
  monto,
  comercio: c.nombre,
  categoriaId: c.categoriaId,
  medioDePagoId: medio.id,
  promocionId,
  descuentoObtenido,
  reintegroEsperado: null,
  fechaAcreditacionEstimada: null,
  origen,
  textoExtraido: null,
});

const GALICIA = "promo-galicia-super-mie";
const SANTANDER = "promo-santander-nafta-jue";
const MACRO = "promo-macro-farmacias";

/**
 * Compras de octubre, con el descuento que informó el banco. Cuentas que cierran con los topes:
 * Galicia 1.800 + 1.000 + 700 = 3.500 · Santander 3.000 + 1.200 + 900 + 600 = 5.700 ·
 * Macro 3.600 + 2.400 = 6.000 · total devuelto 15.200 en 10 compras.
 */
export const comprasOctubre: CompraMotor[] = [
  compra("c10", comercios.farmacity, "2026-10-09", 16000, medios.macro, MACRO, 2400, "ticket"),
  compra("c9", comercios.ypf, "2026-10-08", 20000, medios.santander, SANTANDER, 3000, "excepcion"),
  compra("c8", comercios.shell, "2026-10-08", 4000, medios.santander, SANTANDER, 600, "manual"),
  compra("c7", comercios.jumbo, "2026-10-07", 9000, medios.galicia, GALICIA, 1800, "ticket"),
  compra("c6", comercios.carrefour, "2026-10-07", 5000, medios.galicia, GALICIA, 1000, "excepcion"),
  compra("c5", comercios.coto, "2026-10-07", 3500, medios.galicia, GALICIA, 700, "ticket"),
  compra("c4", comercios.coto, "2026-10-06", 6000, medios.provincia, null, null, "manual"),
  compra("c3", comercios.farmacity, "2026-10-03", 24000, medios.macro, MACRO, 3600, "ticket"),
  compra("c2", comercios.ypf, "2026-10-01", 8000, medios.santander, SANTANDER, 1200, "ticket"),
  compra("c1", comercios.shell, "2026-10-01", 6000, medios.santander, SANTANDER, 900, "excepcion"),
];

export const usuario = { nombre: "Martín", email: "martin@ejemplo.com" };

export const contactos: Contacto[] = [
  { id: "lucia", nombre: "Lucía", iniciales: "L", vinculadoDesde: "2026-10-12" },
  { id: "mateo", nombre: "Mateo", iniciales: "M", vinculadoDesde: "2026-10-02" },
];

/**
 * Lo que el servidor sabe de cada integrante de un grupo, con la forma del motor (ADR-008 §3,
 * columna "¿Llega al motor?"). Solo lo lee `grupo-simulado.ts`, el reemplazo de la Edge
 * Function: nunca llega a una pantalla.
 */
export const datosDeContactos: Record<string, { medios: MedioMotor[]; compras: CompraMotor[] }> = {
  lucia: { medios: [mediosDelMotor[medios.galicia.id]!], compras: [] },
  mateo: {
    medios: [mediosDelMotor[medios.provincia.id]!],
    compras: [compra("m1", comercios.coto, "2026-10-12", 8000, medios.provincia, null, null, "manual")],
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
  fecha: "2026-10-14",
  monto: 24500,
  textoExtraido:
    "COTO C.I.C.S.A. · SUC. 112 ALMAGRO\n14/10/2026 18:42\nVARIOS SUPERMERCADO\nTOTAL $ 24.500,00\nGRACIAS POR SU COMPRA",
};

export const invitacionPropia = {
  link: "vuelto.app/i/k7Qm2x",
  venceEn: "24 h",
};
