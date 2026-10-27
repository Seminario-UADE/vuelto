/**
 * Capa de datos de la app. Cada función tiene la firma del cliente de la Edge Function o
 * de la tabla que la va a reemplazar (docs/architecture/02-api-routes.md). Hoy responde con
 * fixtures y `servidor-simulado.ts`; cuando exista el backend cambia solo el cuerpo de
 * cada función. Las pantallas importan solo este archivo (y los tipos de `contracts.ts`).
 */
import type {
  BorradorCompra,
  Comercio,
  Compra,
  Contacto,
  Invitacion,
  LecturaTicket,
  MedioDePago,
  OrigenCompra,
  PedidoGrupo,
  PedidoRecomendar,
  PromocionCatalogo,
  RespuestaRecomendar,
  Perfil,
  Recomendacion,
  RecomendacionGrupo,
  ResumenCompras,
  ResumenTopes,
  VistaInvitacion,
} from "./contracts";
import {
  CATEGORIA_DE_RUBRO,
  DIA_HOY,
  HOY,
  MES,
  promos,
  catalogoComercios,
  catalogoMedios,
  comprasOctubre,
  contactos,
  grupoDeEjemplo,
  invitacionPropia,
  mediosDeclarados,
  ticketDeEjemplo,
  usuario,
} from "./fixtures";
import * as servidor from "./servidor-simulado";
import { aVista } from "./vista-recomendacion";

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
import { getSesion, setSesion } from "./sesion";

/** Escenarios para probar estados vacíos y de error (solo desarrollo). */
export type Escenario = "normal" | "mes-vacio" | "ticket-ilegible";

let escenario: Escenario = "normal";
export function setEscenario(e: Escenario): void {
  escenario = e;
  setSesion({});
}
export function getEscenario(): Escenario {
  return escenario;
}

/** Demora simulada de red (0 en tests). */
let demoraMs = 250;
export function setDemora(ms: number): void {
  demoraMs = ms;
}
function red<T>(valor: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(valor), demoraMs));
}

function comercioPorId(id: string): Comercio {
  const c = catalogoComercios.find((x) => x.id === id);
  if (!c) throw new Error(`Comercio desconocido: ${id}`);
  return c;
}

export function getHoy(): string {
  return HOY;
}

/**
 * Lo que el usuario eligió en el onboarding (en el servidor vive en su perfil, con RLS).
 * Lo actualiza `perfil-local.ts`; sin elección, se usan los de ejemplo.
 */
let preferencias: { medios: string[]; comercios: string[] } = { medios: [], comercios: [] };
export function setPreferencias(p: { medios: string[]; comercios: string[] }): void {
  preferencias = p;
}

function mediosDelUsuario(): MedioDePago[] {
  const elegidos = catalogoMedios.filter((m) => preferencias.medios.includes(m.id));
  return elegidos.length > 0 ? elegidos : mediosDeclarados;
}

function comerciosDelUsuario(): Comercio[] {
  const elegidos = catalogoComercios.filter((c) => preferencias.comercios.includes(c.id));
  return elegidos.length > 0 ? elegidos : catalogoComercios.filter((c) => c.frecuente);
}

export async function getPerfil(): Promise<Perfil> {
  return red({ nombre: usuario.nombre, medios: mediosDelUsuario(), comercios: comerciosDelUsuario() });
}

/** Medios del perfil guardado en el servidor (para quien entra con una cuenta existente). */
export function mediosDeclaradosIds(): string[] {
  return mediosDeclarados.map((m) => m.id);
}

export async function getMediosDisponibles(): Promise<MedioDePago[]> {
  return red(catalogoMedios);
}

export async function getComerciosFrecuentes(): Promise<Comercio[]> {
  return red(comerciosDelUsuario());
}

export async function getCatalogoComercios(): Promise<Comercio[]> {
  return red(catalogoComercios);
}

export async function buscarComercios(q: string): Promise<Comercio[]> {
  const t = q.trim().toLocaleLowerCase("es");
  const normal = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  return red(t === "" ? [] : catalogoComercios.filter((c) => normal(c.nombre).includes(normal(t))));
}

export async function getComercio(id: string): Promise<Comercio> {
  return red(comercioPorId(id));
}

