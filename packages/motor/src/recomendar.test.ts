import { describe, expect, it } from "vitest";
import { PerfilSinMediosError } from "./errores.ts";
import { recomendar } from "./recomendar.ts";
import { AHORA, compra, compraRegistrada, medio, perfil, promo, SANTANDER } from "./test/fabricas.ts";
import type { OpcionDePago, Promocion, Tope } from "./tipos.ts";

/** La única promo de una opción individual. */
const unica = (o: OpcionDePago | null | undefined) => o?.promociones[0];

const galicia = medio();
const santander = medio({
  id: "santander-debito-master",
  bancoId: SANTANDER,
  tipo: "debito",
  red: "master",
});
const promoGalicia = promo();
const promoSantander = promo({
  id: "promo-santander",
  bancoId: SANTANDER,
  porcentaje: 10,
  tarjetas: { debito: ["master"], credito: [] },
});

describe("recomendar: US1", () => {
  it("US1-1: elige el medio con más ahorro y ordena las alternativas", () => {
    const r = recomendar(
      compra(),
      perfil([galicia, santander]),
      [promoSantander, promoGalicia],
      [],
      AHORA,
    );
    expect(r.mejor).toMatchObject({ medioDePagoId: galicia.id, ahorroEstimado: 2000 });
    expect(unica(r.mejor)?.promocionId).toBe(promoGalicia.id);
    expect(r.alternativas).toHaveLength(1);
    expect(r.alternativas[0]).toMatchObject({ medioDePagoId: santander.id, ahorroEstimado: 1000 });
    expect(unica(r.alternativas[0])?.promocionId).toBe(promoSantander.id);
    expect(r.descartadas).toEqual([]);
  });

  it("US1-2: ante igual ahorro desempata por medio y luego por promo, comparando por código", () => {
    // Por código "Z" < "a"; con localeCompare el orden sería el inverso.
    const medioA = medio({ id: "a-medio" });
    const medioZ = medio({ id: "Z-medio" });
    const promos = [promo({ id: "p2" }), promo({ id: "p1" })];
    const r = recomendar(compra(), perfil([medioA, medioZ]), promos, [], AHORA);
    const orden = [r.mejor, ...r.alternativas].map((o) => `${o?.medioDePagoId}/${unica(o)?.promocionId}`);
    expect(orden).toEqual(["Z-medio/p1", "Z-medio/p2", "a-medio/p1", "a-medio/p2"]);
  });

  it("US1-3: el resultado no depende de repetir la llamada ni del orden de las listas", () => {
    const primero = recomendar(
      compra(),
      perfil([galicia, santander]),
      [promoGalicia, promoSantander],
      [],
      AHORA,
    );
    expect(
      recomendar(compra(), perfil([galicia, santander]), [promoGalicia, promoSantander], [], AHORA),
    ).toEqual(primero);
    expect(
      recomendar(compra(), perfil([santander, galicia]), [promoSantander, promoGalicia], [], AHORA),
    ).toEqual(primero);
  });

  it("US1-4: sin medios de pago lanza PerfilSinMediosError", () => {
    expect(() => recomendar(compra(), perfil([]), [promoGalicia], [], AHORA)).toThrow(
      PerfilSinMediosError,
    );
  });

  it("US1-5: si ninguna promo aplica, no hay mejor opción y todas quedan descartadas", () => {
    const otraCategoria = promo({ id: "promo-farmacia", categoriaId: 4 });
    const r = recomendar(compra(), perfil([santander]), [promoGalicia, otraCategoria], [], AHORA);
    expect(r.mejor).toBeNull();
    expect(r.alternativas).toEqual([]);
    expect(r.descartadas.map((d) => d.promocionId)).toEqual(["promo-farmacia", "promo-galicia"]);
  });

  it("misma promo con dos medios del usuario: una opción por cada par", () => {
    const debito = medio({ id: "galicia-debito-visa", tipo: "debito" });
    const p = promo({ tarjetas: { debito: ["visa"], credito: ["visa"] } });
    const r = recomendar(compra(), perfil([galicia, debito]), [p], [], AHORA);
    expect([r.mejor, ...r.alternativas].map((o) => o?.medioDePagoId)).toEqual([
      "galicia-credito-visa",
      "galicia-debito-visa",
    ]);
  });

  it("mismo medio con dos promos: una opción por cada par, sin sumarlas", () => {
    const otra = promo({ id: "promo-galicia-2", porcentaje: 15 });
    const r = recomendar(compra(), perfil([galicia]), [promoGalicia, otra], [], AHORA);
    expect(r.mejor?.ahorroEstimado).toBe(2000);
    expect(r.alternativas.map((o) => o.ahorroEstimado)).toEqual([1500]);
  });

  it("no muta sus argumentos", () => {
    const c = compra();
    const pf = perfil([santander, galicia]);
    const promos = [promoSantander, promoGalicia];
    const copia = JSON.parse(JSON.stringify({ c, pf, promos }));
    recomendar(c, pf, promos, [], AHORA);
    expect({ c, pf, promos }).toEqual(copia);
  });
});

