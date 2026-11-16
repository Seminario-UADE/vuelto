import { describe, expect, it } from "vitest";
import { GrupoInvalidoError } from "./errores.ts";
import { recomendarGrupo } from "./grupo.ts";
import { AHORA, compra, GALICIA, medio, promo, SANTANDER } from "./test/fabricas.ts";
import type {
  CompraDeGrupo,
  ConsumoDeTope,
  IntegranteDeGrupo,
  MedioDePago,
  Promocion,
  RecomendacionDeGrupo,
  ResultadoDeIntegrante,
  Tope,
} from "./tipos.ts";

// Spec 016, US1. Fotos de grupo escritas a mano: sin base, sin red, con la hora fija.
// AHORA = miércoles 21/10/2026, 12:00 en Argentina. `compra()` es de supermercados (1), presencial.

const NACION = "0330e59b-b6e3-43eb-9083-a88fcc61e845";

const galicia = medio();
const santander = medio({ id: "santander-debito-master", bancoId: SANTANDER, tipo: "debito", red: "master" });
/** Ningún promo de estos tests aplica a este medio. */
const nacion = medio({ id: "nacion-debito-visa", bancoId: NACION, tipo: "debito", red: "visa" });

const tope = (monto: number | null, periodo: Tope["periodo"] = "mensual"): Tope => ({
  monto,
  periodo,
  alcance: null,
  grupoTopeId: null,
});

/** 20% Galicia crédito Visa, supermercados, sin tope. */
const promoGalicia = promo();
/** 25% Santander débito Master, supermercados, tope mensual de $3.000. */
const promoSantander = promo({
  id: "promo-santander",
  bancoId: SANTANDER,
  porcentaje: 25,
  tarjetas: { debito: ["master"], credito: [] },
  tope: tope(3000),
});

function delGrupo(monto: number, datos: Partial<CompraDeGrupo> = {}): CompraDeGrupo {
  return { ...compra(), monto, ...datos };
}

function yo(mediosDePago: MedioDePago[] = [galicia], consumos: ConsumoDeTope[] = []): IntegranteDeGrupo {
  return { tipo: "cuenta", id: "u-vos", pide: true, mediosDePago, consumos };
}

function contacto(id: string, mediosDePago: MedioDePago[] = [galicia], consumos: ConsumoDeTope[] = []): IntegranteDeGrupo {
  return { tipo: "cuenta", id, pide: false, mediosDePago, consumos };
}

function sinCuenta(posicion: number): IntegranteDeGrupo {
  return { tipo: "sin_cuenta", posicion };
}

function consumo(promocionId: string, descuentoObtenido: number | null, datos: Partial<ConsumoDeTope> = {}): ConsumoDeTope {
  return { id: `${promocionId}-${descuentoObtenido}`, promocionId, fecha: "2026-10-10", monto: 10000, descuentoObtenido, ...datos };
}

function de(r: RecomendacionDeGrupo, id: string): Extract<ResultadoDeIntegrante, { tipo: "cuenta" }> {
  const i = r.integrantes.find((x) => x.tipo === "cuenta" && x.id === id);
  if (!i || i.tipo !== "cuenta") throw new Error(`no está ${id}`);
  return i;
}

function partes(r: RecomendacionDeGrupo): number[] {
  return r.integrantes.map((i) => i.parte);
}

const grupo = (c: CompraDeGrupo, is: IntegranteDeGrupo[], ps: Promocion[], ahora = AHORA) =>
  recomendarGrupo(c, is, ps, ahora);

