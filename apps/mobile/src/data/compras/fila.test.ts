import { describe, expect, it } from "vitest";
import { compraAFila } from "./fila";
import { ID_COMPRA, compraDePrueba } from "./prueba";

const MEDIO = "a1000000-0000-4000-8000-000000000001";
const PROMO = "d1000000-0000-4000-8000-000000000001";

describe("compraAFila (contracts/fila-compras.md)", () => {
  it("convierte una compra completa a la fila de public.compras", () => {
    const r = compraAFila(compraDePrueba(), { medioRemoto: MEDIO, promoRemota: PROMO });
    expect(r).toEqual({
      ok: true,
      fila: {
        id: ID_COMPRA,
        fecha: "2026-10-14",
        monto: 5000,
        comercio: "Coto",
        categoria_id: 1,
        medio_de_pago_id: MEDIO,
        promocion_id: PROMO,
        descuento_obtenido: null,
        reintegro_esperado: 1000,
        fecha_acreditacion_estimada: null,
        origen: "manual",
        texto_extraido: null,
      },
    });
  });

  it("sin promo, promocion_id es null y no hace falta el mapeo de promos", () => {
    const r = compraAFila(compraDePrueba({ promocionId: null, reintegroEsperado: null }), {
      medioRemoto: MEDIO,
      promoRemota: null,
    });
    expect(r.ok && r.fila.promocion_id).toBeNull();
    expect(r.ok).toBe(true);
  });

  it("la fila no lleva user_id: lo completa auth.uid()", () => {
    const r = compraAFila(compraDePrueba(), { medioRemoto: MEDIO, promoRemota: PROMO });
    expect(r.ok && "user_id" in r.fila).toBe(false);
  });

  it("sin correspondencia de medio queda bloqueada por medio (FR-017)", () => {
    expect(compraAFila(compraDePrueba(), { medioRemoto: null, promoRemota: PROMO })).toEqual({
      ok: false,
      motivo: "medio",
    });
  });

  it("con promo que no está en el corpus del servidor queda bloqueada por promo, no se sube sin promo", () => {
    expect(compraAFila(compraDePrueba(), { medioRemoto: MEDIO, promoRemota: null })).toEqual({
      ok: false,
      motivo: "promo",
    });
  });

  it("monto mayor a 0, comercio no vacío e id UUID: si no, es inválida", () => {
    const mapeo = { medioRemoto: MEDIO, promoRemota: PROMO };
    expect(compraAFila(compraDePrueba({ monto: 0 }), mapeo)).toEqual({ ok: false, motivo: "invalida" });
    expect(compraAFila(compraDePrueba({ monto: -5 }), mapeo)).toEqual({ ok: false, motivo: "invalida" });
    expect(compraAFila(compraDePrueba({ comercio: "   " }), mapeo)).toEqual({ ok: false, motivo: "invalida" });
    expect(compraAFila(compraDePrueba({ id: "n3" }), mapeo)).toEqual({ ok: false, motivo: "invalida" });
  });

  it("una inválida lo es aunque falte el mapeo (no espera algo que no va a servir)", () => {
    expect(compraAFila(compraDePrueba({ id: "n3" }), { medioRemoto: null, promoRemota: null })).toEqual({
      ok: false,
      motivo: "invalida",
    });
  });

  it("conserva el texto extraído y no lleva imagen", () => {
    const r = compraAFila(compraDePrueba({ origen: "ticket", textoExtraido: "TOTAL $5.000" }), {
      medioRemoto: MEDIO,
      promoRemota: PROMO,
    });
    expect(r.ok && r.fila.texto_extraido).toBe("TOTAL $5.000");
    expect(JSON.stringify(r)).not.toMatch(/imagen|image|base64|uri/i);
  });
});
