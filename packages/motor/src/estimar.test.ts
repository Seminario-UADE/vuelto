import { describe, expect, it } from "vitest";
import { estimarTopes } from "./estimar.ts";
import { AHORA, compraRegistrada, GALICIA, medio, perfil, promo, SANTANDER } from "./test/fabricas.ts";
import type { Promocion, Tope } from "./tipos.ts";

const conTope = (id: string, monto: number | null, tope: Partial<Tope> = {}, datos: Partial<Promocion> = {}) =>
  promo({ id, tope: { monto, periodo: "mensual", alcance: null, grupoTopeId: null, ...tope }, ...datos });
const deGrupo = (id: string, monto: number | null, datos: Partial<Promocion> = {}) =>
  conTope(id, monto, { alcance: "compartido", grupoTopeId: "galicia-super" }, datos);
const vencida = { vigencia: { desde: "2026-10-01", hasta: "2026-10-10", dias: null } };

describe("estimarTopes (US1)", () => {
  it("US1-1: una estimación con tope, consumido, restante, base, período y medio", () => {
    const compras = ["c1", "c2", "c3"].map((id, i) =>
      compraRegistrada({ id, promocionId: "galicia", descuentoObtenido: [1000, 1000, 1500][i] ?? 0 }),
    );
    expect(estimarTopes([conTope("galicia", 10000)], compras, perfil(), AHORA)).toEqual([
      {
        grupoTopeId: null,
        bancoId: GALICIA,
        promocionIds: ["galicia"],
        mediosDePagoIds: ["galicia-credito-visa"],
        tope: 10000,
        consumido: 3500,
        restante: 6500,
        base: { comprasRegistradas: 3, comprasSinDescuentoInformado: 0 },
        periodo: { tipo: "mensual", desde: "2026-10-01", hasta: "2026-10-31" },
      },
    ]);
  });

  it("US1-2: un grupo compartido aparece una sola vez, con sus promos", () => {
    const r = estimarTopes([deGrupo("dia", 10000), deGrupo("coto", 10000)], [], perfil(), AHORA);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ grupoTopeId: "galicia-super", promocionIds: ["coto", "dia"] });
  });

  it("US1-3: un tope semanal va de lunes a domingo", () => {
    const r = estimarTopes([conTope("s", 5000, { periodo: "semanal" })], [], perfil(), AHORA);
    expect(r[0]?.periodo).toEqual({ tipo: "semanal", desde: "2026-10-19", hasta: "2026-10-25" });
  });

  it("US1-4: con perfil filtra por sus medios; sin perfil no filtra", () => {
    const santander = conTope("s", 5000, {}, { bancoId: SANTANDER });
    expect(estimarTopes([santander], [], perfil(), AHORA)).toEqual([]);
    expect(estimarTopes([santander], [], null, AHORA)).toMatchObject([{ promocionIds: ["s"], mediosDePagoIds: [] }]);
  });

  it("US1-5: un perfil sin medios no tiene topes", () => {
    expect(estimarTopes([conTope("galicia", 10000)], [], perfil([]), AHORA)).toEqual([]);
  });

  it("US1-6: sin tope, por compra, vencida o futura no tienen estimación propia", () => {
    const promos = [
      conTope("sin-tope", null),
      conTope("por-compra", 3000, { periodo: "por_compra" }),
      conTope("vencida", 5000, {}, vencida),
      conTope("futura", 5000, {}, { vigencia: { desde: "2026-11-01", hasta: "2026-11-30", dias: null } }),
    ];
    expect(estimarTopes(promos, [], perfil(), AHORA)).toEqual([]);
  });

  it("US1-7: un grupo cuyo único miembro aplicable está vencido no aparece", () => {
    const deOtroBanco = deGrupo("dia", 10000, { bancoId: SANTANDER });
    expect(estimarTopes([deGrupo("coto", 10000, vencida), deOtroBanco], [], perfil(), AHORA)).toEqual([]);
  });

  it("US1-8: semana que cruza de mes cuenta las compras del mes anterior", () => {
    const primeroDeOctubre = new Date("2026-10-01T15:00:00Z");
    const compras = [compraRegistrada({ promocionId: "s", fecha: "2026-09-29", descuentoObtenido: 1000 })];
    const r = estimarTopes([conTope("s", 5000, { periodo: "semanal" })], compras, perfil(), primeroDeOctubre);
    expect(r[0]).toMatchObject({
      periodo: { tipo: "semanal", desde: "2026-09-28", hasta: "2026-10-04" },
      base: { comprasRegistradas: 1 },
    });
  });

  it("US1-9: el resultado no depende del orden de las listas", () => {
    const promos = [conTope("b", 5000), conTope("a", 8000), deGrupo("g2", 10000), deGrupo("g1", 10000)];
    const compras = [
      compraRegistrada({ id: "c1", promocionId: "a", descuentoObtenido: 1000 }),
      compraRegistrada({ id: "c2", promocionId: "g1", descuentoObtenido: 2000 }),
    ];
    const primero = estimarTopes(promos, compras, perfil(), AHORA);
    expect(estimarTopes([...promos].reverse(), [...compras].reverse(), perfil(), AHORA)).toEqual(primero);
    // Orden fijo: por grupo, o por id de la promo si el saldo es propio (FR-006).
    expect(primero.map((e) => e.grupoTopeId ?? e.promocionIds[0])).toEqual(["a", "b", "galicia-super"]);
  });

  it("el banco es null si los miembros vigentes son de bancos distintos", () => {
    const r = estimarTopes([deGrupo("coto", 10000), deGrupo("dia", 10000, { bancoId: SANTANDER })], [], null, AHORA);
    expect(r[0]?.bancoId).toBeNull();
  });

  it("lista solo los medios del usuario que sirven para alguna promo vigente del saldo", () => {
    const debito = medio({ id: "galicia-debito-visa", tipo: "debito" });
    const otroBanco = medio({ id: "santander-credito-visa", bancoId: SANTANDER });
    const r = estimarTopes([conTope("galicia", 10000)], [], perfil([debito, otroBanco, medio()]), AHORA);
    expect(r[0]?.mediosDePagoIds).toEqual(["galicia-credito-visa"]);
  });
});
