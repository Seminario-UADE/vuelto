import type { PeriodoAcumulable } from "@vuelto/motor";
import type { Base, Periodo } from "../data/contracts";

/** El período del motor en la vista; sin período, mensual como en el motor. */
export function periodoDeVista(periodo: PeriodoAcumulable | null): Periodo {
  return periodo === "semanal" ? "semana" : "mes";
}

/** "esta semana" o "este mes". */
export function estePeriodo(periodo: Periodo): string {
  return periodo === "semana" ? "esta semana" : "este mes";
}

/**
 * Texto de la base de un estimado (Principio V), en un solo lugar. Lo usan el adaptador
 * de la Edge Function y el servidor simulado.
 */
export function textoBase(cantidad: number, periodo: Periodo, mes: string): Base {
  if (cantidad === 0) {
    return { tipo: "sin-compras", texto: `Sin compras registradas ${estePeriodo(periodo)}: todavía no podemos estimar cuánto te queda.` };
  }
  const compras = `${cantidad} ${cantidad === 1 ? "compra" : "compras"}`;
  return {
    tipo: "compras",
    cantidad,
    periodo,
    texto: periodo === "mes" ? `según ${compras} de ${mes}` : `según ${compras} esta semana`,
  };
}