describe("recomendarGrupo: quién paga (US1)", () => {
  it("US1-1: un contacto con el tope agotado no se lleva esa promo; gana lo que sí aplica", () => {
    const r = grupo(
      delGrupo(10000),
      [
        yo([nacion]),
        contacto("u-mateo", [santander], [consumo("promo-santander", 3000)]),
        contacto("u-lucia", [galicia]),
      ],
      [promoSantander, promoGalicia],
    );
    expect(r.quienPaga).toBe("u-lucia");
    expect(r.reintegro).toBe(2000);
    expect(de(r, "u-mateo").opcion).toBeNull();
    expect(de(r, "u-lucia").opcion).toMatchObject({ medioDePagoId: galicia.id, promocionId: "promo-galicia", reintegroMostrado: 2000 });
  });

  it("US1-2: sin consumo del tope de la promo aplicada → tope completo y base «sin compras»", () => {
    const conTope = promo({ id: "promo-galicia-tope", tope: tope(5000) });
    const r = grupo(delGrupo(10000), [yo([nacion]), contacto("u-lucia")], [conTope]);
    expect(de(r, "u-lucia").opcion).toMatchObject({
      reintegroMostrado: 2000,
      base: { tipo: "sin_compras", periodo: "mensual" },
    });
  });

  it("US1-3: diez compras de otro rubro no cuentan como base de la promo de gastronomía", () => {
    const deSuper = promo({ id: "promo-super", tope: tope(50000) });
    const deGastro = promo({ id: "promo-gastro", categoriaId: 2, tope: tope(5000) });
    const consumos = Array.from({ length: 10 }, (_, k) => consumo("promo-super", 100, { id: `s${k}` }));
    const r = grupo(delGrupo(10000, { categoriaId: 2 }), [yo([nacion]), contacto("u-lucia", [galicia], consumos)], [deSuper, deGastro]);
    expect(de(r, "u-lucia").opcion?.base).toEqual({ tipo: "sin_compras", periodo: "mensual" });
  });

  it("US1-3 (contracara): con consumo de la promo aplicada, base «con compras» con su cantidad y período", () => {
    const conTope = promo({ id: "promo-galicia-tope", tope: tope(5000) });
    const r = grupo(
      delGrupo(10000),
      [yo([nacion]), contacto("u-lucia", [galicia], [consumo("promo-galicia-tope", 1000, { id: "x1" }), consumo("promo-galicia-tope", 500, { id: "x2" })])],
      [conTope],
    );
    expect(de(r, "u-lucia").opcion?.base).toEqual({ tipo: "con_compras", comprasRegistradas: 2, periodo: "mensual" });
  });

  it("US1-4: promo sin tope informado → «sin_tope_informado»; tope por compra → «tope_por_compra»", () => {
    const sinTope = grupo(delGrupo(10000), [yo([nacion]), contacto("u-lucia")], [promoGalicia]);
    expect(de(sinTope, "u-lucia").opcion?.base).toEqual({ tipo: "sin_tope_informado" });

    const porCompra = promo({ id: "promo-por-compra", tope: tope(1000, "por_compra") });
    const r = grupo(delGrupo(10000), [yo([nacion]), contacto("u-lucia")], [porCompra]);
    expect(de(r, "u-lucia").opcion).toMatchObject({ reintegroMostrado: 1000, base: { tipo: "tope_por_compra" } });
  });

  it("US1-5: un integrante sin cuenta nunca paga, pero cuenta en la división", () => {
    const r = grupo(delGrupo(10000), [yo([nacion]), sinCuenta(0)], [promoGalicia]);
    expect(r.quienPaga).toBeNull();
    expect(r.integrantes).toEqual([
      expect.objectContaining({ tipo: "cuenta", id: "u-vos", parte: 5000 }),
      { tipo: "sin_cuenta", posicion: 0, parte: 5000 },
    ]);
  });

  it("US1-6: empate entre quien pide y un contacto → gana quien pide", () => {
    const r = grupo(delGrupo(25000), [contacto("u-lucia"), yo()], [promoGalicia]);
    expect(de(r, "u-vos").opcion?.reintegroMostrado).toBe(5000);
    expect(de(r, "u-lucia").opcion?.reintegroMostrado).toBe(5000);
    expect(r.quienPaga).toBe("u-vos");
  });

  it("US1-7: empate entre contactos → gana el menor id en minúsculas, por código de carácter", () => {
    // Sin pasar a minúsculas, "u-B" < "u-a" (B = 66, a = 97); en minúsculas, "u-a" < "u-b".
    const r = grupo(delGrupo(10000), [yo([nacion]), contacto("u-B"), contacto("u-a")], [promoGalicia]);
    expect(r.quienPaga).toBe("u-a");
    expect(r.integrantes.map((i) => (i.tipo === "cuenta" ? i.id : i.posicion))).toEqual(["u-vos", "u-a", "u-B"]);
  });

  it("US1-8: se decide sobre lo que se muestra: $5.030 de quien pide le gana a $5.049 de un contacto (≈$5.000)", () => {
    // Quien pide: 20% de $25.150 = $5.030. Contacto: 25% con tope por compra de $5.049 → se muestra $5.000.
    const delContacto = promo({
      id: "promo-santander-por-compra",
      bancoId: SANTANDER,
      porcentaje: 25,
      tarjetas: { debito: ["master"], credito: [] },
      tope: tope(5049, "por_compra"),
    });
    const r = grupo(delGrupo(25150), [yo([galicia]), contacto("u-mateo", [santander])], [promoGalicia, delContacto]);
    expect(de(r, "u-vos").opcion?.reintegroMostrado).toBe(5030);
    expect(de(r, "u-mateo").opcion?.reintegroMostrado).toBe(5000);
    expect(r.quienPaga).toBe("u-vos");
    expect(r.reintegro).toBe(5030);
  });

  it("US1-9: un contacto con $40 de reintegro se muestra sin reintegro y nunca paga", () => {
    const r = grupo(delGrupo(200), [yo([nacion]), contacto("u-lucia")], [promoGalicia]);
    expect(de(r, "u-lucia").opcion).toBeNull();
    expect(r.quienPaga).toBeNull();
  });

  it("los $50 del escalón suben: $50 de un contacto se muestra ≈$100", () => {
    const r = grupo(delGrupo(250), [yo([nacion]), contacto("u-lucia")], [promoGalicia]);
    expect(de(r, "u-lucia").opcion?.reintegroMostrado).toBe(100);
    expect(r.quienPaga).toBe("u-lucia");
  });

  it("US1-14: si nadie tiene al menos $1, no hay quien pague ni medio, y se reparte el monto completo", () => {
    const r = grupo(delGrupo(10000), [yo([nacion]), contacto("u-lucia", [nacion]), sinCuenta(0)], [promoGalicia]);
    expect(r.quienPaga).toBeNull();
    expect(r.reintegro).toBeNull();
    expect(r.total).toBe(10000);
    expect(partes(r)).toEqual([3334, 3333, 3333]);
    expect(r.integrantes.every((i) => i.tipo === "sin_cuenta" || i.opcion === null)).toBe(true);
  });

  it("US1-15: un contacto sin medios evaluables queda sin reintegro, sin error", () => {
    const r = grupo(delGrupo(10000), [yo(), contacto("u-lucia", [])], [promoGalicia]);
    expect(de(r, "u-lucia").opcion).toBeNull();
    expect(r.quienPaga).toBe("u-vos");
  });

  it("quien pide sin medios también queda sin reintegro, sin error", () => {
    const r = grupo(delGrupo(10000), [yo([]), contacto("u-lucia")], [promoGalicia]);
    expect(de(r, "u-vos").opcion).toBeNull();
    expect(de(r, "u-vos").propia).toEqual({ opcion: null, descarte: null });
    expect(r.quienPaga).toBe("u-lucia");
  });

  it("US1-16: si el reintegro supera el monto, el total es $0 y nadie pone un monto negativo", () => {
    const a = promo({ id: "promo-a", porcentaje: 60, acumulable: true });
    const b = promo({ id: "promo-b", porcentaje: 60, acumulable: true });
    const r = grupo(delGrupo(10000), [yo(), sinCuenta(0)], [a, b]);
    expect(r.total).toBe(0);
    expect(partes(r)).toEqual([0, 0]);
  });

  it("US1-18: en una semana que empezó el mes anterior, las compras de esa semana cuentan para el tope semanal", () => {
    // Domingo 1/11/2026, 12:00 en Argentina: la semana arrancó el lunes 26/10.
    const domingo = new Date("2026-11-01T15:00:00Z");
    const semanal = promo({
      id: "promo-semanal",
      vigencia: { desde: "2026-10-01", hasta: "2026-11-30", dias: null },
      tope: tope(1000, "semanal"),
    });
    const r = grupo(
      delGrupo(10000),
      [yo([nacion]), contacto("u-lucia", [galicia], [consumo("promo-semanal", 1000, { fecha: "2026-10-27" })])],
      [semanal],
      domingo,
    );
    expect(de(r, "u-lucia").opcion).toBeNull();
    expect(r.quienPaga).toBeNull();
  });
});

