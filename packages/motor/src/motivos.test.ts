import { describe, expect, it } from "vitest";
import { diaArgentina, fechaArgentina } from "./fecha.ts";
import { motivoDescarte, motivoOpcion } from "./motivos.ts";
import { AHORA, compra, promo } from "./test/fabricas.ts";

const ctx = { compra: compra(), fecha: fechaArgentina(AHORA), dia: diaArgentina(AHORA) };

describe("motivos", () => {
  it("opción: porcentaje, categoría y días", () => {
    const p = promo({ vigencia: { desde: "2026-10-01", hasta: "2026-10-31", dias: ["mie", "sab"] } });
    expect(motivoOpcion(p)).toBe("20% en supermercados los miércoles y sábados · la promo no informa tope");
  });

  it("descarte por día", () => {
    const p = promo({ vigencia: { desde: "2026-10-01", hasta: "2026-10-31", dias: ["sab"] } });
    expect(motivoDescarte("dia", p, ctx)).toBe("Hoy no aplica: la promo es los sábados");
  });

  it("descarte por vigencia distingue vencida de todavía no empezada", () => {
    const vencida = promo({ vigencia: { desde: "2026-10-01", hasta: "2026-10-20", dias: null } });
    const futura = promo({ vigencia: { desde: "2026-11-01", hasta: "2026-11-30", dias: null } });
    expect(motivoDescarte("vigencia", vencida, ctx)).toBe("La promo venció el 20/10");
    expect(motivoDescarte("vigencia", futura, ctx)).toBe("La promo empieza el 01/11");
  });

  it("descarte por monto mínimo con separador de miles", () => {
    expect(motivoDescarte("monto_minimo", promo({ montoMinimo: 20000 }), ctx)).toBe(
      "La promo pide una compra mínima de $20.000",
    );
  });
});
