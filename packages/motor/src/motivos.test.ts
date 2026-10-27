import { describe, expect, it } from "vitest";
import { diaArgentina, fechaArgentina } from "./fecha.ts";
import { motivoCombinado, motivoDescarte, motivoOpcion, type TopeTrasCompra } from "./motivos.ts";
import { AHORA, compra, promo } from "./test/fabricas.ts";
import type { PeriodoAcumulable } from "./tipos.ts";

const ctx = { compra: compra(), fecha: fechaArgentina(AHORA), dia: diaArgentina(AHORA) };

const mensual = promo({ tope: { monto: 10000, periodo: "mensual", alcance: null, grupoTopeId: null } });

/** Saldo tras la compra, en centavos, con `compras` registradas en el período. */
function tras(restante: number, compras: number, periodo: PeriodoAcumulable = "mensual"): TopeTrasCompra {
  return {
    restante,
    saldo: { periodo, base: { comprasRegistradas: compras, comprasSinDescuentoInformado: 0 } },
    fecha: ctx.fecha,
  };
}

function saldo(compras: number, periodo: PeriodoAcumulable = "mensual") {
  return tras(0, compras, periodo).saldo;
}

describe("motivos: opción", () => {
  it("porcentaje, categoría y días; sin tope informado lo dice", () => {
    const p = promo({ vigencia: { desde: "2026-10-01", hasta: "2026-10-31", dias: ["mie", "sab"] } });
    expect(motivoOpcion(p, null)).toBe("20% en supermercados los miércoles y sábados · la promo no informa tope");
  });

  it("dice el monto del tope por compra", () => {
    const p = promo({ tope: { monto: 3000, periodo: "por_compra", alcance: null, grupoTopeId: null } });
    expect(motivoOpcion(p, null)).toBe("20% en supermercados · hasta $3.000 por compra");
  });

  it("tope que se va gastando: lo que queda tras la compra, con ≈ y su base (DESIGN.md §5)", () => {
    expect(motivoOpcion(mensual, tras(160000, 3))).toBe(
      "20% en supermercados · te quedan ≈$1.600 de tope, según 3 compras de octubre",
    );
  });

  it("redondea hacia abajo a la centena y nunca muestra ≈$0", () => {
    expect(motivoOpcion(mensual, tras(165099, 1))).toBe(
      "20% en supermercados · te quedan ≈$1.600 de tope, según 1 compra de octubre",
    );
    expect(motivoOpcion(mensual, tras(4000, 2))).toBe(
      "20% en supermercados · te quedan menos de $100 de tope, según 2 compras de octubre",
    );
  });

  it("semanal: la base es de esta semana", () => {
    expect(motivoOpcion(mensual, tras(500000, 1, "semanal"))).toBe(
      "20% en supermercados · te quedan ≈$5.000 de tope, según 1 compra de esta semana",
    );
  });

  it("si la compra usa todo el tope, lo dice sin cifra", () => {
    expect(motivoOpcion(mensual, tras(0, 2))).toBe(
      "20% en supermercados · con esta compra usás todo el tope que te queda, según 2 compras de octubre",
    );
  });

  it("sin compras en el período no muestra cifra", () => {
    expect(motivoOpcion(mensual, tras(800000, 0))).toBe(
      "20% en supermercados · sin compras registradas este mes, todavía no podemos estimar cuánto tope te queda",
    );
    expect(motivoOpcion(mensual, tras(800000, 0, "semanal"))).toBe(
      "20% en supermercados · sin compras registradas esta semana, todavía no podemos estimar cuánto tope te queda",
    );
  });
});

describe("motivos: opción combinada", () => {
  it("une el motivo de cada promo con \" + \", en el orden recibido, cada una con su tope", () => {
    const a = promo({ id: "A", porcentaje: 20 });
    const b = promo({ id: "B", porcentaje: 10, comercio: "Coto", tope: mensual.tope });
    expect(
      motivoCombinado([
        { promo: a, tope: null, sinSaldo: false },
        { promo: b, tope: tras(300000, 2), sinSaldo: false },
      ]),
    ).toBe(
      "20% en supermercados · la promo no informa tope + 10% en Coto · te quedan ≈$3.000 de tope, según 2 compras de octubre",
    );
  });

  it("la que quedó sin saldo aclara que el tope lo usa otra promoción de este banco", () => {
    const a = promo({ id: "A", tope: mensual.tope });
    const b = promo({ id: "B", porcentaje: 10, tope: mensual.tope });
    expect(
      motivoCombinado([
        { promo: a, tope: tras(0, 1), sinSaldo: false },
        { promo: b, tope: tras(0, 1), sinSaldo: true },
      ]),
    ).toBe(
      "20% en supermercados · con esta compra usás todo el tope que te queda, según 1 compra de octubre + " +
        "10% en supermercados (sin tope disponible: lo usa otra promoción de este banco)",
    );
  });
});

describe("motivos: un texto por cada tipo de descarte", () => {
  it("categoría", () => {
    expect(motivoDescarte("categoria", promo({ categoriaId: 2 }), ctx)).toBe("La promo es para gastronomía");
  });

  it("comercio", () => {
    expect(motivoDescarte("comercio", promo({ comercio: "Coto" }), ctx)).toBe("La promo es solo en Coto");
  });

  it("vigencia: distingue vencida de todavía no empezada", () => {
    const vencida = promo({ vigencia: { desde: "2026-10-01", hasta: "2026-10-20", dias: null } });
    const futura = promo({ vigencia: { desde: "2026-11-01", hasta: "2026-11-30", dias: null } });
    expect(motivoDescarte("vigencia", vencida, ctx)).toBe("La promo venció el 20/10");
    expect(motivoDescarte("vigencia", futura, ctx)).toBe("La promo empieza el 01/11");
  });

  it("día", () => {
    const p = promo({ vigencia: { desde: "2026-10-01", hasta: "2026-10-31", dias: ["sab"] } });
    expect(motivoDescarte("dia", p, ctx)).toBe("Hoy no aplica, la promo es los sábados");
  });

  it("canal: según cómo es la compra", () => {
    expect(motivoDescarte("canal", promo(), ctx)).toBe("La promo es solo online");
    expect(motivoDescarte("canal", promo(), { ...ctx, compra: compra({ canal: "online" }) })).toBe(
      "La promo es solo presencial",
    );
  });

  it("jurisdicción", () => {
    expect(motivoDescarte("jurisdiccion", promo(), ctx)).toBe("La promo no es válida en tu jurisdicción");
  });

  it("monto mínimo, con separador de miles", () => {
    expect(motivoDescarte("monto_minimo", promo({ montoMinimo: 20000 }), ctx)).toBe(
      "La promo pide una compra mínima de $20.000",
    );
  });

  it("medio de pago", () => {
    expect(motivoDescarte("medio_de_pago", promo(), ctx)).toBe(
      "La promo es para un banco o una tarjeta que no tenés en tu perfil",
    );
  });

  it("tope agotado: con el período y la base", () => {
    expect(motivoDescarte("tope_agotado", mensual, ctx, saldo(2))).toBe("Tope agotado este mes, según 2 compras");
    expect(motivoDescarte("tope_agotado", mensual, ctx, saldo(1, "semanal"))).toBe(
      "Tope agotado esta semana, según 1 compra",
    );
  });

  it("tope agotado sin saldo (tope por compra de $0): sin base", () => {
    expect(motivoDescarte("tope_agotado", promo(), ctx)).toBe("Tope agotado");
  });
});