describe("recomendarGrupo: división (US1, FR-006)", () => {
  it("US1-11: $10.000 entre 3 sin reintegro → el $1 extra a quien pide", () => {
    const r = grupo(delGrupo(10000), [contacto("u-lucia", [nacion]), sinCuenta(0), yo([nacion])], [promoGalicia]);
    expect(r.integrantes[0]).toMatchObject({ tipo: "cuenta", id: "u-vos" });
    expect(partes(r)).toEqual([3334, 3333, 3333]);
  });

  it("US1-12: $41.000 entre 4 con ≈$5.000 de reintegro → $9.000 cada uno", () => {
    const porCompra = promo({ id: "promo-por-compra", tope: tope(5000, "por_compra") });
    const r = grupo(
      delGrupo(41000),
      [yo([nacion]), contacto("u-lucia"), contacto("u-mateo", [nacion]), sinCuenta(0)],
      [porCompra],
    );
    expect(r.quienPaga).toBe("u-lucia");
    expect(r.reintegro).toBe(5000);
    expect(r.total).toBe(36000);
    expect(partes(r)).toEqual([9000, 9000, 9000, 9000]);
  });

  it("US1-13: $2.000,50 de quien pide se muestra $2.001 y el total entre 3 es $8.000", () => {
    const porCompra = promo({ id: "promo-por-compra", porcentaje: 25, tope: tope(2000.5, "por_compra") });
    const r = grupo(delGrupo(10001), [yo(), contacto("u-lucia", [nacion]), sinCuenta(0)], [porCompra]);
    expect(r.quienPaga).toBe("u-vos");
    expect(r.reintegro).toBe(2001);
    expect(r.total).toBe(8000);
    expect(partes(r)).toEqual([2667, 2667, 2666]);
  });

  it("los sin cuenta reciben el resto por su posición de carga, no por su lugar en la lista", () => {
    const r = grupo(delGrupo(10002), [sinCuenta(1), sinCuenta(0), yo([nacion]), contacto("u-lucia", [nacion])], [promoGalicia]);
    // Orden: u-vos, u-lucia, sin cuenta 0, sin cuenta 1. Resto 2 → los dos primeros.
    expect(r.integrantes.map((i) => (i.tipo === "cuenta" ? i.id : i.posicion))).toEqual(["u-vos", "u-lucia", 0, 1]);
    expect(partes(r)).toEqual([2501, 2501, 2500, 2500]);
  });
});

