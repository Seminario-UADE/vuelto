/**
 * Estimación del tope restante de cada saldo, con su base (issue #38), para
 * «Mis topes» (issue #45). Reutiliza los saldos de la issue #37. Contrato:
 * `specs/005-motor-estimar-topes/contracts/`.
 */
import { aCentavos, aPesos, pesos } from "./dinero.ts";
import { mediosCompatibles, vigenteEn } from "./elegibilidad.ts";
import {
  diaMesSinCeros,
  diaSiguiente,
  fechaArgentina,
  finDelPeriodo,
  inicioDelPeriodo,
  nombreDelMes,
} from "./fecha.ts";
import { compararIds } from "./orden.ts";
import { calcularSaldos, type Saldo } from "./tope.ts";
import type { Compra, EstimacionTope, Perfil, Promocion, TextoEstimacion } from "./tipos.ts";

export function estimarTopes(
  promociones: Promocion[],
  comprasDelPeriodo: Compra[],
  perfil: Perfil | null,
  ahora: Date,
): EstimacionTope[] {
  const hoy = fechaArgentina(ahora);
  const saldos = calcularSaldos(promociones, comprasDelPeriodo, hoy);

  // Las promos vigentes de cada saldo, por una clave explícita: el grupo, o
  // la promo si el saldo es propio.
  const porSaldo = new Map<string, { saldo: Saldo; vigentes: Promocion[] }>();
  for (const promo of promociones) {
    const saldo = saldos.get(promo.id);
    if (!saldo || !vigenteEn(promo, hoy)) continue;
    const clave = saldo.grupoTopeId !== null ? `grupo:${saldo.grupoTopeId}` : `promo:${promo.id}`;
    const entrada = porSaldo.get(clave);
    if (entrada) entrada.vigentes.push(promo);
    else porSaldo.set(clave, { saldo, vigentes: [promo] });
  }

  const estimaciones: { clave: string; estimacion: EstimacionTope }[] = [];
  for (const [clave, { saldo, vigentes }] of porSaldo) {
    const medios = perfil
      ? new Set(vigentes.flatMap((p) => mediosCompatibles(p, perfil.mediosDePago)).map((m) => m.id))
      : new Set<string>();
    if (perfil && medios.size === 0) continue;
    const bancos = new Set(vigentes.map((p) => p.bancoId));
    const estimacion: EstimacionTope = {
      grupoTopeId: saldo.grupoTopeId,
      bancoId: bancos.size === 1 ? (vigentes[0]?.bancoId ?? null) : null,
      promocionIds: vigentes.map((p) => p.id).sort(compararIds),
      mediosDePagoIds: [...medios].sort(compararIds),
      tope: aPesos(saldo.tope),
      consumido: aPesos(saldo.consumido),
      restante: aPesos(saldo.restante),
      base: saldo.base,
      periodo: {
        tipo: saldo.periodo,
        desde: inicioDelPeriodo(saldo.periodo, hoy),
        hasta: finDelPeriodo(saldo.periodo, hoy),
      },
    };
    estimaciones.push({ clave, estimacion });
  }

  // Por el id del grupo o de la promo (FR-006); si coinciden, la clave interna desempata.
  const visible = (e: EstimacionTope) => e.grupoTopeId ?? e.promocionIds[0] ?? "";
  return estimaciones
    .sort((a, b) => compararIds(visible(a.estimacion), visible(b.estimacion)) || compararIds(a.clave, b.clave))
    .map((e) => e.estimacion);
}

/** Centavos de una centena de pesos: la cifra se redondea hacia abajo a la centena (FR-009). */
const CENTAVOS_POR_CENTENA = 100 * 100;
/** "Queda poco" con el 20% del tope o menos (DESIGN.md §5, FR-008). */
const PORCENTAJE_QUEDA_POCO = 20;

/**
 * Estado, cifra y base de una estimación (FR-007 a FR-010), con los textos de
 * DESIGN.md §5. El estado se calcula en centavos con el restante exacto, no
 * con la cifra redondeada. La conversión desde pesos es exacta: los importes
 * de la estimación tienen a lo sumo dos decimales.
 */
export function formatearEstimacion(estimacion: EstimacionTope): TextoEstimacion {
  const restante = aCentavos(estimacion.restante);
  const tope = aCentavos(estimacion.tope);
  const compras = estimacion.base.comprasRegistradas;
  const semanal = estimacion.periodo.tipo === "semanal";
  const segun = `según ${compras} ${compras === 1 ? "compra" : "compras"} ${
    semanal ? "de esta semana" : `de ${nombreDelMes(estimacion.periodo.desde)}`
  }`;

  if (restante === 0) {
    const vuelve = diaMesSinCeros(diaSiguiente(estimacion.periodo.hasta));
    return { estado: "agotado", cifra: null, base: `${segun} · vuelve el ${vuelve}` };
  }
  if (compras === 0) {
    const cuando = semanal ? "esta semana" : "este mes";
    return {
      estado: "sin_compras",
      cifra: null,
      base: `Sin compras registradas ${cuando}: todavía no podemos estimar cuánto te queda.`,
    };
  }
  // Hacia abajo a la centena: nunca mostrar más tope del que queda.
  const centenas = Math.floor(restante / CENTAVOS_POR_CENTENA) * 100;
  return {
    estado: restante * 100 <= tope * PORCENTAJE_QUEDA_POCO ? "queda_poco" : "disponible",
    cifra: centenas === 0 ? "menos de $100" : `≈${pesos(centenas)}`,
    base: segun,
  };
}