describe("recomendar: US2", () => {
  it("si falla varias reglas, informa la primera del orden fijo (FR-015)", () => {
    const p = promo({
      categoriaId: 4,
      vigencia: { desde: "2026-10-01", hasta: "2026-10-31", dias: ["vie"] },
    });
    expect(recomendar(compra(), perfil(), [p], [], AHORA).descartadas[0]?.causa).toBe("categoria");
  });

  it("una regla de la promo va antes que el medio de pago", () => {
    const p = promo({
      bancoId: SANTANDER,
      vigencia: { desde: "2026-10-01", hasta: "2026-10-31", dias: ["vie"] },
    });
    expect(recomendar(compra(), perfil([galicia]), [p], [], AHORA).descartadas[0]?.causa).toBe("dia");
  });

  it("una promo que falla con un medio y aplica con otro es opción, no descarte", () => {
    const r = recomendar(compra(), perfil([santander, galicia]), [promoGalicia], [], AHORA);
    expect(r.mejor?.medioDePagoId).toBe(galicia.id);
    expect(r.alternativas).toEqual([]);
    expect(r.descartadas).toEqual([]);
  });

  it("las descartadas se ordenan por id de promo, sin importar el orden de entrada (FR-023)", () => {
    const promos = ["p-c", "p-a", "p-b"].map((id) => promo({ id, categoriaId: 4 }));
    const r = recomendar(compra(), perfil(), promos, [], AHORA);
    expect(r.descartadas.map((d) => d.promocionId)).toEqual(["p-a", "p-b", "p-c"]);
  });

  it("cada promo queda en una opción o en exactamente un descarte (FR-003, SC-004)", () => {
    const promos = [
      promoGalicia,
      promoSantander,
      promo({ id: "promo-farmacia", categoriaId: 4 }),
      promo({ id: "promo-viernes", vigencia: { desde: "2026-10-01", hasta: "2026-10-31", dias: ["vie"] } }),
    ];
    const r = recomendar(compra(), perfil([galicia]), promos, [], AHORA);
    const enOpciones = new Set([r.mejor, ...r.alternativas].flatMap((o) => o?.promociones ?? []).map((a) => a.promocionId));
    const enDescartes = r.descartadas.map((d) => d.promocionId);
    for (const p of promos) {
      const veces = (enOpciones.has(p.id) ? 1 : 0) + enDescartes.filter((id) => id === p.id).length;
      expect(veces, p.id).toBe(1);
    }
  });

  it("todo motivo es un texto no vacío", () => {
    const promos = [promoGalicia, promo({ id: "promo-farmacia", categoriaId: 4 })];
    const r = recomendar(compra(), perfil(), promos, [], AHORA);
    const motivos = [r.mejor, ...r.alternativas, ...r.descartadas].map((x) => x?.motivo);
    expect(motivos.every((m) => typeof m === "string" && m.length > 0)).toBe(true);
  });
});