describe("recomendarGrupo: lo que se devuelve de cada integrante", () => {
  it("«queDa» de un contacto no habla del tope ni de lo que queda", () => {
    const compartido = (id: string, porcentaje: number) =>
      promo({
        id,
        porcentaje,
        acumulable: true,
        tope: { monto: 1000, periodo: "mensual", alcance: "compartido", grupoTopeId: "g-galicia" },
      });
    const r = grupo(
      delGrupo(10000),
      [yo([nacion]), contacto("u-lucia", [galicia], [consumo("promo-1", 200, { id: "c1" })])],
      [compartido("promo-1", 20), compartido("promo-2", 10), promo({ id: "promo-con-minimo", montoMinimo: 5000, tope: tope(3000) })],
    );
    const queDa = de(r, "u-lucia").opcion?.queDa ?? "";
    expect(queDa).not.toBe("");
    expect(queDa).not.toMatch(/tope|queda|sin tope disponible|según/i);
  });

  it("«propia» solo viene en quien pide, con su opción completa", () => {
    const r = grupo(delGrupo(10000), [yo(), contacto("u-lucia")], [promoGalicia]);
    expect(de(r, "u-vos").propia?.opcion).toMatchObject({ medioDePagoId: galicia.id, ahorroEstimado: 2000 });
    expect(de(r, "u-lucia").propia).toBeNull();
  });

  it("de quien pide sin opción devuelve el descarte principal (es su propio dato)", () => {
    const r = grupo(delGrupo(10000), [yo([santander], [consumo("promo-santander", 3000)]), contacto("u-lucia", [nacion])], [promoSantander]);
    expect(de(r, "u-vos").opcion).toBeNull();
    expect(de(r, "u-vos").propia?.descarte).toMatchObject({ promocionId: "promo-santander", causa: "tope_agotado" });
  });

  it("el reintegro de quien pide redondea al peso y el de un contacto al escalón de $100", () => {
    const r = grupo(delGrupo(12345), [yo(), contacto("u-lucia")], [promoGalicia]);
    // 20% de $12.345 = $2.469.
    expect(de(r, "u-vos").opcion?.reintegroMostrado).toBe(2469);
    expect(de(r, "u-lucia").opcion?.reintegroMostrado).toBe(2500);
    // El contacto se muestra con más, así que paga él: se decide sobre lo que se ve (FR-004).
    expect(r.quienPaga).toBe("u-lucia");
  });
});

