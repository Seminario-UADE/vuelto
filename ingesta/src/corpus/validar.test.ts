import { describe, expect, it } from "vitest";
import { BANCO_GALICIA, CATALOGO_PRUEBA, promocion } from "./test/fabricas.ts";
import type { PromocionIngestada } from "./tipos.ts";
import { validarPromocion } from "./validar.ts";

type Libre = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

/** Las reglas rotas por una promo válida a la que se le aplica `cambio`. */
function reglas(cambio: (p: Libre) => void = () => {}): string[] {
  const p = structuredClone(promocion()) as unknown as Libre;
  cambio(p);
  return validarPromocion(p as PromocionIngestada, CATALOGO_PRUEBA).map((e) => e.slice(0, e.indexOf(":")));
}

describe("validarPromocion — lo que sí pasa", () => {
  it("una promo válida no rompe ninguna regla", () => {
    expect(reglas()).toEqual([]);
  });

  it("un dato ausente es null explícito y es válido", () => {
    expect(
      reglas((p) => {
        p.comercio = null;
        p.canal = null;
        p.montoMinimo = null;
        p.vigencia.dias = null;
        p.tope = { monto: null, periodo: null, alcance: null, grupoTopeId: null };
      }),
    ).toEqual([]);
  });

  it("un tope compartido con su grupo y su fuente es válido", () => {
    expect(
      reglas((p) => {
        p.tope.alcance = "compartido";
        p.tope.grupoTopeId = "modo:20-paladini-icbc-ago26";
        p.fragmentosFuente = { "tope.alcance": "offers[0].limits: una sola oferta" };
      }),
    ).toEqual([]);
  });

  it("acepta 100 %, desde igual a hasta y solo crédito", () => {
    expect(
      reglas((p) => {
        p.porcentaje = 100;
        p.vigencia.hasta = p.vigencia.desde;
        p.tarjetas.debito = [];
      }),
    ).toEqual([]);
  });
});

describe("validarPromocion — identidad y catálogos", () => {
  it.each<[string, (p: Libre) => void, string]>([
    ["la fuente tiene que ser modo", (p) => (p.fuente = "manual"), "fuente"],
    ["el fuenteId no puede estar vacío", (p) => (p.fuenteId = " "), "fuente-id"],
    ["el título no puede estar vacío", (p) => (p.titulo = ""), "titulo"],
    ["el banco tiene que estar en el catálogo", (p) => (p.bancoId = "00000000-0000-4000-8000-000000000000"), "banco"],
    ["la categoría tiene que ser una de MODO", (p) => (p.categoriaId = 99), "categoria"],
    ["el comercio no puede ser un texto vacío", (p) => (p.comercio = "  "), "comercio"],
    ["el canal tiene que ser del enum", (p) => (p.canal = "telefono"), "canal"],
    ["el monto mínimo no puede ser negativo", (p) => (p.montoMinimo = -1), "monto-minimo"],
  ])("%s", (_nombre, cambio, regla) => {
    expect(reglas(cambio)).toContain(regla);
  });

  it("otra_provincia queda fuera del alcance del MVP", () => {
    expect(
      reglas((p) => {
        p.jurisdiccion = "otra_provincia";
        p.fragmentosFuente = { jurisdiccion: "SOLO CÓRDOBA" };
      }),
    ).toEqual(["jurisdiccion"]);
  });

  it("acepta otro banco del catálogo", () => {
    expect(reglas((p) => (p.bancoId = BANCO_GALICIA))).toEqual([]);
  });
});

describe("validarPromocion — porcentaje y tarjetas", () => {
  it.each([0, -5, 101, Number.NaN])("rechaza el porcentaje %s", (porcentaje) => {
    expect(reglas((p) => (p.porcentaje = porcentaje))).toContain("porcentaje");
  });

  it("rechaza una red desconocida y una repetida", () => {
    expect(reglas((p) => (p.tarjetas.credito = ["amex"]))).toContain("tarjetas");
    expect(reglas((p) => (p.tarjetas.debito = ["visa", "visa"]))).toContain("tarjetas");
  });

  it("sin ninguna red no se publica: lo dice la regla propia y la del motor", () => {
    const r = reglas((p) => (p.tarjetas = { debito: [], credito: [] }));
    expect(r).toContain("tarjetas");
    expect(r).toContain("publicable");
  });
});

describe("validarPromocion — vigencia", () => {
  it("rechaza una fecha que no existe", () => {
    expect(reglas((p) => (p.vigencia.desde = "2026-02-30"))).toContain("vigencia-fecha");
  });

  it("rechaza desde posterior a hasta", () => {
    expect(reglas((p) => (p.vigencia.desde = "2027-02-01"))).toEqual(["vigencia-orden"]);
  });

  it("rechaza una lista de días vacía, repetida o con un día desconocido", () => {
    for (const dias of [[], ["vie", "vie"], ["viernes"]]) expect(reglas((p) => (p.vigencia.dias = dias))).toEqual(["dias"]);
  });
});

describe("validarPromocion — tope", () => {
  it("un monto sin período o un período sin monto es un error", () => {
    expect(reglas((p) => (p.tope.periodo = null))).toContain("tope-periodo");
    expect(reglas((p) => (p.tope.monto = null))).toContain("tope-periodo");
  });

  it("un tope de 0 no se publica", () => {
    const r = reglas((p) => (p.tope.monto = 0));
    expect(r).toContain("tope-monto");
    expect(r).toContain("publicable");
  });

  it("rechaza un período o un alcance fuera del enum", () => {
    expect(reglas((p) => (p.tope.periodo = "anual"))).toContain("tope-periodo");
    expect(reglas((p) => (p.tope.alcance = "global"))).toContain("tope-alcance");
  });

  it("compartido y grupoTopeId van juntos", () => {
    expect(
      reglas((p) => {
        p.tope.alcance = "compartido";
        p.fragmentosFuente = { "tope.alcance": "x" };
      }),
    ).toEqual(["tope-grupo"]);
    expect(reglas((p) => (p.tope.grupoTopeId = "modo:x"))).toEqual(["tope-grupo"]);
  });
});

describe("validarPromocion — lo que sale de la letra chica dice de dónde salió", () => {
  it.each<[string, (p: Libre) => void]>([
    ["acumulable", (p) => (p.acumulable = false)],
    ["jurisdiccion", (p) => (p.jurisdiccion = "caba")],
    ["tope.alcance", (p) => (p.tope.alcance = "exclusivo")],
  ])("%s sin su fuente es un error", (_campo, cambio) => {
    expect(reglas(cambio)).toEqual(["fragmento"]);
  });

  it("con su fuente es válido", () => {
    expect(
      reglas((p) => {
        p.acumulable = false;
        p.jurisdiccion = "caba";
        p.fragmentosFuente = { acumulable: "NO ACUMULABLE", jurisdiccion: "SOLO CABA" };
      }),
    ).toEqual([]);
  });
});
