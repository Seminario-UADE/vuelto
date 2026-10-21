/** Datos de prueba compartidos por los tests del motor. No se compila a `dist/`. */
import type { Compra, CompraPropuesta, MedioDePago, Perfil, Promocion } from "../tipos.ts";

export const GALICIA = "88d8705e-2dda-46f9-8411-bb4916af858e";
export const SANTANDER = "5b1c3a7e-0000-4000-8000-000000000072";

/** Miércoles 21/10/2026, 12:00 en Argentina. */
export const AHORA = new Date("2026-10-21T15:00:00Z");

export function medio(datos: Partial<MedioDePago> = {}): MedioDePago {
  return { id: "galicia-credito-visa", bancoId: GALICIA, tipo: "credito", red: "visa", ...datos };
}

export function perfil(mediosDePago: MedioDePago[] = [medio()]): Perfil {
  return { nombreParaMostrar: null, mediosDePago, comerciosHabituales: [] };
}

/** Promo que aplica a `compra()` con `medio()` en `AHORA`, sin tope informado. */
export function promo(datos: Partial<Promocion> = {}): Promocion {
  return {
    id: "promo-galicia",
    fuente: "modo",
    titulo: "20% en supermercados con Galicia",
    bancoId: GALICIA,
    categoriaId: 1,
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

export function compra(datos: Partial<CompraPropuesta> = {}): CompraPropuesta {
  return { comercio: null, categoriaId: 1, monto: 10000, canal: "presencial", ...datos };
}

export function compraRegistrada(datos: Partial<Compra> = {}): Compra {
  return {
    id: "compra-1",
    fecha: "2026-10-10",
    monto: 10000,
    comercio: "Coto",
    categoriaId: 1,
    medioDePagoId: "galicia-credito-visa",
    promocionId: "promo-galicia",
    descuentoObtenido: null,
    reintegroEsperado: null,
    fechaAcreditacionEstimada: null,
    origen: "ticket",
    textoExtraido: null,
    ...datos,
  };
}
