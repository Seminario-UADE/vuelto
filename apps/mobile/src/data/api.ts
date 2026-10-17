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
  Perfil,
  Recomendacion,
  RecomendacionGrupo,
  ResumenCompras,
  ResumenTopes,
  VistaInvitacion,
} from "./contracts";
import {
  HOY,
  MES,
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

const SIN_COMPRAS_MES = {
  tipo: "sin-compras" as const,
  texto: "Sin compras registradas este mes: todavía no podemos estimar cuánto te queda.",
};

function comercioPorId(id: string): Comercio {
  const c = catalogoComercios.find((x) => x.id === id);
  if (!c) throw new Error(`Comercio desconocido: ${id}`);
  return c;
}

export function getHoy(): string {
  return HOY;
}

export async function getPerfil(): Promise<Perfil> {
  return red({
    nombre: usuario.nombre,
    medios: mediosDeclarados,
    comercios: catalogoComercios.filter((c) => c.frecuente),
  });
}

export async function getMediosDisponibles(): Promise<MedioDePago[]> {
  return red(catalogoMedios);
}

export async function getComerciosFrecuentes(): Promise<Comercio[]> {
  return red(catalogoComercios.filter((c) => c.frecuente));
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

export async function recomendar(comercioId: string, monto: number | null): Promise<Recomendacion> {
  const r = servidor.recomendar(comercioPorId(comercioId), monto);
  if (escenario === "mes-vacio" && r.resultado === "recomendado") {
    return red({ ...r, topeDisponible: null, base: SIN_COMPRAS_MES, topeDespues: null });
  }
  return red(r);
}

export async function getTopes(): Promise<ResumenTopes> {
  const t = servidor.topes();
  if (escenario === "mes-vacio") {
    return red({
      ...t,
      devolvieron: { monto: 0, base: SIN_COMPRAS_MES },
      mediosConTope: 0,
      medios: t.medios.map((m) => ({
        ...m,
        disponible: null,
        estado: "sin-base" as const,
        base: SIN_COMPRAS_MES,
        consejo: null,
      })),
    });
  }
  return red(t);
}

function todasLasCompras(): Compra[] {
  if (escenario === "mes-vacio") return getSesion().comprasNuevas;
  return [...getSesion().comprasNuevas, ...comprasOctubre];
}

export async function getCompras(origen: OrigenCompra | "todas" = "todas"): Promise<ResumenCompras> {
  const todas = todasLasCompras();
  const devuelto = todas.reduce((s, c) => s + (c.reintegro ?? 0), 0);
  return red({
    mes: MES,
    devolvieron: {
      monto: devuelto,
      base:
        todas.length === 0
          ? SIN_COMPRAS_MES
          : {
              tipo: "compras",
              cantidad: todas.length,
              periodo: "mes",
              texto: `según ${todas.length} ${todas.length === 1 ? "compra" : "compras"} de ${MES}`,
            },
    },
    compras: origen === "todas" ? todas : todas.filter((c) => c.origen === origen),
  });
}

/**
 * Lee el ticket. En esta feature no recibe imagen: no hay captura real (spec 002 FR-015).
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
      rubro: "supermercado" as const,
      frecuente: false,
    };
  const r = servidor.recomendar(comercio, b.monto);
  const compra: Compra = {
    id: `n${Date.now()}`,
    comercio,
    fecha: b.fecha,
    monto: b.monto,
    medio,
    reintegro: r.medio?.id === medio.id ? r.reintegro : null,
    origen: b.modo,
  };
  setSesion({ comprasNuevas: [compra, ...getSesion().comprasNuevas] });
  return red(compra);
}

export async function getContactos(): Promise<Contacto[]> {
  const { contactosQuitados, contactosAceptados } = getSesion();
  const aceptados = contactosAceptados.map((id) => invitantes[id]).filter((c): c is Contacto => Boolean(c));
  return red([...contactos, ...aceptados].filter((c) => !contactosQuitados.includes(c.id)));
}

export async function crearInvitacion(): Promise<Invitacion> {
  return red({ link: invitacionPropia.link, venceEn: invitacionPropia.venceEn, usoUnico: true });
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
