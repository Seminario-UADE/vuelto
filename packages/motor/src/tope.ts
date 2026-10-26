/**
 * Saldos de tope de las promos de una consulta (issue #37). Un saldo es lo
 * que se va consumiendo con las compras del período: propio de una promo o
 * compartido por las promos de un grupo. Se calculan una vez por consulta y
 * la issue #38 los reutiliza para «Mis topes».
 */
import { aCentavos, aCentesimosDePunto, aplicarPorcentaje } from "./dinero.ts";
import { vigenteEn } from "./elegibilidad.ts";
import { inicioDelPeriodo } from "./fecha.ts";
import type { BaseEstimacion, Compra, FechaISO, PeriodoAcumulable, Promocion } from "./tipos.ts";

/**
 * Qué tope tiene una promo (FR-012 de la issue #38): la única lectura de
 * `promo.tope` en el motor. Importes en centavos. `grupo` es el
 * `grupoTopeId` solo si la promo es miembro de su grupo (FR-001 de la issue
 * #37); una sin monto informado puede ser miembro: aporta sus compras.
 */
export type ClaseDeTope =
  | { tipo: "sin_tope"; grupo: string | null }
  | { tipo: "por_compra"; monto: number }
  | { tipo: "acumulable"; monto: number; periodo: PeriodoAcumulable; grupo: string | null };

export function clasificarTope(promo: Promocion): ClaseDeTope {
  const { monto, periodo, alcance, grupoTopeId } = promo.tope;
  if (periodo === "por_compra") {
    return monto === null ? { tipo: "sin_tope", grupo: null } : { tipo: "por_compra", monto: aCentavos(monto) };
  }
  const grupo = alcance === "compartido" ? grupoTopeId : null;
  if (monto === null) return { tipo: "sin_tope", grupo };
  return { tipo: "acumulable", monto: aCentavos(monto), periodo: periodo ?? "mensual", grupo };
}

/** Importes en centavos. */
export interface Saldo {
  /** `null` si el saldo es propio de una promo. */
  grupoTopeId: string | null;
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
  grupoTopeId: string | null,
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
    grupoTopeId,
    tope,
    periodo,
    consumido,
    restante: tope - consumido,
    base: { comprasRegistradas: registradas, comprasSinDescuentoInformado: sinDescuento },
  };
}

function grupoDe(promo: Promocion): string | null {
  const clase = clasificarTope(promo);
  return clase.tipo === "por_compra" ? null : clase.grupo;
}

/**
 * Saldo de un grupo (FR-002): el menor tope y el período más largo entre los
 * miembros vigentes que informan tope. Los vencidos solo aportan sus compras.
 * `null` si ningún miembro vigente informa tope.
 */
function saldoDeGrupo(
  grupoTopeId: string,
  miembros: Promocion[],
  comprasDe: Map<string, Compra[]>,
  hoy: FechaISO,
): Saldo | null {
  const conTope = miembros.flatMap((m) => {
    const clase = clasificarTope(m);
    return vigenteEn(m, hoy) && clase.tipo === "acumulable" ? [clase] : [];
  });
  if (conTope.length === 0) return null;
  const tope = Math.min(...conTope.map((c) => c.monto));
  const periodo = conTope.some((c) => c.periodo === "mensual") ? "mensual" : "semanal";
  return armarSaldo(grupoTopeId, tope, periodo, miembros, comprasDe, hoy);
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
  for (const [grupo, miembros] of grupos) {
    const saldo = saldoDeGrupo(grupo, miembros, comprasDe, hoy);
    if (saldo) for (const m of miembros) saldos.set(m.id, saldo);
  }
  for (const promo of promociones) {
    // Sin tope o por compra no tienen saldo propio: por compra no acumula (FR-007).
    const clase = clasificarTope(promo);
    if (clase.tipo !== "acumulable" || clase.grupo !== null) continue;
    saldos.set(promo.id, armarSaldo(null, clase.monto, clase.periodo, [promo], comprasDe, hoy));
  }
  return saldos;
}
