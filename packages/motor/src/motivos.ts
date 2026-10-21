/**
 * Textos de motivo por plantilla, nunca de un LLM (constitución §II).
 * Tono de `docs/design/DESIGN.md` §8; la redacción final es de la issue #46.
 */
import { CATEGORIAS_MODO } from "./categorias";
import type { Dia, Promocion } from "./tipos";

const NOMBRE_DIA: Record<Dia, string> = {
  lun: "lunes",
  mar: "martes",
  mie: "miércoles",
  jue: "jueves",
  vie: "viernes",
  sab: "sábados",
  dom: "domingos",
};

function nombreCategoria(promo: Promocion): string {
  const categoria = CATEGORIAS_MODO.find((c) => c.id === promo.categoriaId);
  return categoria ? categoria.nombre.toLowerCase() : "esta categoría";
}

function enumerar(partes: string[]): string {
  return partes.length <= 1
    ? partes.join("")
    : `${partes.slice(0, -1).join(", ")} y ${partes[partes.length - 1]}`;
}

/** "33.3" → "33,3%". */
function porcentaje(promo: Promocion): string {
  return `${String(promo.porcentaje).replace(".", ",")}%`;
}

/** Ej.: "20% en supermercados los miércoles · la promo no informa tope". */
export function motivoOpcion(promo: Promocion): string {
  const lugar = promo.comercio ?? nombreCategoria(promo);
  const dias = promo.vigencia.dias
    ? ` los ${enumerar(promo.vigencia.dias.map((d) => NOMBRE_DIA[d]))}`
    : "";
  const sinTope = promo.tope.monto === null ? " · la promo no informa tope" : "";
  return `${porcentaje(promo)} en ${lugar}${dias}${sinTope}`;
}
