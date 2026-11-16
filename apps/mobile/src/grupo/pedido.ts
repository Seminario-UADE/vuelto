/**
 * Del grupo que arma Armar al pedido que va a `recomendar-grupo` (spec 016, FR-024): sin fecha
 * (la pone el servidor) y con la cantidad de integrantes sin cuenta, no sus nombres (D5).
 */
import type { PedidoGrupo } from "../data/contracts";
import type { PedidoRecomendarGrupo } from "./repositorio";

export function pedidoParaServidor(p: PedidoGrupo): PedidoRecomendarGrupo {
  return {
    compra: { comercio: p.comercio.nombre, categoriaId: p.comercio.categoriaId, canal: p.canal, monto: p.monto },
    contactos: p.contactos,
    sinCuenta: p.sinCuenta.length,
  };
}

/** Cuántas personas hay en el grupo, quien pide incluido. */
export function cantidadDeIntegrantes(p: Pick<PedidoGrupo, "contactos" | "sinCuenta">): number {
  return 1 + p.contactos.length + p.sinCuenta.length;
}
