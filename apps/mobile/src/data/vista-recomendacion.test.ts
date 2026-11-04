import { describe, expect, it } from "vitest";
import type { Comercio, MedioDePago, PedidoRecomendar, RespuestaRecomendar } from "./contracts";
import { aVista, baseDeMotor, razonDe, SIN_PROMO } from "./vista-recomendacion";

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
const santander: MedioDePago = {
  id: "mp-santander-debito-master",
  banco: "Santander",
  nombre: "Santander Mastercard débito",
  nombreCorto: "Santander",
  detalle: "Débito · Banco Santander",
  inicial: "S",
  conCobertura: true,
};
const catalogos = {
  medios: [galicia],
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
        periodo: "mensual",
        textoPromo: "20% en Kansas",
      },
    ],
    motivo: "20% en Kansas · te quedan ≈$7.000 de tope, según 2 compras de octubre",
  },
  alternativas: [],
  descartadas: [
    {
      promocionId: "promo-viernes",
      causa: "dia",
      mediosDePagoIds: ["mp-galicia-credito-visa"],
      base: null,
      motivo: "Hoy no aplica, la promo es los viernes",
    },
  ],
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
    // Galicia es la recomendada: su promo de los viernes no se repite como alternativa.
    expect(v.alternativas).toEqual([]);
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

  it("baseDeMotor: con el período del tope", () => {
    const una = { comprasRegistradas: 1, comprasSinDescuentoInformado: 0 };
    expect(baseDeMotor(una, "mensual", "octubre")?.texto).toBe("según 1 compra de octubre");
    expect(baseDeMotor(una, "semanal", "octubre")?.texto).toBe("según 1 compra esta semana");
    expect(baseDeMotor(null, null, "octubre")).toBeNull();
  });

  it("un tope semanal dice su base de esta semana, no del mes", () => {
    const semanal: RespuestaRecomendar = {
      ...ejemplo,
      mejor: { ...ejemplo.mejor!, promociones: [{ ...ejemplo.mejor!.promociones[0]!, periodo: "semanal" }] },
    };
    expect(aVista(pedido, semanal, kansas, catalogos).base?.texto).toBe("según 2 compras esta semana");
  });

  it("un medio del usuario sin ninguna promo aparece con 'Sin promo para esta compra'", () => {
    const v = aVista(pedido, { ...ejemplo, mejor: null }, kansas, { ...catalogos, medios: [galicia, santander] });
    expect(v.alternativas.map((a) => [a.titulo, a.motivo])).toEqual([
      ["Galicia Visa crédito", "Hoy no aplica, la promo es los viernes"],
      ["Santander Mastercard débito", SIN_PROMO],
    ]);
  });

  it("una promo que no le sirve a ningún medio del usuario no se muestra", () => {
    const otroBanco: RespuestaRecomendar = {
      ...ejemplo,
      descartadas: [
        { promocionId: "promo-macro", causa: "medio_de_pago", mediosDePagoIds: [], base: null, motivo: "La promo es para un banco o una tarjeta que no tenés en tu perfil" },
        { promocionId: "promo-macro-jueves", causa: "dia", mediosDePagoIds: [], base: null, motivo: "Hoy no aplica, la promo es los jueves" },
      ],
    };
    const v = aVista(pedido, otroBanco, kansas, catalogos);
    expect(v.alternativas).toEqual([]);
    expect(aVista(pedido, { ...otroBanco, mejor: null }, kansas, catalogos).proximaPromo).toBeNull();
  });

  it("el medio recomendado no repite sus promos descartadas en '¿por qué no X?'", () => {
    // En `ejemplo`, Galicia es la mejor opción y además tiene la promo de los viernes descartada.
    const v = aVista(pedido, ejemplo, kansas, { ...catalogos, medios: [galicia, santander] });
    expect(v.alternativas.map((a) => [a.titulo, a.motivo])).toEqual([["Santander Mastercard débito", SIN_PROMO]]);
  });

  it("un medio que es otra opción tampoco repite sus descartes", () => {
    const santanderOpcion = { ...ejemplo.mejor!, medioDePagoId: santander.id, motivo: "10% en Kansas" };
    const r: RespuestaRecomendar = {
      ...ejemplo,
      alternativas: [santanderOpcion],
      descartadas: [{ ...ejemplo.descartadas[0]!, mediosDePagoIds: [santander.id] }],
    };
    const v = aVista(pedido, r, kansas, { ...catalogos, medios: [galicia, santander] });
    expect(v.alternativas.map((a) => [a.titulo, a.estado])).toEqual([["Santander Mastercard débito", "otra-opcion"]]);
  });

  it("dos promos descartadas del mismo medio explican las dos", () => {
    const r: RespuestaRecomendar = {
      ...ejemplo,
      mejor: null,
      descartadas: [
        { promocionId: "promo-agotada", causa: "tope_agotado", mediosDePagoIds: [galicia.id], base: null, motivo: "Tope agotado este mes, según 2 compras" },
        ejemplo.descartadas[0]!,
      ],
    };
    const v = aVista(pedido, r, kansas, catalogos);
    expect(v.alternativas.map((a) => [a.titulo, a.estado])).toEqual([
      ["Galicia Visa crédito", "agotado"],
      ["Galicia Visa crédito", "no-aplica"],
    ]);
  });

  it("una promo descartada que servía a dos medios explica a cada uno", () => {
    const dos: RespuestaRecomendar = {
      ...ejemplo,
      mejor: null,
      descartadas: [{ ...ejemplo.descartadas[0]!, mediosDePagoIds: [galicia.id, santander.id] }],
    };
    const v = aVista(pedido, dos, kansas, { ...catalogos, medios: [galicia, santander] });
    expect(v.alternativas.map((a) => a.titulo)).toEqual(["Galicia Visa crédito", "Santander Mastercard débito"]);
  });
});

describe("razonDe", () => {
  it("une el texto de cada promo que arma el motor, sin cortar el motivo", () => {
    const promo = ejemplo.mejor!.promociones[0]!;
    const combinada = {
      ...ejemplo.mejor!,
      promociones: [
        { ...promo, textoPromo: "20% en supermercados · pide una compra mínima de $20.000" },
        { ...promo, textoPromo: "10% en Coto" },
      ],
    };
    expect(razonDe(ejemplo.mejor!)).toBe("20% en Kansas");
    expect(razonDe(combinada)).toBe("20% en supermercados · pide una compra mínima de $20.000 + 10% en Coto");
  });
});
