import { describe, expect, it } from "vitest";
import {
  compraParaGuardar,
  comprasVista,
  perfilDelMotor,
  recomendacionVista,
  textoDias,
  topesVista,
  type EntradasMotor,
} from "./calculo";
import type { Comercio } from "./contracts";
import { RELOJ_EJEMPLO, catalogoComercios, comprasOctubre, mediosDeclarados, promociones } from "./fixtures";

// Spec 008, SC-001: las respuestas de US1 con el motor real sobre los datos de ejemplo
// (data-model.md §Datos de ejemplo), con el reloj del miércoles 14/10/2026 al mediodía.

const ahora = new Date(RELOJ_EJEMPLO);
const entradas: EntradasMotor = {
  perfil: perfilDelMotor(
    mediosDeclarados.map((m) => m.id),
    "Martín",
  ),
  promociones,
  compras: comprasOctubre,
  ahora,
};
const comercio = (id: string): Comercio => {
  const c = catalogoComercios.find((x) => x.id === id);
  if (!c) throw new Error(id);
  return c;
};

describe("recomendacionVista (US1)", () => {
  it("Coto con $10.000: Galicia, $2.000, te sale $8.000, ≈$4.500 después según 3 compras", () => {
    const r = recomendacionVista(entradas, comercio("coto"), 10000);
    expect(r?.medio?.id).toBe("galicia-visa-credito");
    expect(r?.razon).toBe("20% en supermercados los miércoles");
    expect(r?.reintegro).toBe(2000);
    expect(r?.teSale).toBe(8000);
    expect(r?.topeDespues).toEqual({ disponible: 4500 });
    expect(r?.base?.texto).toBe("según 3 compras de octubre");
    expect(r?.dia).toBe("hoy miércoles");
  });

  it("las promos de otro rubro no aparecen como alternativa (research R4)", () => {
    expect(recomendacionVista(entradas, comercio("coto"), 10000)?.alternativas).toEqual([]);
  });

  it("Farmacity: sin recomendación y Macro agotado con su base", () => {
    const r = recomendacionVista(entradas, comercio("farmacity"), 10000);
    expect(r?.resultado).toBe("sin-promo");
    expect(r?.alternativas).toEqual([
      expect.objectContaining({
        medioId: "macro-visa-debito",
        estado: "agotado",
        motivo: "Tope agotado este mes, según 2 compras",
      }),
    ]);
  });

  it("YPF un miércoles: no aplica hoy y dice cuándo sí", () => {
    const r = recomendacionVista(entradas, comercio("ypf"), 10000);
    expect(r?.resultado).toBe("sin-promo");
    expect(r?.proximaPromo).toBe("Santander Mastercard crédito: la promo es los jueves");
  });

  it("Coto sin monto: Galicia con ≈$6.500 de tope disponible, sin reintegro", () => {
    const r = recomendacionVista(entradas, comercio("coto"), null);
    expect(r?.medio?.id).toBe("galicia-visa-credito");
    expect(r?.topeDisponible).toBe(6500);
    expect(r?.reintegro).toBeNull();
    expect(r?.teSale).toBeNull();
  });

  it("perfil sin medios evaluables (solo Mercado Pago): sin promo, sin error", () => {
    const r = recomendacionVista(
      { ...entradas, perfil: perfilDelMotor(["mercado-pago"], null) },
      comercio("coto"),
      10000,
    );
    expect(r?.resultado).toBe("sin-promo");
  });

  it("comercio sin rubro: no se le pregunta al motor", () => {
    expect(recomendacionVista(entradas, { ...comercio("coto"), categoriaId: null }, 10000)).toBeNull();
  });

  it("el jueves, la promo de Galicia de los miércoles no aplica", () => {
    const r = recomendacionVista(
      { ...entradas, ahora: new Date("2026-10-15T12:00:00-03:00") },
      comercio("coto"),
      10000,
    );
    expect(r?.resultado).toBe("sin-promo");
    expect(r?.dia).toBe("hoy jueves");
  });
});

