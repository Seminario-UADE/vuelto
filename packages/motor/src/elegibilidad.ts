/**
 * Reglas de elegibilidad de una promo para una compra (FR-005 a FR-012).
 * El orden de `REGLAS_DE_PROMOCION` es el orden de FR-015: primero lo que
 * hace que la promo no tenga que ver con la compra, al final lo que depende
 * del usuario. `medio_de_pago` y `tope_agotado` se evalúan después, en
 * `recomendar`, porque no dependen solo de la promo y la compra.
 */
import { aCentavos } from "./dinero.ts";
import type {
  CausaDescarte,
  CompraPropuesta,
  Dia,
  FechaISO,
  Jurisdiccion,
  MedioDePago,
  Promocion,
} from "./tipos.ts";

/** Alcance del MVP: CABA y AMBA. Una promo sin jurisdicción también aplica. */
export const JURISDICCIONES_VALIDAS: readonly Jurisdiccion[] = ["nacional", "caba", "pba"];

export interface ContextoDeCompra {
  compra: CompraPropuesta;
  /** Fecha y día de `ahora` en hora de Argentina. */
  fecha: FechaISO;
  dia: Dia;
}

interface Regla {
  causa: CausaDescarte;
  cumple: (promo: Promocion, ctx: ContextoDeCompra) => boolean;
}

/** La promo está vigente en `fecha` (FR-006). `YYYY-MM-DD` ordena como string igual que como fecha. */
export function vigenteEn(promo: Promocion, fecha: FechaISO): boolean {
  return promo.vigencia.desde <= fecha && fecha <= promo.vigencia.hasta;
}

/** Sin mayúsculas, sin acentos y sin espacios de más: "  COTO " = "coto". */
export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

export const REGLAS_DE_PROMOCION: readonly Regla[] = [
  { causa: "categoria", cumple: (p, { compra }) => p.categoriaId === compra.categoriaId },
  {
    causa: "comercio",
    // Sin comercio en la compra no se puede confirmar una promo de un comercio.
    cumple: (p, { compra }) =>
      p.comercio === null ||
      (compra.comercio !== null && normalizar(p.comercio) === normalizar(compra.comercio)),
  },
  {
    causa: "vigencia",
    cumple: (p, { fecha }) => vigenteEn(p, fecha),
  },
  { causa: "dia", cumple: (p, { dia }) => p.vigencia.dias === null || p.vigencia.dias.includes(dia) },
  {
    causa: "canal",
    cumple: (p, { compra }) => p.canal === null || p.canal === "ambos" || p.canal === compra.canal,
  },
  {
    causa: "jurisdiccion",
    cumple: (p) => p.jurisdiccion === null || JURISDICCIONES_VALIDAS.includes(p.jurisdiccion),
  },
  {
    causa: "monto_minimo",
    cumple: (p, { compra }) =>
      p.montoMinimo === null || aCentavos(compra.monto) >= aCentavos(p.montoMinimo),
  },
];

/** La causa de la primera regla que falla, o `null` si las cumple todas. */
export function primeraReglaQueFalla(
  promo: Promocion,
  ctx: ContextoDeCompra,
): CausaDescarte | null {
  return REGLAS_DE_PROMOCION.find((regla) => !regla.cumple(promo, ctx))?.causa ?? null;
}

/** Medios del mismo banco cuya red acepta la promo para su tipo de tarjeta (FR-005). */
export function mediosCompatibles(promo: Promocion, medios: MedioDePago[]): MedioDePago[] {
  return medios.filter(
    (m) => m.bancoId === promo.bancoId && promo.tarjetas[m.tipo].includes(m.red),
  );
}