describe("recomendarGrupo: grupo inválido (US1-17, FR-010)", () => {
  const motivo = (f: () => unknown): string | null => {
    try {
      f();
      return null;
    } catch (e) {
      expect(e).toBeInstanceOf(GrupoInvalidoError);
      return (e as GrupoInvalidoError).motivo;
    }
  };
  const ok: IntegranteDeGrupo[] = [yo(), contacto("u-lucia")];

  it("rechaza cada caso con su motivo", () => {
    expect(motivo(() => grupo(delGrupo(10000), [yo()], [promoGalicia]))).toBe("pocos_integrantes");
    expect(motivo(() => grupo(delGrupo(10000), [contacto("u-a"), contacto("u-b")], [promoGalicia]))).toBe("sin_quien_pide");
    expect(
      motivo(() => grupo(delGrupo(10000), [yo(), { ...yo(), id: "u-otro" } as IntegranteDeGrupo], [promoGalicia])),
    ).toBe("varios_piden");
    expect(motivo(() => grupo(delGrupo(10000), [yo(), contacto("u-a"), contacto("u-a")], [promoGalicia]))).toBe("repetidos");
    expect(motivo(() => grupo(delGrupo(10000), [yo(), contacto("U-A"), contacto("u-a")], [promoGalicia]))).toBe("repetidos");
    expect(motivo(() => grupo(delGrupo(10000), [yo(), sinCuenta(0), sinCuenta(0)], [promoGalicia]))).toBe("repetidos");
    const trece = [yo(), ...Array.from({ length: 12 }, (_, k) => sinCuenta(k))];
    expect(motivo(() => grupo(delGrupo(10000), trece, [promoGalicia]))).toBe("demasiados");
    expect(motivo(() => grupo(delGrupo(10000), trece.slice(0, 12), [promoGalicia]))).toBeNull();
    expect(motivo(() => grupo(delGrupo(0), ok, [promoGalicia]))).toBe("monto");
    expect(motivo(() => grupo(delGrupo(-5), ok, [promoGalicia]))).toBe("monto");
    expect(motivo(() => grupo(delGrupo(10.5), ok, [promoGalicia]))).toBe("monto");
    expect(motivo(() => grupo(delGrupo(10000), [yo(), sinCuenta(-1)], [promoGalicia]))).toBe("posicion");
    expect(motivo(() => grupo(delGrupo(10000), [yo(), sinCuenta(0.5)], [promoGalicia]))).toBe("posicion");
  });
});

/** PRNG con semilla fija (mulberry32): las permutaciones son siempre las mismas, sin `Math.random`. */
function prng(semilla: number): () => number {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function mezclar<T>(xs: readonly T[], azar: () => number): T[] {
  const ys = [...xs];
  for (let i = ys.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1));
    [ys[i], ys[j]] = [ys[j] as T, ys[i] as T];
  }
  return ys;
}

describe("recomendarGrupo: determinismo (US1-10, SC-001)", () => {
  it("100 permutaciones del mismo grupo dan exactamente la misma respuesta", () => {
    const integrantes: IntegranteDeGrupo[] = [
      yo([nacion]),
      // Empate a propósito entre u-mateo y u-ana (los dos ≈$2.000): gana u-ana.
      contacto("u-mateo"),
      contacto("u-ana"),
      contacto("u-zoe", [santander], [consumo("promo-santander", 3000)]),
      sinCuenta(0),
      sinCuenta(1),
    ];
    const ps = [promoSantander, promoGalicia, promo({ id: "otra-galicia", bancoId: GALICIA, porcentaje: 5 })];
    const primera = grupo(delGrupo(10003), integrantes, ps);
    expect(primera.quienPaga).toBe("u-ana");
    expect(partes(primera).reduce((a, b) => a + b, 0)).toBe(primera.total);

    const azar = prng(13);
    for (let k = 0; k < 100; k++) {
      expect(grupo(delGrupo(10003), mezclar(integrantes, azar), mezclar(ps, azar))).toEqual(primera);
    }
  });
});
