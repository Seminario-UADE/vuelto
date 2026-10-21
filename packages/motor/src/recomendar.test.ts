import { describe, expect, it } from "vitest";
import { PerfilSinMediosError } from "./errores";
import { recomendar } from "./recomendar";
import { AHORA, compra, medio, perfil, promo, SANTANDER } from "./test/fabricas";

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
    expect(r.mejor).toMatchObject({
      medioDePagoId: galicia.id,
      promocionId: promoGalicia.id,
      ahorroEstimado: 2000,
    });
    expect(r.alternativas).toHaveLength(1);
    expect(r.alternativas[0]).toMatchObject({
      medioDePagoId: santander.id,
      promocionId: promoSantander.id,
      ahorroEstimado: 1000,
    });
    expect(r.descartadas).toEqual([]);
  });

  it("US1-2: ante igual ahorro desempata por medio y luego por promo, comparando por código", () => {
    // Por código "Z" < "a"; con localeCompare el orden sería el inverso.
    const medioA = medio({ id: "a-medio" });
    const medioZ = medio({ id: "Z-medio" });
    const promos = [promo({ id: "p2" }), promo({ id: "p1" })];
    const r = recomendar(compra(), perfil([medioA, medioZ]), promos, [], AHORA);
    const orden = [r.mejor, ...r.alternativas].map((o) => `${o?.medioDePagoId}/${o?.promocionId}`);
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
