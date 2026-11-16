/**
 * Lo que dice la pantalla de aceptación (ADR-008 §1 y §3, spec 016 US2-6): quién invita, qué se
 * comparte, qué no y qué se puede deducir, incluido lo que deja deducir repetir consultas (D9).
 * Función pura sobre la respuesta del servidor.
 */
import type { VistaInvitacion } from "../data/contracts";
import type { VistaInvitacionRemota } from "./repositorio";

const COMPARTE = [
  "Tu nombre para mostrar",
  "Qué medio tuyo conviene en una compra del grupo (solo ese)",
  "El reintegro estimado de esa compra, calculado con tu tope y redondeado de a $100",
];

const NO_COMPARTE = ["Tus compras, montos, comercios y fechas", "Cuánto tope te queda", "Tus otros medios de pago", "Tu email"];

export function vistaDeInvitacion(r: VistaInvitacionRemota): VistaInvitacion {
  const quien = r.quienInvita ?? "la otra persona";
  return {
    estado: r.estado,
    quienInvita: r.quienInvita,
    venceEn: r.estado === "valida" ? r.venceEn : null,
    comparte: COMPARTE,
    noComparte: NO_COMPARTE,
    sePuedeDeducir:
      `A partir de una recomendación, ${quien} podría deducir cuánto reintegro te queda en una promo. ` +
      "Y si repite consultas cambiando el monto, el comercio o el día, podría deducir más sobre cómo usás tus topes.",
  };
}

/** «Vence en 23 h» o «Vence en menos de 1 h», a partir del vencimiento real. */
export function textoVencimiento(venceEn: string | null, ahora: Date): string {
  if (venceEn === null) return "Sirve una sola vez";
  const horas = Math.floor((Date.parse(venceEn) - ahora.getTime()) / 3_600_000);
  if (Number.isNaN(horas)) return "Sirve una sola vez";
  return horas < 1 ? "Vence en menos de 1 h · sirve una sola vez" : `Vence en ${horas} h · sirve una sola vez`;
}
