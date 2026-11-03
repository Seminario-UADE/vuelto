/**
 * `compraAFila` (spec 010, FR-017, contracts/fila-compras.md): la compra de la app convertida
 * a la fila de `public.compras`. Función pura, sin red ni reloj.
 */
import type { Compra } from "@vuelto/motor";
import { esUuid } from "./ejemplo";

/** La fila sin `user_id`: lo completa el default `auth.uid()` y lo valida la policy `compras_dueno`. */
export type FilaCompra = {
  id: string;
  fecha: string;
  monto: number;
  comercio: string;
  categoria_id: number | null;
  medio_de_pago_id: string;
  promocion_id: string | null;
  descuento_obtenido: number | null;
  reintegro_esperado: number | null;
  fecha_acreditacion_estimada: string | null;
  origen: "ticket" | "excepcion" | "manual";
  texto_extraido: string | null;
};

export type Mapeo = {
  /** uuid de `medios_de_pago` del usuario, o `null` si todavía no tiene correspondencia. */
  medioRemoto: string | null;
  /** uuid de `promociones` del corpus del servidor, o `null` si la promo no está allá. */
  promoRemota: string | null;
};

export type ResultadoFila =
  | { ok: true; fila: FilaCompra }
  | { ok: false; motivo: "medio" | "promo" | "invalida" };

const ORIGENES = ["ticket", "excepcion", "manual"] as const;

export function compraAFila(compra: Compra, mapeo: Mapeo): ResultadoFila {
  // Lo inválido nunca se va a poder subir: se dice primero, antes de esperar un mapeo.
  const comercio = compra.comercio.trim();
  if (
    !esUuid(compra.id) ||
    !(compra.monto > 0) ||
    comercio === "" ||
    !ORIGENES.includes(compra.origen)
  ) {
    return { ok: false, motivo: "invalida" };
  }
  if (mapeo.medioRemoto === null) return { ok: false, motivo: "medio" };
  // No se sube sin promo: cambiaría los topes que ve otro dispositivo.
  if (compra.promocionId !== null && mapeo.promoRemota === null) return { ok: false, motivo: "promo" };
  return {
    ok: true,
    fila: {
      id: compra.id,
      fecha: compra.fecha,
      monto: compra.monto,
      comercio,
      categoria_id: compra.categoriaId,
      medio_de_pago_id: mapeo.medioRemoto,
      promocion_id: compra.promocionId === null ? null : mapeo.promoRemota,
      descuento_obtenido: compra.descuentoObtenido,
      reintegro_esperado: compra.reintegroEsperado,
      fecha_acreditacion_estimada: compra.fechaAcreditacionEstimada,
      origen: compra.origen,
      texto_extraido: compra.textoExtraido,
    },
  };
}
