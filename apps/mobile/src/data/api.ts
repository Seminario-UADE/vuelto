/**
 * Lo que la app pide a la red y todavía es de ejemplo: la lectura del ticket (#48). Los contactos,
 * las invitaciones y el gasto en grupo van por `src/grupo/repositorio.ts` (spec 013).
 * Cada función tiene la firma del cliente de la Edge Function o de la tabla que la va a
 * reemplazar (docs/architecture/02-api-routes.md); hoy responde con fixtures. La
 * recomendación, los topes, el perfil y las compras NO están acá: se derivan del store con
 * `@vuelto/motor`, sin red (ADR-010, `src/store/selectores.ts`).
 */
import type { LecturaTicket } from "./contracts";
import { ticketDeEjemplo } from "./fixtures";

/** Demora simulada de red (0 en tests). */
let demoraMs = 250;
export function setDemora(ms: number): void {
  demoraMs = ms;
}
function red<T>(valor: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(valor), demoraMs));
}

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
