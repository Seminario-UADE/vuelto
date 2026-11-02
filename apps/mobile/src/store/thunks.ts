/** Capa imperativa del store (ADR-009): lo que arma datos y despacha. */
import type { Compra } from "@vuelto/motor";
import { compraParaGuardar } from "../data/calculo";
import type { BorradorCompra } from "../data/contracts";
import { compraAgregada, compraEliminada } from "./compras";
import type { AppThunk } from "./index";
import { selectEntradasMotor } from "./selectores";

/**
 * Guarda una compra (FR-008): el motor la evalúa con el estado de hoy y queda en `compras`,
 * así Topes, Mis compras y la próxima recomendación la cuentan. Falla con el mismo mensaje
 * que antes si falta el monto o el medio.
 */
export function guardarCompra(b: BorradorCompra): AppThunk<Compra> {
  return (dispatch, getState, { generarId }) => {
    const compra = compraParaGuardar(selectEntradasMotor(getState()), b, generarId());
    dispatch(compraAgregada(compra));
    return compra;
  };
}

/**
 * Borra una compra (spec 010, FR-002): sale de `compras` y los topes y totales se recalculan
 * solos. Devuelve la compra borrada, o `null` si no existía.
 */
export function eliminarCompra(id: string): AppThunk<Compra | null> {
  return (dispatch, getState) => {
    const compra = getState().compras.lista.find((c) => c.id === id) ?? null;
    if (compra === null) return null;
    dispatch(compraEliminada(id));
    return compra;
  };
}
