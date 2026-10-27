import type { Base, Periodo } from "../data/contracts";

/**
 * Texto de la base de un estimado (Principio V), en un solo lugar. Lo usan el adaptador
 * de la Edge Function y el servidor simulado.
 */
export function textoBase(cantidad: number, periodo: Periodo, mes: string): Base {
  if (cantidad === 0) {
    const cuando = periodo === "semana" ? "esta semana" : "este mes";
    return { tipo: "sin-compras", texto: `Sin compras registradas ${cuando}: todavía no podemos estimar cuánto te queda.` };
  }
  const compras = `${cantidad} ${cantidad === 1 ? "compra" : "compras"}`;
  return {
    tipo: "compras",
    cantidad,
    periodo,
    texto: periodo === "mes" ? `según ${compras} de ${mes}` : `según ${compras} esta semana`,
  };
}
