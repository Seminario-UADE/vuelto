/** Datos de prueba de la capa del servidor. Mismo estilo que los del motor. */
import type { Compra, CompraPropuesta, MedioDePago, Promocion } from "@vuelto/motor";

export const GALICIA = "88d8705e-2dda-46f9-8411-bb4916af858e";
export const SANTANDER = "5b1c3a7e-0000-4000-8000-000000000072";

/** Sábado 24/10/2026, 12:00 en Argentina. */
export const AHORA = new Date("2026-10-24T15:00:00Z");

export const GASTRONOMIA = 2;

export function medio(datos: Partial<MedioDePago> = {}): MedioDePago {
  return { id: "galicia-credito-visa", bancoId: GALICIA, tipo: "credito", red: "visa", ...datos };
}

/** Promo que aplica a `compraPropuesta()` con `medio()` en `AHORA`, sin tope informado. */
export function promo(datos: Partial<Promocion> = {}): Promocion {
  return {
    id: "promo-galicia",
    fuente: "modo",
    titulo: "20% en gastronomía con Galicia",
    bancoId: GALICIA,
    categoriaId: GASTRONOMIA,
    comercio: null,
    porcentaje: 20,
    tarjetas: { debito: [], credito: ["visa"] },
    vigencia: { desde: "2026-10-01", hasta: "2026-10-31", dias: null },
    tope: { monto: null, periodo: null, alcance: null, grupoTopeId: null },
    montoMinimo: null,
    jurisdiccion: null,
    canal: null,
    acumulable: null,
    ...datos,
  };
}

export function compraPropuesta(datos: Partial<CompraPropuesta> = {}): CompraPropuesta {
  return { comercio: "Kansas", categoriaId: GASTRONOMIA, monto: 15000, canal: "presencial", ...datos };
}

export function compraRegistrada(datos: Partial<Compra> = {}): Compra {
  return {
    id: "compra-1",
    fecha: "2026-10-10",
    monto: 10000,
    comercio: "Kansas",
    categoriaId: GASTRONOMIA,
    medioDePagoId: "galicia-credito-visa",
    promocionId: "promo-galicia",
    descuentoObtenido: null,
    reintegroEsperado: null,
    fechaAcreditacionEstimada: null,
    origen: "excepcion",
    textoExtraido: null,
    ...datos,
  };
}