describe("recomendar: US3", () => {
  const conTope = (monto: number | null): Promocion =>
    promo({ tope: { monto, periodo: "mensual", alcance: null, grupoTopeId: null } });

  it("US3-1: el ahorro se limita al tope restante y la opción lleva su base", () => {
    const compras = [
      compraRegistrada({ id: "c1", descuentoObtenido: 1500 }),
      compraRegistrada({ id: "c2", descuentoObtenido: 2500 }),
    ];
    const r = recomendar(compra(), perfil(), [conTope(5000)], compras, AHORA);
    expect(unica(r.mejor)).toMatchObject({
      ahorroEstimado: 1000,
      topeRestanteTrasCompra: 0,
      base: { comprasRegistradas: 2, comprasSinDescuentoInformado: 0 },
    });
  });

  it("con tope de sobra, el restante tras la compra descuenta el ahorro", () => {
    const r = recomendar(compra(), perfil(), [conTope(5000)], [], AHORA);
    expect(unica(r.mejor)).toMatchObject({ ahorroEstimado: 2000, topeRestanteTrasCompra: 3000 });
  });

  it("US3-2: con el tope agotado la promo se descarta y nunca es la mejor", () => {
    const compras = [compraRegistrada({ descuentoObtenido: 5000 })];
    const r = recomendar(compra(), perfil(), [conTope(5000)], compras, AHORA);
    expect(r.mejor).toBeNull();
    expect(r.descartadas).toEqual([
      {
        promocionId: "promo-galicia",
        causa: "tope_agotado",
        mediosDePagoIds: ["galicia-credito-visa"],
        base: { comprasRegistradas: 1, comprasSinDescuentoInformado: 0 },
        motivo: "Tope agotado este mes, según 1 compra",
      },
    ]);
  });

  it("US3-3: las compras del mes anterior no consumen el tope de este mes", () => {
    const compras = [compraRegistrada({ fecha: "2026-09-30", descuentoObtenido: 5000 })];
    const r = recomendar(compra(), perfil(), [conTope(5000)], compras, AHORA);
    expect(unica(r.mejor)).toMatchObject({
      ahorroEstimado: 2000,
      topeRestanteTrasCompra: 3000,
      base: { comprasRegistradas: 0, comprasSinDescuentoInformado: 0 },
    });
  });

  it("US3-4: una compra sin descuento informado se estima con el porcentaje y cuenta como estimada", () => {
    const compras = [compraRegistrada({ monto: 10000, descuentoObtenido: null })];
    const r = recomendar(compra(), perfil(), [conTope(5000)], compras, AHORA);
    expect(unica(r.mejor)).toMatchObject({
      ahorroEstimado: 2000,
      topeRestanteTrasCompra: 1000,
      base: { comprasRegistradas: 1, comprasSinDescuentoInformado: 1 },
    });
  });

  it("US3-5: una compra estimada que llena el tope lo agota, con su base", () => {
    const compras = [compraRegistrada({ monto: 100000 })];
    const r = recomendar(compra(), perfil(), [conTope(5000)], compras, AHORA);
    expect(r.descartadas[0]).toMatchObject({
      causa: "tope_agotado",
      base: { comprasRegistradas: 1, comprasSinDescuentoInformado: 1 },
    });
  });

  it("US3-6: sin tope informado, porcentaje completo, sin restante ni base, y el motivo lo dice", () => {
    const r = recomendar(compra(), perfil(), [conTope(null)], [compraRegistrada()], AHORA);
    expect(unica(r.mejor)).toMatchObject({ ahorroEstimado: 2000, topeRestanteTrasCompra: null, base: null });
    expect(r.mejor?.motivo).toContain("no informa tope");
  });

  it("US3-7: con tope y sin compras, la base es cero y cero", () => {
    const r = recomendar(compra(), perfil(), [conTope(5000)], [], AHORA);
    expect(unica(r.mejor)?.base).toEqual({ comprasRegistradas: 0, comprasSinDescuentoInformado: 0 });
  });

  it("una promo agotada no impide recomendar otra que sí tiene tope", () => {
    const agotada = { ...conTope(5000), id: "promo-agotada" };
    const compras = [compraRegistrada({ promocionId: "promo-agotada", descuentoObtenido: 5000 })];
    const r = recomendar(compra(), perfil(), [agotada, conTope(5000)], compras, AHORA);
    expect(unica(r.mejor)?.promocionId).toBe("promo-galicia");
    expect(r.descartadas.map((d) => d.causa)).toEqual(["tope_agotado"]);
  });

  it("SC-005: ningún tope sin su base; los descartes por otra causa no llevan base", () => {
    const promos = [
      conTope(5000),
      { ...conTope(5000), id: "promo-agotada" },
      { ...conTope(null), id: "promo-sin-tope" },
      { ...conTope(5000), id: "promo-farmacia", categoriaId: 4 },
    ];
    const compras = [compraRegistrada({ promocionId: "promo-agotada", descuentoObtenido: 5000 })];
    const r = recomendar(compra(), perfil(), promos, compras, AHORA);
    for (const a of [r.mejor, ...r.alternativas].flatMap((o) => o?.promociones ?? [])) {
      expect(a.topeRestanteTrasCompra === null || a.base !== null, a.promocionId).toBe(true);
    }
    for (const d of r.descartadas) {
      expect(d.base !== null, d.promocionId).toBe(d.causa === "tope_agotado");
    }
  });
});

