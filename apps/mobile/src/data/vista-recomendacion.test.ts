import { describe, expect, it } from "vitest";
import type { Comercio, MedioDePago, PedidoRecomendar, RespuestaRecomendar } from "./contracts";
import { aVista, textoBase } from "./vista-recomendacion";

// El adaptador recibe la respuesta tal como la devuelve la Edge Function (ejemplo 200 de
// specs/004-recomendar-pantalla/contracts/recomendar.md) y no inventa cifras.

const galicia: MedioDePago = {
  id: "mp-galicia-credito-visa",
  banco: "Galicia",
  nombre: "Galicia Visa crédito",
  nombreCorto: "Galicia",
  detalle: "Crédito · Banco Galicia",
  inicial: "G",
  conCobertura: true,
};
const kansas: Comercio = { id: "kansas", nombre: "Kansas", inicial: "K", rubro: "gastronomia", categoriaId: 2, frecuente: false };
const catalogos = {
  medios: [galicia],
  promociones: [
    { id: "promo-kansas-20", titulo: "Galicia: 20% en Kansas", bancoId: "Galicia", categoriaId: 2 },
    { id: "promo-viernes", titulo: "Galicia: 15% los viernes", bancoId: "Galicia", categoriaId: 2 },
  ],
  mes: "octubre",
  dia: "hoy miércoles",
};
const ejemplo: RespuestaRecomendar = {
  mejor: {
    medioDePagoId: "mp-galicia-credito-visa",
    ahorroEstimado: 3000,
    promociones: [
      {
        promocionId: "promo-kansas-20",
        ahorroEstimado: 3000,
        topeRestanteTrasCompra: 7000,
        base: { comprasRegistradas: 2, comprasSinDescuentoInformado: 0 },
      },
    ],
    motivo: "20% en Kansas",
  },
  alternativas: [],
  descartadas: [{ promocionId: "promo-viernes", causa: "dia", base: null, motivo: "Hoy no aplica: la promo es los viernes" }],
};
const pedido: PedidoRecomendar = { comercio: "Kansas", categoriaId: 2, monto: 15000, canal: "presencial" };

describe("aVista", () => {
  it("traduce el ejemplo del contrato: ahorro, te sale, tope después con base", () => {
    const v = aVista(pedido, ejemplo, kansas, catalogos);
    expect(v.resultado).toBe("recomendado");
    expect(v.medio?.nombre).toBe("Galicia Visa crédito");
    expect(v.razon).toBe("20% en Kansas");
    expect(v.reintegro).toBe(3000);
    expect(v.teSale).toBe(12000);
    expect(v.topeDespues).toEqual({ disponible: 7000 });
    expect(v.base?.texto).toBe("según 2 compras de octubre");
    expect(v.alternativas).toEqual([
      {
        medioId: "mp-galicia-credito-visa",
        titulo: "Galicia Visa crédito",
        inicial: "G",
        motivo: "Hoy no aplica: la promo es los viernes",
        estado: "no-aplica",
      },
    ]);
  });

  it("sin compras registradas no muestra ninguna cifra de tope (Principio V)", () => {
    const sinBase: RespuestaRecomendar = {
      ...ejemplo,
      mejor: {
        ...ejemplo.mejor!,
        promociones: [{ ...ejemplo.mejor!.promociones[0]!, base: { comprasRegistradas: 0, comprasSinDescuentoInformado: 0 } }],
      },
    };
    const v = aVista(pedido, sinBase, kansas, catalogos);
    expect(v.topeDespues).toBeNull();
    expect(v.base?.tipo).toBe("sin-compras");
    const sinMonto = aVista({ ...pedido, monto: null }, sinBase, kansas, catalogos);
    expect(sinMonto.topeDisponible).toBeNull();
    expect(sinMonto.reintegro).toBeNull();
  });

  it("promo que no informa tope: sin cifra ni base", () => {
    const sinTope: RespuestaRecomendar = {
      ...ejemplo,
      mejor: { ...ejemplo.mejor!, promociones: [{ ...ejemplo.mejor!.promociones[0]!, topeRestanteTrasCompra: null, base: null }] },
    };
    const v = aVista(pedido, sinTope, kansas, catalogos);
    expect(v.topeDespues).toBeNull();
    expect(v.base).toBeNull();
    expect(v.reintegro).toBe(3000);
  });

  it("mejor null: sin promo, y dice cuándo sí", () => {
    const v = aVista(pedido, { ...ejemplo, mejor: null }, kansas, catalogos);
    expect(v.resultado).toBe("sin-promo");
    expect(v.reintegro).toBeNull();
    expect(v.proximaPromo).toBe("Galicia Visa crédito: la promo es los viernes");
  });

  it("textoBase", () => {
    expect(textoBase({ comprasRegistradas: 1, comprasSinDescuentoInformado: 0 }, "octubre")?.texto).toBe(
      "según 1 compra de octubre",
    );
    expect(textoBase(null, "octubre")).toBeNull();
  });
});
