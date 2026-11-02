/**
 * Textos de motivo por plantilla, nunca de un LLM (constitución §II).
 * Tono y textos de `docs/design/DESIGN.md` §5 y §8 (issue #46): toda cifra
 * de tope lleva ≈ y su base.
 */
import { CATEGORIAS_MODO } from "./categorias.ts";
import { aPesos, pesos } from "./dinero.ts";
import { diaMesConCeros, nombreDelMes } from "./fecha.ts";
import type { ContextoDeCompra } from "./elegibilidad.ts";
import { clasificarTope, type Saldo } from "./tope.ts";
import type { CausaDescarte, Dia, FechaISO, PeriodoAcumulable, Promocion } from "./tipos.ts";

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

function textoDias(promo: Promocion): string {
  return promo.vigencia.dias ? ` los ${enumerar(promo.vigencia.dias.map((d) => NOMBRE_DIA[d]))}` : "";
}

/** "20% en supermercados los miércoles". */
function queDa(promo: Promocion): string {
  return `${porcentaje(promo)} en ${promo.comercio ?? nombreCategoria(promo)}${textoDias(promo)}`;
}

/** Centavos de una centena de pesos: la cifra se redondea hacia abajo a la centena. */
const CENTAVOS_POR_CENTENA = 100 * 100;

/** "≈$6.500", hacia abajo a la centena: nunca mostrar más tope del que queda. */
export function cifraDeTope(restanteCentavos: number): string {
  const centenas = Math.floor(restanteCentavos / CENTAVOS_POR_CENTENA) * 100;
  return centenas === 0 ? "menos de $100" : `≈${pesos(centenas)}`;
}

function textoCompras(n: number): string {
  return `${n} ${n === 1 ? "compra" : "compras"}`;
}

/** "este mes" o "esta semana". */
export function estePeriodo(periodo: PeriodoAcumulable): string {
  return periodo === "semanal" ? "esta semana" : "este mes";
}

/** "según 3 compras de octubre" o "según 1 compra de esta semana". */
export function textoSegun(comprasRegistradas: number, periodo: PeriodoAcumulable, fecha: FechaISO): string {
  const cuando = periodo === "semanal" ? "de esta semana" : `de ${nombreDelMes(fecha)}`;
  return `según ${textoCompras(comprasRegistradas)} ${cuando}`;
}

/** Lo que los textos necesitan de un saldo: en qué se apoya y de qué período es. */
export type BaseDelSaldo = Pick<Saldo, "base" | "periodo">;

/** El saldo de una promo después de la compra, para el motivo de la opción. */
export interface TopeTrasCompra {
  /** En centavos. */
  restante: number;
  saldo: BaseDelSaldo;
  /** Fecha de la consulta, para el nombre del mes. */
  fecha: FechaISO;
}

function textoTope(promo: Promocion, tope: TopeTrasCompra | null): string {
  const clase = clasificarTope(promo);
  if (clase.tipo === "sin_tope") return " · la promo no informa tope";
  if (clase.tipo === "por_compra") return ` · hasta ${pesos(aPesos(clase.monto))} por compra`;
  // Una promo con tope por período siempre tiene saldo en `recomendar`; sin
  // él no hay cifra ni base que mostrar.
  if (!tope) return "";
  const { base, periodo } = tope.saldo;
  // Sin compras que la sostengan, no hay cifra (DESIGN.md §5).
  if (base.comprasRegistradas === 0) {
    return ` · sin compras registradas ${estePeriodo(periodo)}, todavía no podemos estimar cuánto tope te queda`;
  }
  const segun = textoSegun(base.comprasRegistradas, periodo, tope.fecha);
  return tope.restante === 0
    ? ` · con esta compra usás todo el tope que te queda, ${segun}`
    : ` · te quedan ${cifraDeTope(tope.restante)} de tope, ${segun}`;
}

/**
 * Ej.: "20% en supermercados los miércoles · te quedan ≈$1.600 de tope,
 * según 3 compras de octubre". `tope` es el saldo tras la compra, `null` si
 * la promo no tiene saldo.
 */
export function motivoOpcion(promo: Promocion, tope: TopeTrasCompra | null): string {
  return `${queDa(promo)}${textoTope(promo, tope)}`;
}

/** Una promo dentro de una opción combinada, con su saldo tras la compra. */
export interface ParteDelMotivo {
  promo: Promocion;
  tope: TopeTrasCompra | null;
  /** Quedó en $0 porque otra promo de la misma opción agotó el tope compartido (FR-010). */
  sinSaldo: boolean;
}

/** Opción con varias promos acumulables: el motivo de cada una, en orden (FR-014). */
export function motivoCombinado(partes: ParteDelMotivo[]): string {
  return partes
    .map(({ promo, tope, sinSaldo }) =>
      sinSaldo
        ? `${queDa(promo)} (sin tope disponible: lo usa otra promoción de este banco)`
        : motivoOpcion(promo, tope),
    )
    .join(" + ");
}

/**
 * Por qué una promo no sirve para esta compra, una plantilla por causa.
 * `saldo` solo con `tope_agotado`, para decir el período y la base.
 */
export function motivoDescarte(
  causa: CausaDescarte,
  promo: Promocion,
  { compra, fecha }: ContextoDeCompra,
  saldo: BaseDelSaldo | null = null,
): string {
  switch (causa) {
    case "categoria":
      return `La promo es para ${nombreCategoria(promo)}`;
    case "comercio":
      return `La promo es solo en ${promo.comercio ?? "otro comercio"}`;
    case "vigencia":
      return fecha < promo.vigencia.desde
        ? `La promo empieza el ${diaMesConCeros(promo.vigencia.desde)}`
        : `La promo venció el ${diaMesConCeros(promo.vigencia.hasta)}`;
    case "dia":
      return `Hoy no aplica, la promo es${textoDias(promo)}`;
    case "canal":
      return compra.canal === "presencial" ? "La promo es solo online" : "La promo es solo presencial";
    case "jurisdiccion":
      return "La promo no es válida en tu jurisdicción";
    case "monto_minimo":
      return `La promo pide una compra mínima de ${pesos(promo.montoMinimo ?? 0)}`;
    case "medio_de_pago":
      return "La promo es para un banco o una tarjeta que no tenés en tu perfil";
    case "tope_agotado":
      return saldo
        ? `Tope agotado ${estePeriodo(saldo.periodo)}, según ${textoCompras(saldo.base.comprasRegistradas)}`
        : "Tope agotado";
  }
}