describe("recomendar: períodos del tope (issue #37, US1)", () => {
  const conTope = (monto: number, periodo: Tope["periodo"]): Promocion =>
    promo({ tope: { monto, periodo, alcance: null, grupoTopeId: null } });

  it("US1-1: semanal con una compra del lunes", () => {
    const compras = [compraRegistrada({ fecha: "2026-10-19", descuentoObtenido: 4000 })];
    const r = recomendar(compra(), perfil(), [conTope(6000, "semanal")], compras, AHORA);
    expect(unica(r.mejor)).toMatchObject({
      ahorroEstimado: 2000,
      topeRestanteTrasCompra: 0,
      base: { comprasRegistradas: 1, comprasSinDescuentoInformado: 0 },
    });
  });

  it("US1-2: semanal, la compra de la semana anterior no cuenta", () => {
    const compras = [compraRegistrada({ fecha: "2026-10-18", descuentoObtenido: 6000 })];
    const r = recomendar(compra(), perfil(), [conTope(6000, "semanal")], compras, AHORA);
    expect(unica(r.mejor)).toMatchObject({
      ahorroEstimado: 2000,
      topeRestanteTrasCompra: 4000,
      base: { comprasRegistradas: 0, comprasSinDescuentoInformado: 0 },
    });
  });

  it("US1-3: semanal agotado se descarta con su base", () => {
    const compras = [compraRegistrada({ fecha: "2026-10-20", descuentoObtenido: 6000 })];
    const r = recomendar(compra(), perfil(), [conTope(6000, "semanal")], compras, AHORA);
    expect(r.mejor).toBeNull();
    expect(r.descartadas[0]).toMatchObject({
      causa: "tope_agotado",
      base: { comprasRegistradas: 1, comprasSinDescuentoInformado: 0 },
    });
  });

  it("US1-4: por compra limita el ahorro en cada compra, sin mirar las anteriores", () => {
    const compras = [compraRegistrada({ descuentoObtenido: 9000 })];
    const r = recomendar(compra({ monto: 20000 }), perfil(), [conTope(3000, "por_compra")], compras, AHORA);
    expect(unica(r.mejor)).toMatchObject({ ahorroEstimado: 3000, topeRestanteTrasCompra: null, base: null });
    expect(r.mejor?.motivo).toContain("$3.000 por compra");
  });

  it("US1-5: mensual se comporta como en la issue #36", () => {
    const compras = [compraRegistrada({ fecha: "2026-10-02", descuentoObtenido: 4000 })];
    const r = recomendar(compra(), perfil(), [conTope(5000, "mensual")], compras, AHORA);
    expect(unica(r.mejor)).toMatchObject({ ahorroEstimado: 1000, topeRestanteTrasCompra: 0 });
  });

  it("tope por compra de $0: descarte por tope agotado sin base (FR-015)", () => {
    const r = recomendar(compra(), perfil(), [conTope(0, "por_compra")], [], AHORA);
    expect(r.descartadas).toEqual([
      {
        promocionId: "promo-galicia",
        causa: "tope_agotado",
        mediosDePagoIds: ["galicia-credito-visa"],
        base: null,
        motivo: "Tope agotado",
      },
    ]);
  });
});

