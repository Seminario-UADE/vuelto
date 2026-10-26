/**
 * Estimación del tope restante de cada saldo, con su base (issue #38), para
 * «Mis topes» (issue #45). Reutiliza los saldos de la issue #37. Contrato:
 * `specs/005-motor-estimar-topes/contracts/`.
 */
import { aCentavos, aPesos } from "./dinero.ts";
import { mediosCompatibles, vigenteEn } from "./elegibilidad.ts";
import { diaSiguiente, fechaArgentina, finDelPeriodo, inicioDelPeriodo, nombreDelMes } from "./fecha.ts";
import { pesos } from "./motivos.ts";
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

  // Las promos vigentes de cada saldo: las de un grupo comparten el mismo objeto.
  const vigentesDe = new Map<Saldo, Promocion[]>();
  for (const promo of promociones) {
    const saldo = saldos.get(promo.id);
    if (!saldo || !vigenteEn(promo, hoy)) continue;
    const lista = vigentesDe.get(saldo);
    if (lista) lista.push(promo);
    else vigentesDe.set(saldo, [promo]);
  }

  const estimaciones: EstimacionTope[] = [];
  for (const [saldo, vigentes] of vigentesDe) {
    const medios = perfil
      ? new Set(vigentes.flatMap((p) => mediosCompatibles(p, perfil.mediosDePago)).map((m) => m.id))
      : new Set<string>();
    if (perfil && medios.size === 0) continue;
    const bancos = new Set(vigentes.map((p) => p.bancoId));
    estimaciones.push({
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
    });
  }

  const clave = (e: EstimacionTope) => e.grupoTopeId ?? e.promocionIds[0] ?? "";
  return estimaciones.sort((a, b) => compararIds(clave(a), clave(b)));
}

/** `"2026-11-01"` → `"1/11"`, sin ceros a la izquierda. */
function diaYMes(fecha: string): string {
  return `${Number(fecha.slice(8, 10))}/${Number(fecha.slice(5, 7))}`;
}

/**
 * Estado, cifra y base de una estimación (FR-007 a FR-010), con los textos de
 * DESIGN.md §5. El estado usa los importes exactos en centavos, así el
 * redondeo de la cifra no lo cambia.
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
    const vuelve = diaYMes(diaSiguiente(estimacion.periodo.hasta));
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
  const centenas = Math.floor(restante / 10000) * 100;
  return {
    estado: restante * 5 <= tope ? "queda_poco" : "disponible",
    cifra: centenas === 0 ? "menos de $100" : `≈${pesos(centenas)}`,
    base: segun,
  };
}
