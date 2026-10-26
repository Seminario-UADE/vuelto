/**
 * Estimación del tope restante de cada saldo, con su base (issue #38), para
 * «Mis topes» (issue #45). Reutiliza los saldos de la issue #37. Contrato:
 * `specs/005-motor-estimar-topes/contracts/`.
 */
import { aPesos } from "./dinero.ts";
import { mediosCompatibles, vigenteEn } from "./elegibilidad.ts";
import { fechaArgentina, finDelPeriodo, inicioDelPeriodo } from "./fecha.ts";
import { compararIds } from "./orden.ts";
import { calcularSaldos, type Saldo } from "./tope.ts";
import type { Compra, EstimacionTope, Perfil, Promocion } from "./tipos.ts";

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