describe("topesVista", () => {
  const t = topesVista(entradas);
  const de = (id: string) => t.medios.find((m) => m.medio.id === id);

  it("cifra, estado y base salen del motor (FR-007)", () => {
    expect(de("galicia-visa-credito")).toMatchObject({
      estado: "disponible",
      cifra: "≈$6.500",
      disponible: 6500,
      base: { tipo: "compras", texto: "según 3 compras de octubre" },
      reinicio: "se reinicia el 1/11",
      promo: "20% en supermercados · los miércoles",
    });
    expect(de("santander-mastercard-credito")).toMatchObject({ estado: "disponible", cifra: "≈$2.300" });
    expect(de("macro-visa-debito")).toMatchObject({
      estado: "agotado",
      cifra: null,
      base: { texto: "según 2 compras de octubre" },
      reinicio: "vuelve el 1/11",
    });
    expect(de("provincia-visa-debito")).toMatchObject({
      estado: "sin-base",
      disponible: null,
      base: { tipo: "sin-compras" },
    });
  });

  it("un solo consejo, para la promo que aplica hoy", () => {
    expect(t.medios.filter((m) => m.consejo !== null).map((m) => m.consejo)).toEqual([
      "Hoy es miércoles: en supermercados, con Galicia te quedan ≈$6.500 de tope.",
    ]);
  });

  it("te devolvieron y días al reinicio mensual", () => {
    expect(t.devolvieron).toEqual({
      monto: 15200,
      base: expect.objectContaining({ texto: "según 10 compras de octubre" }),
    });
    expect(t.reinicioMensualEnDias).toBe(18);
  });
});

describe("compraParaGuardar (FR-008)", () => {
  const borrador = {
    modo: "excepcion" as const,
    comercio: "Coto",
    fecha: "2026-10-14",
    monto: 5000,
    medioId: "galicia-visa-credito",
    textoExtraido: null,
  };

  it("con el medio recomendado: promo de Galicia, $1.000 esperados, sin descuento informado", () => {
    const c = compraParaGuardar(entradas, borrador, "n1");
    expect(c).toMatchObject({
      promocionId: "promo-galicia-super-mie",
      reintegroEsperado: 1000,
      descuentoObtenido: null,
      categoriaId: 1,
    });
    const t = topesVista({ ...entradas, compras: [c, ...comprasOctubre] });
    const galicia = t.medios.find((m) => m.medio.id === "galicia-visa-credito");
    expect(galicia).toMatchObject({ cifra: "≈$5.500", base: { texto: "según 4 compras de octubre" } });
  });

  it("con un medio sin promo para el rubro: sin promo ni reintegro", () => {
    const c = compraParaGuardar(entradas, { ...borrador, medioId: "macro-visa-debito" }, "n1");
    expect(c.promocionId).toBeNull();
    expect(c.reintegroEsperado).toBeNull();
  });

  it("un ticket del jueves se evalúa con ese día: la promo de los miércoles no aplica", () => {
    const c = compraParaGuardar(entradas, { ...borrador, fecha: "2026-10-15" }, "n1");
    expect(c.promocionId).toBeNull();
  });

  it("comercio fuera del catálogo: sin rubro ni reintegro inventado", () => {
    const c = compraParaGuardar(entradas, { ...borrador, comercio: "Kiosco Pepe" }, "n1");
    expect(c).toMatchObject({ categoriaId: null, promocionId: null, reintegroEsperado: null });
  });

  it("sin monto o sin medio falla", () => {
    expect(() => compraParaGuardar(entradas, { ...borrador, monto: null }, "n1")).toThrow("Falta el monto");
  });
});

describe("comprasVista y textoDias", () => {
  it("solo las del mes en curso, con el reintegro del banco o el esperado", () => {
    const vieja = { ...comprasOctubre[0]!, id: "sept", fecha: "2026-09-30" };
    const r = comprasVista([vieja, ...comprasOctubre], ahora);
    expect(r.compras.map((c) => c.id)).not.toContain("sept");
    expect(r.gastaste).toBe(101500);
  });

  it("lista todo el período de topes (mes o semana, lo que empiece antes) y los totales siguen siendo del mes (spec 010, FR-003)", () => {
    // Miércoles 2/12: la semana arrancó el lunes 30/11, antes que el mes.
    const hoy = new Date("2026-12-02T15:00:00.000Z");
    const base = comprasOctubre[0]!;
    const del29 = { ...base, id: "nov29", fecha: "2026-11-29", monto: 1000 };
    const del30 = { ...base, id: "nov30", fecha: "2026-11-30", monto: 2000 };
    const del1 = { ...base, id: "dic1", fecha: "2026-12-01", monto: 4000 };
    const r = comprasVista([del29, del30, del1], hoy);
    expect(r.compras.map((c) => c.id).sort()).toEqual(["dic1", "nov30"]);
    expect(r.gastaste).toBe(4000);
  });

  it("textoDias", () => {
    expect(textoDias(null)).toBe("todos los días");
    expect(textoDias(["sab"])).toBe("los sábados");
    expect(textoDias(["lun", "mie", "vie"])).toBe("los lunes, miércoles y viernes");
  });
});
