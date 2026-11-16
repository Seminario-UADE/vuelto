/**
 * Lo que la app simula de la red: la lectura del ticket de los escenarios de desarrollo. Los
 * contactos, las invitaciones y el gasto en grupo van por `src/grupo/repositorio.ts` (spec 016).
 * Cada función tiene la firma del cliente de la Edge Function o de la tabla que la va a
 * reemplazar (docs/architecture/02-api-routes.md); hoy responde con fixtures. La
 * recomendación, los topes, el perfil y las compras NO están acá: se derivan del store con
 * `@vuelto/motor`, sin red (ADR-010, `src/store/selectores.ts`).
 */
import type { LecturaApp } from "./contracts";
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

/** Los escenarios de desarrollo de la lectura del ticket (spec 014, FR-012). */
export type EscenarioTicket = "ejemplo" | "ilegible" | "sin-red";

/**
 * Simula la lectura del ticket, sin cámara ni servicio: solo para los escenarios de desarrollo
 * (la demo, los tests y la web sin cámara). La lectura real es `ticket/leer.ts`, que manda la
 * foto al servicio de la spec 013. `hoy` viene del reloj del store (`sesion.ahora`), nunca de
 * `new Date()` (spec 012 R12).
 */
export async function leerTicket(opciones: { hoy: string; escenario: EscenarioTicket }): Promise<LecturaApp> {
  if (opciones.escenario === "ilegible") return red({ ok: false, resultado: "ticket_ilegible" });
  if (opciones.escenario === "sin-red") return red({ ok: false, resultado: "sin_conexion" });
  const t = ticketDeEjemplo(opciones.hoy);
  return red({ ok: true, ...t });
}