describe("recomendar: promos acumulables (issue #37, US2)", () => {
  const acumulable = (id: string, porcentaje: number, datos: Partial<Promocion> = {}) =>
    promo({ id, porcentaje, acumulable: true, ...datos });
  const ids = (o: OpcionDePago | null | undefined) => o?.promociones.map((a) => a.promocionId);

  it("US2-1: dos acumulables del mismo medio se suman en una sola opción", () => {
    const r = recomendar(compra(), perfil(), [acumulable("B", 10), acumulable("A", 20)], [], AHORA);
    expect(r.alternativas).toEqual([]);
    expect(r.mejor).toMatchObject({ medioDePagoId: galicia.id, ahorroEstimado: 3000 });
    expect(r.mejor?.promociones.map((a) => [a.promocionId, a.ahorroEstimado])).toEqual([
      ["A", 2000],
      ["B", 1000],
    ]);
  });

  it("US2-2 y SC-004: con acumulabilidad no informada no se suman", () => {
    const r = recomendar(compra(), perfil(), [acumulable("A", 20), acumulable("B", 10, { acumulable: null })], [], AHORA);
    expect(ids(r.mejor)).toEqual(["A"]);
    expect(r.alternativas.map(ids)).toEqual([["B"]]);
  });

  it("US2-3: la combinada compite con la no acumulable", () => {
    const promos = [acumulable("A", 20), acumulable("B", 10), acumulable("C", 25, { acumulable: false })];
    const r = recomendar(compra(), perfil(), promos, [], AHORA);
    expect([r.mejor, ...r.alternativas].map((o) => [ids(o), o?.ahorroEstimado])).toEqual([
      [["A", "B"], 3000],
      [["C"], 2500],
    ]);
  });

  it("US2-4: cada promo de la combinada respeta su propio tope", () => {
    const a = acumulable("A", 20, { tope: { monto: 5000, periodo: "mensual", alcance: null, grupoTopeId: null } });
    const compras = [compraRegistrada({ promocionId: "A", descuentoObtenido: 4500 })];
    const r = recomendar(compra(), perfil(), [a, acumulable("B", 10)], compras, AHORA);
    expect(r.mejor?.ahorroEstimado).toBe(1500);
    // Orden de la lista: ahorro sin tope (A 20% antes que B 10%), aunque A aporte menos.
    expect(r.mejor?.promociones).toEqual([
      {
        promocionId: "A",
        ahorroEstimado: 500,
        topeRestanteTrasCompra: 0,
        base: { comprasRegistradas: 1, comprasSinDescuentoInformado: 0 },
      },
      {
        promocionId: "B",
        ahorroEstimado: 1000,
        topeRestanteTrasCompra: null,
        base: null,
      },
    ]);
  });

  it("US2-5: acumulables de medios distintos no se suman", () => {
    const b = acumulable("B", 10, { bancoId: SANTANDER, tarjetas: { debito: ["master"], credito: [] } });
    const r = recomendar(compra(), perfil([galicia, santander]), [acumulable("A", 20), b], [], AHORA);
    expect([r.mejor, ...r.alternativas].map(ids)).toEqual([["A"], ["B"]]);
  });

  it("US2-6: una acumulable que aplica a dos medios se suma solo donde tiene con qué", () => {
    const debito = medio({ id: "galicia-debito-visa", tipo: "debito" });
    const a = acumulable("A", 20, { tarjetas: { debito: ["visa"], credito: ["visa"] } });
    const r = recomendar(compra(), perfil([galicia, debito]), [a, acumulable("B", 10)], [], AHORA);
    expect([r.mejor, ...r.alternativas].map((o) => [o?.medioDePagoId, ids(o)])).toEqual([
      ["galicia-credito-visa", ["A", "B"]],
      ["galicia-debito-visa", ["A"]],
    ]);
  });

  it("una sola acumulable es una opción individual", () => {
    const r = recomendar(compra(), perfil(), [acumulable("A", 20)], [], AHORA);
    expect(ids(r.mejor)).toEqual(["A"]);
    expect(r.mejor?.motivo).toBe("20% en supermercados · la promo no informa tope");
  });

  it("una acumulable con el tope agotado se descarta y las demás se combinan igual", () => {
    const a = acumulable("A", 20, { tope: { monto: 5000, periodo: "mensual", alcance: null, grupoTopeId: null } });
    const compras = [compraRegistrada({ promocionId: "A", descuentoObtenido: 5000 })];
    const r = recomendar(compra(), perfil(), [a, acumulable("B", 10), acumulable("C", 15)], compras, AHORA);
    expect(ids(r.mejor)).toEqual(["C", "B"]);
    expect(r.descartadas.map((d) => [d.promocionId, d.causa])).toEqual([["A", "tope_agotado"]]);
  });

  it("el ahorro de la opción es la suma de sus promos y el motivo las nombra a todas", () => {
    const r = recomendar(compra(), perfil(), [acumulable("A", 20), acumulable("B", 10)], [], AHORA);
    const suma = r.mejor?.promociones.reduce((t, a) => t + a.ahorroEstimado, 0);
    expect(r.mejor?.ahorroEstimado).toBe(suma);
    expect(r.mejor?.motivo).toBe(
      "20% en supermercados · la promo no informa tope + 10% en supermercados · la promo no informa tope",
    );
  });
});

