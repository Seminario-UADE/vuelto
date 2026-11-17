/**
 * Qué hace «Confirmar» en el resultado del grupo (issue #138, hallazgo G-09). Decisión del PO
 * (17/11/2026, ADR-008 §6): si paga «Vos», queda una compra por confirmar con el medio recomendado,
 * igual que «Voy a pagar con…» en la compra individual (spec 012); si paga otro, no se crea nada:
 * cada uno registra lo suyo. Funciones puras (ADR-009); el thunk que despacha está en `store/thunks.ts`.
 */
import type { CompraPorConfirmar } from "../data/por-confirmar";
import type { PedidoGrupo, RecomendacionGrupo } from "../data/contracts";

/**
 * La compra por confirmar de quien paga «Vos», o `null` si no hay nada que crear (paga otro, nadie
 * paga, o falta el medio). El monto es el de la compra entera —la pagás vos— y el rubro y el canal
 * son los del pedido, así Revisá la propone como se recomendó. El reloj entra como `ahora`.
 */
export function porConfirmarDeGrupo(
  g: Pick<RecomendacionGrupo, "quienPaga" | "medioPropioId">,
  pedido: Pick<PedidoGrupo, "comercio" | "canal" | "monto">,
  contexto: { id: string; usuarioId: string; ahora: string },
): CompraPorConfirmar | null {
  if (!g.quienPaga?.esVos || g.medioPropioId === null) return null;
  return {
    id: contexto.id,
    usuarioId: contexto.usuarioId,
    comercioId: pedido.comercio.id,
    comercioNombre: pedido.comercio.nombre,
    medioId: g.medioPropioId,
    monto: pedido.monto,
    creadaEn: contexto.ahora,
    canal: pedido.canal,
    categoriaId: pedido.comercio.categoriaId,
  };
}

/** El texto del botón del pie: no promete confirmar nada cuando paga otro. */
export function etiquetaDeConfirmar(g: Pick<RecomendacionGrupo, "quienPaga">): string {
  if (!g.quienPaga) return "Listo";
  return g.quienPaga.esVos ? "Voy a pagar yo" : "Listo";
}

/**
 * El aviso al tocar el botón. Con «Vos», dice qué quedó y dónde; si reemplazó otra del mismo
 * comercio, lo mismo que la compra individual (FR-012). Con otro, aclara que Vuelto no anota nada
 * por vos ni por él (ADR-008 §6) y que cada uno registra la suya.
 */
export function avisoDeConfirmar(
  g: Pick<RecomendacionGrupo, "quienPaga" | "medio" | "comercio">,
  resultado: { creada: boolean; reemplazo: boolean },
): string | null {
  if (!g.quienPaga) return null;
  if (g.quienPaga.esVos) {
    if (!resultado.creada) return null;
    return resultado.reemplazo
      ? `Actualizamos tu compra en ${g.comercio.nombre}.`
      : `Quedó por confirmar en Inicio: pagás vos con ${g.medio}.`;
  }
  return `Paga ${g.quienPaga.nombre} con ${g.medio}. Cada uno registra lo suyo: Vuelto no anota nada por vos.`;
}