/** Catálogo de promociones (lectura con RLS) para nombrar lo que el motor devuelve por id. */
function promocionesCatalogo(): PromocionCatalogo[] {
  return promos.map((p) => ({
    id: p.id,
    titulo: p.titulo,
    bancoId: catalogoMedios.find((m) => m.id === p.medioId)?.banco ?? "",
    categoriaId: CATEGORIA_DE_RUBRO[p.rubro] ?? 0,
  }));
}

/**
 * Cliente de `POST /functions/v1/recomendar`. Hoy responde el mock con la forma exacta de la
 * Edge Function; para conectarla, esta función pasa a ser
 * `supabase.functions.invoke("recomendar", { body: pedido })` (y el mock se borra).
 */
async function invocarRecomendar(pedido: PedidoRecomendar): Promise<RespuestaRecomendar> {
  return red(servidor.recomendar(pedido, { sinCompras: escenario === "mes-vacio" }));
}

export async function recomendar(comercioId: string, monto: number | null): Promise<Recomendacion> {
  const comercio = comercioPorId(comercioId);
  if (comercio.categoriaId === null) throw new Error("No conocemos el rubro de este comercio");
  const pedido: PedidoRecomendar = {
    comercio: comercio.nombre,
    categoriaId: comercio.categoriaId,
    monto: monto !== null && monto > 0 ? monto : null,
    canal: "presencial",
  };
  const respuesta = await invocarRecomendar(pedido);
  return aVista(pedido, respuesta, comercio, {
    medios: mediosDeclarados,
    promociones: promocionesCatalogo(),
    mes: MES,
    dia: `hoy ${DIAS[DIA_HOY]}`,
  });
}

function todasLasCompras(): Compra[] {
  const nuevas = getSesion().comprasNuevas;
  return escenario === "mes-vacio" ? nuevas : [...nuevas, ...comprasOctubre];
}

export async function getTopes(): Promise<ResumenTopes> {
  return red(servidor.topes(todasLasCompras(), { sinCompras: escenario === "mes-vacio" }));
}

export async function getCompras(origen: OrigenCompra | "todas" = "todas"): Promise<ResumenCompras> {
  const todas = todasLasCompras();
  return red({
    mes: MES,
    gastaste: servidor.gastado(todas),
    devolvieron: servidor.devolvieron(todas),
    compras: origen === "todas" ? todas : todas.filter((c) => c.origen === origen),
  });
}

/**
 * Lee el ticket. En esta feature no recibe imagen: no hay captura real (spec 006 FR-015).
 * El endpoint real recibe la imagen, la manda a Gemini y la descarta (Principio IV).
 */
export async function leerTicket(): Promise<LecturaTicket> {
  if (escenario === "ticket-ilegible") {
    return red({
      ok: false,
      error: "No pudimos leer el ticket. Probá con más luz o cargá el monto a mano.",
    });
  }
  return red({
    ok: true,
    comercio: ticketDeEjemplo.comercio,
    fecha: ticketDeEjemplo.fecha,
    monto: ticketDeEjemplo.monto,
    medio: null,
    textoExtraido: ticketDeEjemplo.textoExtraido,
  });
}

export async function guardarCompra(b: BorradorCompra): Promise<Compra> {
  if (b.monto === null || b.medioId === null) {
    throw new Error("Falta el monto o el medio de pago");
  }
  const medio = catalogoMedios.find((m) => m.id === b.medioId);
  if (!medio) throw new Error(`Medio desconocido: ${b.medioId}`);
  const nombre = (b.comercio ?? "").trim() || "Compra";
  const comercio =
    catalogoComercios.find((c) => c.nombre.toLowerCase() === nombre.toLowerCase()) ?? {
      id: `libre-${nombre.toLowerCase()}`,
      nombre,
      inicial: nombre.charAt(0).toUpperCase(),
      // Fuera del catálogo no conocemos el rubro: no se inventa, y no se estima reintegro.
      rubro: "otro" as const,
      categoriaId: null,
      frecuente: false,
    };
  const compra: Compra = {
    id: `n${Date.now()}`,
    comercio,
    fecha: b.fecha,
    monto: b.monto,
    medio,
    reintegro: servidor.reintegroDeCompra(comercio, b.monto, medio.id),
    origen: b.modo,
    textoExtraido: b.textoExtraido,
  };
  setSesion({ comprasNuevas: [compra, ...getSesion().comprasNuevas] });
  return red(compra);
}