describe("recomendar: topes compartidos (issue #37, US3)", () => {
  const deGrupo = (id: string, monto: number, datos: Partial<Promocion> = {}) =>
    promo({ id, tope: { monto, periodo: "mensual", alcance: "compartido", grupoTopeId: "galicia-super" }, ...datos });
  const coto = (monto = 10000, datos: Partial<Promocion> = {}) => deGrupo("coto", monto, { comercio: "Coto", ...datos });
  const dia = (monto = 10000) => deGrupo("dia", monto, { comercio: "Día" });
  const enDia = (monto: number) => compra({ comercio: "Día", monto });
  const vencida = { vigencia: { desde: "2026-10-01", hasta: "2026-10-10", dias: null } };

  it("US3-1: lo consumido con Coto limita el ahorro con Día", () => {
    const compras = [compraRegistrada({ promocionId: "coto", descuentoObtenido: 6000 })];
    const r = recomendar(enDia(30000), perfil(), [coto(), dia()], compras, AHORA);
    expect(unica(r.mejor)).toMatchObject({
      promocionId: "dia",
      ahorroEstimado: 4000,
      topeRestanteTrasCompra: 0,
      base: { comprasRegistradas: 1, comprasSinDescuentoInformado: 0 },
    });
  });

  it("US3-2: una promo exclusiva no se ve afectada por el consumo de otra", () => {
    const exclusiva = promo({ id: "excl", tope: { monto: 5000, periodo: "mensual", alcance: "exclusivo", grupoTopeId: null } });
    const compras = [compraRegistrada({ promocionId: "coto", descuentoObtenido: 6000 })];
    const r = recomendar(compra(), perfil(), [coto(), exclusiva], compras, AHORA);
    expect(unica(r.mejor)).toMatchObject({ promocionId: "excl", ahorroEstimado: 2000, topeRestanteTrasCompra: 3000 });
  });

  it("US3-3: con topes distintos en el grupo se usa el menor", () => {
    const r = recomendar(enDia(50000), perfil(), [coto(10000), dia(8000)], [], AHORA);
    expect(unica(r.mejor)).toMatchObject({ promocionId: "dia", ahorroEstimado: 8000, topeRestanteTrasCompra: 0 });
  });

  it("US3-4: la compra con una promo vencida del grupo descuenta, y la vencida queda descartada", () => {
    const compras = [compraRegistrada({ promocionId: "coto", descuentoObtenido: 6000 })];
    // Sin restricción de comercio, para que la causa sea la vigencia y no el comercio.
    const r = recomendar(enDia(30000), perfil(), [deGrupo("coto", 10000, vencida), dia()], compras, AHORA);
    expect(unica(r.mejor)).toMatchObject({ promocionId: "dia", ahorroEstimado: 4000 });
    expect(r.descartadas.map((d) => [d.promocionId, d.causa])).toEqual([["coto", "vigencia"]]);
  });

  it("US3-5 y SC-003: dos acumulables del grupo no superan el saldo", () => {
    const a = deGrupo("A", 10000, { acumulable: true });
    const b = deGrupo("B", 10000, { porcentaje: 10, acumulable: true });
    const compras = [compraRegistrada({ promocionId: "A", descuentoObtenido: 7500 })];
    const r = recomendar(compra(), perfil(), [a, b], compras, AHORA);
    expect(r.mejor?.ahorroEstimado).toBe(2500);
    expect(r.mejor?.promociones.map((p) => [p.promocionId, p.ahorroEstimado, p.topeRestanteTrasCompra])).toEqual([
      ["A", 2000, 0],
      ["B", 500, 0],
    ]);
  });

  it("US3-6: con el grupo agotado, todas sus promos se descartan con la base del grupo", () => {
    const compras = [compraRegistrada({ promocionId: "coto", descuentoObtenido: 10000 })];
    const r = recomendar(compra(), perfil(), [deGrupo("coto", 10000), deGrupo("dia", 10000)], compras, AHORA);
    expect(r.mejor).toBeNull();
    expect(r.descartadas.map((d) => [d.promocionId, d.causa, d.base?.comprasRegistradas])).toEqual([
      ["coto", "tope_agotado", 1],
      ["dia", "tope_agotado", 1],
    ]);
  });

  it("US3-7: si otra promo de la combinada agota el saldo, la segunda queda con $0 y no se descarta", () => {
    const a = deGrupo("A", 10000, { acumulable: true });
    const b = deGrupo("B", 10000, { porcentaje: 10, acumulable: true });
    const compras = [compraRegistrada({ promocionId: "A", descuentoObtenido: 8000 })];
    const r = recomendar(compra(), perfil(), [a, b], compras, AHORA);
    expect(r.mejor?.promociones.map((p) => [p.promocionId, p.ahorroEstimado])).toEqual([
      ["A", 2000],
      ["B", 0],
    ]);
    expect(r.mejor?.motivo).toContain("sin tope disponible: lo usa otra promoción de este banco");
    expect(r.descartadas).toEqual([]);
  });

  it("una promo con ahorro $0 por su propio monto no lleva la aclaración del tope compartido", () => {
    const a = promo({ id: "A", acumulable: true, tope: { monto: 5000, periodo: "mensual", alcance: null, grupoTopeId: null } });
    const b = promo({ id: "B", porcentaje: 10, acumulable: true });
    // 20% de 4 centavos redondea a 0 centavos.
    const r = recomendar(compra({ monto: 0.04 }), perfil(), [a, b], [], AHORA);
    expect(r.mejor?.promociones.map((p) => p.ahorroEstimado)).toEqual([0, 0]);
    expect(r.mejor?.motivo).not.toContain("sin tope disponible");
  });

  it("desempate: compara las listas de promos elemento por elemento", () => {
    // Por texto unido con ",", "a b,..." quedaría antes que "a,..." porque " " < ",".
    const p1 = promo({ id: "a", acumulable: true });
    const p2 = promo({ id: "z", acumulable: true });
    const p3 = promo({ id: "a b", porcentaje: 40 });
    const r = recomendar(compra(), perfil(), [p3, p1, p2], [], AHORA);
    expect([r.mejor, ...r.alternativas].map((o) => o?.promociones.map((x) => x.promocionId))).toEqual([
      ["a", "z"],
      ["a b"],
    ]);
  });

  it("US3-8: el monto de una promo vencida no achica el saldo del grupo", () => {
    const compras = [compraRegistrada({ promocionId: "coto", descuentoObtenido: 3000 })];
    const r = recomendar(enDia(50000), perfil(), [coto(5000, vencida), dia(10000)], compras, AHORA);
    expect(unica(r.mejor)).toMatchObject({ promocionId: "dia", ahorroEstimado: 7000, topeRestanteTrasCompra: 0 });
  });
});

