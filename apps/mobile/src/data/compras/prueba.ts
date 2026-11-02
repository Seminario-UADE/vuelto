/** Ayudantes de los tests de la spec 010. No los importa nada de producción. */
import type { Compra, Promocion } from "@vuelto/motor";
import { promociones } from "../fixtures";

/** Genera UUID v4 válidos y predecibles: …0001, …0002, … */
export function generadorDeIds(prefijo = "00000000-0000-4000-8000-"): () => string {
  let n = 0;
  return () => {
    n += 1;
    return `${prefijo}${n.toString(16).padStart(12, "0")}`;
  };
}

export const ID_COMPRA = "a2000000-0000-4000-8000-000000000001";

/** Una compra nueva con id UUID, del medio Galicia Visa, en Coto. */
export function compraDePrueba(cambios: Partial<Compra> = {}): Compra {
  return {
    id: ID_COMPRA,
    fecha: "2026-10-14",
    monto: 5000,
    comercio: "Coto",
    categoriaId: 1,
    medioDePagoId: "galicia-visa-credito",
    promocionId: "promo-galicia-super-mie",
    descuentoObtenido: null,
    reintegroEsperado: 1000,
    fechaAcreditacionEstimada: null,
    origen: "manual",
    textoExtraido: null,
    ...cambios,
  };
}

/**
 * Dos promos de Galicia que comparten un mismo tope de $10.000 al mes. Todas las de
 * `fixtures.ts` son de tope exclusivo, así que sin esto no se puede probar «el tope compartido
 * sube la base» (spec 010, US1 escenario 3).
 */
export function promosConTopeCompartido(): Promocion[] {
  const base = promociones.find((p) => p.id === "promo-galicia-super-mie");
  if (!base) throw new Error("Falta la promo de Galicia en los fixtures");
  const compartido = { ...base.tope, alcance: "compartido" as const, grupoTopeId: "galicia-mensual" };
  return [
    { ...base, tope: compartido },
    { ...base, id: "promo-galicia-super-jue", titulo: "Galicia: 15% en supermercados los jueves", porcentaje: 15, tope: compartido, vigencia: { ...base.vigencia, dias: ["jue"] } },
  ];
}