export async function getContactos(): Promise<Contacto[]> {
  const { contactosQuitados, contactosAceptados } = getSesion();
  const aceptados = contactosAceptados.map((id) => invitantes[id]).filter((c): c is Contacto => Boolean(c));
  return red([...contactos, ...aceptados].filter((c) => !contactosQuitados.includes(c.id)));
}

let generadas = 0;

/** Cada llamada genera un link nuevo (el anterior deja de servir en el servidor). */
export async function crearInvitacion(): Promise<Invitacion> {
  generadas += 1;
  const link = generadas === 1 ? invitacionPropia.link : `${invitacionPropia.link.slice(0, -2)}${generadas}q`;
  return red({ link, venceEn: invitacionPropia.venceEn, usoUnico: true });
}

/** Quién invita en cada token de ejemplo (en el servidor sale de `ver_invitacion`). */
const invitantes: Record<string, Contacto> = {
  tomas: { id: "tomas", nombre: "Tomás", iniciales: "T", vinculadoDesde: HOY },
};

const TOKENS: Record<string, { estado: VistaInvitacion["estado"]; quien: string | null; contactoId: string | null }> = {
  "demo-tomas": { estado: "valida", quien: "Tomás", contactoId: "tomas" },
  "demo-vencida": { estado: "vencida", quien: "Tomás", contactoId: null },
  "demo-usada": { estado: "usada", quien: "Tomás", contactoId: null },
  "demo-propia": { estado: "propia", quien: usuario.nombre, contactoId: null },
  "k7Qm2x": { estado: "propia", quien: usuario.nombre, contactoId: null },
  "demo-contacto": { estado: "ya-contacto", quien: "Lucía", contactoId: "lucia" },
};

export async function verInvitacion(token: string): Promise<VistaInvitacion> {
  const t = TOKENS[token] ?? { estado: "vencida" as const, quien: null, contactoId: null };
  const yaAceptada = t.contactoId !== null && getSesion().contactosAceptados.includes(t.contactoId);
  return red({
    estado: yaAceptada ? "ya-contacto" : t.estado,
    quienInvita: t.quien,
    comparte: [
      "Tu nombre para mostrar",
      "Qué medio tuyo conviene en una compra del grupo (solo ese)",
      "El reintegro estimado de esa compra, calculado con tu tope",
    ],
    noComparte: [
      "Tus compras, montos, comercios y fechas",
      "Cuánto tope te queda",
      "Tus otros medios de pago",
      "Tu email",
    ],
    sePuedeDeducir: `A partir de una recomendación, ${t.quien ?? "la otra persona"} podría deducir cuánto reintegro te queda en una promo.`,
  });
}

export async function aceptarInvitacion(token: string): Promise<{ contacto: Contacto }> {
  const t = TOKENS[token];
  const contacto = t?.contactoId ? invitantes[t.contactoId] : undefined;
  if (!t || t.estado !== "valida" || !contacto) throw new Error("La invitación ya no es válida");
  const { contactosAceptados, contactosQuitados } = getSesion();
  setSesion({
    contactosAceptados: [...contactosAceptados.filter((x) => x !== contacto.id), contacto.id],
    contactosQuitados: contactosQuitados.filter((x) => x !== contacto.id),
  });
  return red({ contacto });
}

export async function quitarContacto(id: string): Promise<{ ok: true }> {
  setSesion({ contactosQuitados: [...getSesion().contactosQuitados, id] });
  return red({ ok: true as const });
}

export function getGrupoDeEjemplo(): Omit<PedidoGrupo, "integrantes"> {
  return { ...grupoDeEjemplo };
}

export async function recomendarGrupo(pedido: PedidoGrupo): Promise<RecomendacionGrupo> {
  return red(
    servidor.recomendarGrupo({
      nombre: pedido.nombre,
      comercio: comercioPorId(pedido.comercioId),
      monto: pedido.monto,
      fecha: pedido.fecha,
      integrantes: pedido.integrantes,
    }),
  );
}