describe("recomendar: motivos (issue #46)", () => {
  const conTope = promo({ tope: { monto: 5000, periodo: "mensual", alcance: null, grupoTopeId: null } });

  it("el motivo dice cuánto tope queda tras la compra, con su base", () => {
    const compras = [compraRegistrada({ descuentoObtenido: 1000 })];
    const r = recomendar(compra(), perfil(), [conTope], compras, AHORA);
    expect(r.mejor?.motivo).toBe("20% en supermercados · te quedan ≈$2.000 de tope, según 1 compra de octubre");
  });

  it("sin compras en el período, el motivo no da cifra de tope", () => {
    const r = recomendar(compra(), perfil(), [conTope], [], AHORA);
    expect(r.mejor?.motivo).toBe(
      "20% en supermercados · sin compras registradas este mes, todavía no podemos estimar cuánto tope te queda",
    );
  });

  it("cada descarte trae los medios del usuario a los que aplicaba la promo, ordenados", () => {
    const debito = medio({ id: "galicia-debito-visa", tipo: "debito" });
    const sabados = promo({
      tarjetas: { debito: ["visa"], credito: ["visa"] },
      vigencia: { desde: "2026-10-01", hasta: "2026-10-31", dias: ["sab"] },
    });
    const r = recomendar(compra(), perfil([debito, galicia]), [sabados, promoSantander], [], AHORA);
    expect(r.descartadas.map((d) => [d.promocionId, d.mediosDePagoIds, d.motivo])).toEqual([
      ["promo-galicia", ["galicia-credito-visa", "galicia-debito-visa"], "Hoy no aplica, la promo es los sábados"],
      ["promo-santander", [], "La promo es para un banco o una tarjeta que no tenés en tu perfil"],
    ]);
  });

  it("una promo de otro banco descartada por otra causa también trae la lista vacía", () => {
    const santanderSabados = promo({
      ...promoSantander,
      vigencia: { desde: "2026-10-01", hasta: "2026-10-31", dias: ["sab"] },
    });
    const r = recomendar(compra(), perfil([galicia]), [santanderSabados], [], AHORA);
    expect(r.descartadas.map((d) => [d.causa, d.mediosDePagoIds])).toEqual([["dia", []]]);
  });
});

describe("recomendar: rendimiento", () => {
  it("SC-003: 2.000 promos y 100 compras en menos de 1 segundo", () => {
    const promos = Array.from({ length: 2000 }, (_, i) =>
      promo({
        id: `promo-${i}`,
        categoriaId: i % 2 === 0 ? 1 : 4,
        tope: { monto: 5000, periodo: "mensual", alcance: null, grupoTopeId: null },
      }),
    );
    const compras = Array.from({ length: 100 }, (_, i) =>
      compraRegistrada({ id: `compra-${i}`, promocionId: `promo-${i * 2}` }),
    );
    const inicio = Date.now();
    const r = recomendar(compra(), perfil([galicia, santander]), promos, compras, AHORA);
    expect(Date.now() - inicio).toBeLessThan(1000);
    expect(r.alternativas.length + r.descartadas.length + 1).toBe(2000);
  });
});
