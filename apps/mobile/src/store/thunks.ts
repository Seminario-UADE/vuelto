/** Capa imperativa del store (ADR-009): lo que arma datos y despacha. */
import type { Compra } from "@vuelto/motor";
import { compraParaGuardar } from "../data/calculo";
import type { BorradorCompra } from "../data/contracts";
import { compraAgregada } from "./compras";
import type { AppThunk } from "./index";
import { selectEntradasMotor } from "./selectores";

/**
 * Guarda una compra (FR-008): el motor la evalúa con el estado de hoy y queda en `compras`,
 * así Topes, Mis compras y la próxima recomendación la cuentan. Falla con el mismo mensaje
 * que antes si falta el monto o el medio.
 */
export function guardarCompra(b: BorradorCompra): AppThunk<Compra> {
  return (dispatch, getState) => {
    const estado = getState();
    const ids = new Set(estado.compras.lista.map((c) => c.id));
    let n = estado.compras.lista.length + 1;
    while (ids.has(`n${n}`)) n++;
    const compra = compraParaGuardar(selectEntradasMotor(estado), b, `n${n}`);
    dispatch(compraAgregada(compra));
    return compra;
  };
}
