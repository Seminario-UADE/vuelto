import { describe, expect, it } from "vitest";
import { filaACompra, filaAConsumo, filaAMedio, filaAPromocion, type FilaCompra, type FilaPromocion } from "./filas.ts";

const fila = (datos: Partial<FilaPromocion> = {}): FilaPromocion => ({
  id: "p1",
  fuente: "modo",
  titulo: "20% en gastronomía",
  banco_id: "b1",
  categoria_id: 2,
  comercio: null,
  porcentaje: "20.00",
  debito_redes: [],
  credito_redes: ["visa"],
  vigencia_desde: "2026-11-01",
  vigencia_hasta: "2026-11-30",
  dias: ["sab"],
  tope_monto: "5000",
  tope_periodo: "mensual",
  tope_alcance: null,
  grupo_tope_id: null,
  monto_minimo: null,
  jurisdiccion: null,
  canal: null,
  acumulable: null,
  dada_de_baja_en: null,
  ...datos,
});

describe("filaAPromocion", () => {
  it("numeric como texto o número, nulos explícitos", () => {
    expect(filaAPromocion(fila())).toMatchObject({
      id: "p1",
      porcentaje: 20,
      tope: { monto: 5000, periodo: "mensual", alcance: null, grupoTopeId: null },
      montoMinimo: null,
      vigencia: { desde: "2026-11-01", hasta: "2026-11-30", dias: ["sab"] },
    });
    expect(filaAPromocion(fila({ porcentaje: 15, tope_monto: null }))?.tope.monto).toBeNull();
  });

  it("una promo dada de baja vence el día anterior (hora de Argentina)", () => {
    expect(filaAPromocion(fila({ dada_de_baja_en: "2026-11-10T02:00:00Z" }))?.vigencia.hasta).toBe("2026-11-08");
  });

  it("una fila que no cumple el contrato del motor se descarta", () => {
    expect(filaAPromocion(fila({ porcentaje: "veinte" }))).toBeNull();
    expect(filaAPromocion(fila({ porcentaje: 120 }))).toBeNull();
    expect(filaAPromocion(fila({ credito_redes: ["amex"] }))).toBeNull();
    expect(filaAPromocion(fila({ tope_periodo: "anual" }))).toBeNull();
    expect(filaAPromocion(fila({ vigencia_desde: "1/11/2026" }))).toBeNull();
    expect(filaAPromocion(fila({ dias: ["sabado"] }))).toBeNull();
    expect(filaAPromocion(fila({ tope_monto: "" }))).toBeNull();
  });
});

describe("filaAMedio", () => {
  it("mapea y descarta tipos o redes desconocidas", () => {
    expect(filaAMedio({ id: "m1", banco_id: "b1", tipo: "credito", red: "visa", banco_nombre: "Banco" })).toEqual({
      id: "m1",
      bancoId: "b1",
      tipo: "credito",
      red: "visa",
    });
    expect(filaAMedio({ id: "m1", banco_id: "b1", tipo: "prepaga", red: "visa" })).toBeNull();
    expect(filaAMedio({ id: "m1", banco_id: "b1", tipo: "debito", red: "amex" })).toBeNull();
  });
});

describe("filaAConsumo y filaACompra", () => {
  it("el consumo lleva el id que le dan, no el de la base", () => {
    expect(filaAConsumo({ promocion_id: "p1", fecha: "2026-11-05", monto: "1000.00", descuento_obtenido: "200" }, "c1")).toEqual({
      id: "c1",
      promocionId: "p1",
      fecha: "2026-11-05",
      monto: 1000,
      descuentoObtenido: 200,
    });
    expect(filaAConsumo({ promocion_id: null, fecha: "2026-11-05", monto: 1000, descuento_obtenido: null }, "c2")?.descuentoObtenido).toBeNull();
    expect(filaAConsumo({ promocion_id: "p1", fecha: "ayer", monto: 1000, descuento_obtenido: null }, "c3")).toBeNull();
    expect(filaAConsumo({ promocion_id: "p1", fecha: "2026-11-05", monto: "x", descuento_obtenido: null }, "c4")).toBeNull();
  });

  it("la compra propia se mapea entera", () => {
    const f: FilaCompra = {
      id: "k1",
      fecha: "2026-11-05",
      monto: "1000",
      comercio: "Coto",
      categoria_id: 1,
      medio_de_pago_id: "m1",
      promocion_id: "p1",
      descuento_obtenido: null,
      reintegro_esperado: null,
      fecha_acreditacion_estimada: null,
      origen: "ticket",
      texto_extraido: null,
    };
    expect(filaACompra(f)).toMatchObject({ id: "k1", monto: 1000, origen: "ticket", medioDePagoId: "m1" });
    expect(filaACompra({ ...f, origen: "otro" })).toBeNull();
    expect(filaACompra({ ...f, reintegro_esperado: "x" })).toBeNull();
  });
});
