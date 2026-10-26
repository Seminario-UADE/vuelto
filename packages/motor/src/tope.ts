/**
 * Saldos de tope de las promos de una consulta (issue #37). Un saldo es lo
 * que se va consumiendo con las compras del período: propio de una promo o
 * compartido por las promos de un grupo. Se calculan una vez por consulta y
 * la issue #38 los reutiliza para «Mis topes».
 */
import { aCentavos, aCentesimosDePunto, aplicarPorcentaje } from "./dinero.ts";
import { vigenteEn } from "./elegibilidad.ts";
import { inicioDelPeriodo, type PeriodoAcumulable } from "./fecha.ts";
import type { BaseEstimacion, Compra, FechaISO, Promocion } from "./tipos.ts";

/** Importes en centavos. */
export interface Saldo {
  tope: number;
  periodo: PeriodoAcumulable;
  consumido: number;
  restante: number;
  base: BaseEstimacion;
}

/** Agrupa una sola vez las compras por promo, para no recorrerlas por cada promo. */
function comprasPorPromocion(compras: Compra[]): Map<string, Compra[]> {
  const porPromo = new Map<string, Compra[]>();
  for (const c of compras) {
    if (c.promocionId === null) continue;
    const lista = porPromo.get(c.promocionId);
    if (lista) lista.push(c);
    else porPromo.set(c.promocionId, [c]);
  }
  return porPromo;
}

/**
 * Consumo de las compras del período de las promos `miembros`. Una compra sin
 * descuento informado se estima con el porcentaje de su propia promo.
 */
function armarSaldo(
  tope: number,
  periodo: Saldo["periodo"],
  miembros: Promocion[],
  comprasDe: Map<string, Compra[]>,
  hoy: FechaISO,
): Saldo {
  const inicio = inicioDelPeriodo(periodo, hoy);
  let suma = 0;
  let registradas = 0;
  let sinDescuento = 0;
  for (const promo of miembros) {
    const centesimos = aCentesimosDePunto(promo.porcentaje);
    for (const c of comprasDe.get(promo.id) ?? []) {
      if (c.fecha < inicio || c.fecha > hoy) continue;
      registradas++;
      if (c.descuentoObtenido === null) {
        sinDescuento++;
        suma += Math.min(aplicarPorcentaje(aCentavos(c.monto), centesimos), tope);
      } else {
        suma += Math.max(aCentavos(c.descuentoObtenido), 0);
      }
    }
  }
  const consumido = Math.min(suma, tope);
  return {
    tope,
    periodo,
    consumido,
    restante: tope - consumido,
    base: { comprasRegistradas: registradas, comprasSinDescuentoInformado: sinDescuento },
  };
}

/** Comparte saldo con su grupo: compartida, con grupo y que no sea por compra (FR-001). */
function grupoDe(promo: Promocion): string | null {
  const { alcance, grupoTopeId, periodo } = promo.tope;
  return alcance === "compartido" && periodo !== "por_compra" ? grupoTopeId : null;
}

/**
 * Saldo de un grupo (FR-002): el menor tope y el período más largo entre los
 * miembros vigentes que informan tope. Los vencidos solo aportan sus compras.
 * `null` si ningún miembro vigente informa tope.
 */
function saldoDeGrupo(
  miembros: Promocion[],
  comprasDe: Map<string, Compra[]>,
  hoy: FechaISO,
): Saldo | null {
  const conTope = miembros.flatMap((m) =>
    vigenteEn(m, hoy) && m.tope.monto !== null ? [{ monto: m.tope.monto, periodo: m.tope.periodo }] : [],
  );
  if (conTope.length === 0) return null;
  const tope = Math.min(...conTope.map((m) => aCentavos(m.monto)));
  const periodo = conTope.some((m) => m.periodo !== "semanal") ? "mensual" : "semanal";
  return armarSaldo(tope, periodo, miembros, comprasDe, hoy);
}

/**
 * Saldo de cada promo que lo tiene, por id. Las promos de un mismo grupo
 * apuntan al mismo objeto. Una promo sin entrada no informa
 * tope, su tope es por compra o su grupo no tiene ningún miembro vigente con
 * tope. `hoy` es la fecha de la consulta en hora de Argentina.
 */
export function calcularSaldos(
  promociones: Promocion[],
  compras: Compra[],
  hoy: FechaISO,
): Map<string, Saldo> {
  const comprasDe = comprasPorPromocion(compras);
  const saldos = new Map<string, Saldo>();
  const grupos = new Map<string, Promocion[]>();
  for (const promo of promociones) {
    const grupo = grupoDe(promo);
    if (grupo === null) continue;
    const miembros = grupos.get(grupo);
    if (miembros) miembros.push(promo);
    else grupos.set(grupo, [promo]);
  }
  for (const miembros of grupos.values()) {
    const saldo = saldoDeGrupo(miembros, comprasDe, hoy);
    if (saldo) for (const m of miembros) saldos.set(m.id, saldo);
  }
  for (const promo of promociones) {
    // Por compra no acumula: cada compra tiene su propio límite (FR-007).
    if (grupoDe(promo) !== null || promo.tope.monto === null || promo.tope.periodo === "por_compra") continue;
    const periodo = promo.tope.periodo ?? "mensual";
    saldos.set(promo.id, armarSaldo(aCentavos(promo.tope.monto), periodo, [promo], comprasDe, hoy));
  }
  return saldos;
}
