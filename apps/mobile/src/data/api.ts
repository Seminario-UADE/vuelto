/**
 * Lo que la app pide a la red: catálogos, lectura del ticket, invitaciones y el gasto en grupo.
 * Cada función tiene la firma del cliente de la Edge Function o de la tabla que la va a
 * reemplazar (docs/architecture/02-api-routes.md); hoy responde con fixtures. La
 * recomendación, los topes, el perfil y las compras NO están acá: se derivan del store con
 * `@vuelto/motor`, sin red (ADR-010, `src/store/selectores.ts`).
 */
import { fechaArgentina } from "@vuelto/motor";
import type {
  Comercio,
  Contacto,
  Invitacion,
  LecturaTicket,
  PedidoGrupo,
  RecomendacionGrupo,
  VistaInvitacion,
} from "./contracts";
import {
  RELOJ_EJEMPLO,
  catalogoComercios,
  grupoDeEjemplo,
  invitacionPropia,
  ticketDeEjemplo,
  usuario,
} from "./fixtures";
import { recomendarGrupo as grupoEnElServidor } from "./grupo-simulado";

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

/** "Hoy" para el servidor de ejemplo (el reloj de los fixtures). */
const HOY_EN_EL_SERVIDOR = fechaArgentina(new Date(RELOJ_EJEMPLO));

// Los comercios del buscador ya no son un pedido: se derivan del corpus del store
// (`selectCatalogoComercios`, issue #43).

/** Las fallas que se pueden forzar con los escenarios de desarrollo. */
export type FallaTicket = "ilegible" | "sin-red";

/**
 * Lee el ticket. En esta feature no recibe imagen: no hay captura real (spec 006 FR-015).
 * El endpoint real recibe la imagen, la manda a Groq y la descarta (Principio IV, ADR-012).
 * `hoy` viene del reloj del store (`sesion.ahora`), nunca de `new Date()` (spec 012 R12).
 */
export async function leerTicket(opciones: { hoy: string; falla?: FallaTicket | null }): Promise<LecturaTicket> {
  if (opciones.falla === "ilegible") {
    return red({
      ok: false,
      error: "No pudimos leer el ticket. Probá con más luz o cargá el monto a mano.",
    });
  }
  if (opciones.falla === "sin-red") {
    return red({
      ok: false,
      error: "Sin conexión no podemos leer el ticket. Probá de nuevo cuando tengas internet o cargá la compra a mano.",
    });
  }
  const t = ticketDeEjemplo(opciones.hoy);
  return red({
    ok: true,
    comercio: t.comercio,
    fecha: t.fecha,
    monto: t.monto,
    medio: null,
    textoExtraido: t.textoExtraido,
  });
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
  tomas: { id: "tomas", nombre: "Tomás", iniciales: "T", vinculadoDesde: HOY_EN_EL_SERVIDOR },
};

const TOKENS: Record<string, { estado: VistaInvitacion["estado"]; quien: string | null; contactoId: string | null }> = {
  "demo-tomas": { estado: "valida", quien: "Tomás", contactoId: "tomas" },
  "demo-vencida": { estado: "vencida", quien: "Tomás", contactoId: null },
  "demo-usada": { estado: "usada", quien: "Tomás", contactoId: null },
  "demo-propia": { estado: "propia", quien: usuario.nombre, contactoId: null },
  k7Qm2x: { estado: "propia", quien: usuario.nombre, contactoId: null },
  "demo-contacto": { estado: "ya-contacto", quien: "Lucía", contactoId: "lucia" },
};

/** `contactos`: los ids que ya son contacto (en el servidor lo sabe `ver_invitacion`). */
export async function verInvitacion(token: string, contactos: string[]): Promise<VistaInvitacion> {
  const t = TOKENS[token] ?? { estado: "vencida" as const, quien: null, contactoId: null };
  const yaAceptada = t.estado === "valida" && t.contactoId !== null && contactos.includes(t.contactoId);
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
  return red({ contacto });
}

/** En el servidor corta el vínculo para los dos; la pantalla lo saca del store. */
export async function quitarContacto(id: string): Promise<{ ok: true; id: string }> {
  return red({ ok: true as const, id });
}

export function getGrupoDeEjemplo(): Omit<PedidoGrupo, "integrantes"> {
  return { ...grupoDeEjemplo };
}

/** `comercio`: el que eligió la pantalla (puede ser del corpus); sin él, el del grupo de ejemplo. */
export async function recomendarGrupo(pedido: PedidoGrupo, comercio?: Comercio): Promise<RecomendacionGrupo> {
  return red(
    grupoEnElServidor(
      {
        nombre: pedido.nombre,
        comercio: comercio ?? comercioPorId(pedido.comercioId),
        monto: pedido.monto,
        fecha: pedido.fecha,
        integrantes: pedido.integrantes,
      },
      HOY_EN_EL_SERVIDOR,
    ),
  );
}
