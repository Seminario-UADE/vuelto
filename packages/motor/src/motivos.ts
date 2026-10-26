/**
 * Textos de motivo por plantilla, nunca de un LLM (constitución §II).
 * Tono de `docs/design/DESIGN.md` §8; la redacción final es de la issue #46.
 */
import { CATEGORIAS_MODO } from "./categorias.ts";
import type { ContextoDeCompra } from "./elegibilidad.ts";
import type { CausaDescarte, Dia, FechaISO, Promocion } from "./tipos.ts";

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

/** "2026-10-20" → "20/10". */
function diaYMes(fecha: FechaISO): string {
  return `${fecha.slice(8, 10)}/${fecha.slice(5, 7)}`;
}

/** 20000 → "$20.000"; 1500.5 → "$1.500,50". Sin `toLocaleString`: depende del runtime. */
function pesos(monto: number): string {
  const [entero = "0", decimales = "00"] = monto.toFixed(2).split(".");
  const conMiles = entero.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return decimales === "00" ? `$${conMiles}` : `$${conMiles},${decimales}`;
}

function textoDias(promo: Promocion): string {
  return promo.vigencia.dias ? ` los ${enumerar(promo.vigencia.dias.map((d) => NOMBRE_DIA[d]))}` : "";
}

/** Ej.: "20% en supermercados los miércoles · la promo no informa tope". */
export function motivoOpcion(promo: Promocion): string {
  const lugar = promo.comercio ?? nombreCategoria(promo);
  const tope =
    promo.tope.monto === null
      ? " · la promo no informa tope"
      : promo.tope.periodo === "por_compra"
        ? ` · hasta ${pesos(promo.tope.monto)} por compra`
        : "";
  return `${porcentaje(promo)} en ${lugar}${textoDias(promo)}${tope}`;
}

/**
 * Opción con varias promos acumulables: el motivo de cada una, en orden
 * (FR-014). `sinSaldo` son las que quedaron en $0 porque otra de la misma
 * opción agotó el tope compartido (FR-010).
 */
export function motivoCombinado(promos: Promocion[], sinSaldo: ReadonlySet<string> = new Set()): string {
  return promos
    .map((p) =>
      sinSaldo.has(p.id)
        ? `${motivoOpcion(p)} (el tope compartido se agota con la otra promo)`
        : motivoOpcion(p),
    )
    .join(" + ");
}

/** Por qué una promo no sirve para esta compra, una plantilla por causa. */
export function motivoDescarte(
  causa: CausaDescarte,
  promo: Promocion,
  { compra, fecha }: ContextoDeCompra,
): string {
  switch (causa) {
    case "categoria":
      return `La promo es para ${nombreCategoria(promo)}`;
    case "comercio":
      return `La promo es solo en ${promo.comercio ?? "otro comercio"}`;
    case "vigencia":
      return fecha < promo.vigencia.desde
        ? `La promo empieza el ${diaYMes(promo.vigencia.desde)}`
        : `La promo venció el ${diaYMes(promo.vigencia.hasta)}`;
    case "dia":
      return `Hoy no aplica: la promo es${textoDias(promo)}`;
    case "canal":
      return compra.canal === "presencial" ? "La promo es solo online" : "La promo es solo presencial";
    case "jurisdiccion":
      return "La promo no es válida en tu jurisdicción";
    case "monto_minimo":
      return `La promo pide una compra mínima de ${pesos(promo.montoMinimo ?? 0)}`;
    case "medio_de_pago":
      return "La promo es para un banco o una tarjeta que no tenés en tu perfil";
    case "tope_agotado":
      return "Tope agotado";
  }
}
