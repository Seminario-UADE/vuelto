import { describe, expect, it } from "vitest";
import {
  JURISDICCIONES_VALIDAS,
  mediosCompatibles,
  normalizar,
  primeraReglaQueFalla,
} from "./elegibilidad";
import { diaArgentina, fechaArgentina } from "./fecha";
import { AHORA, compra, medio, promo, SANTANDER } from "./test/fabricas";

const contexto = (datos = compra()) => ({
  compra: datos,
  fecha: fechaArgentina(AHORA),
  dia: diaArgentina(AHORA),
});

describe("elegibilidad: caso feliz", () => {
  it("una promo que cumple todas las reglas aplica al medio compatible", () => {
    const p = promo({
      comercio: "Coto",
      vigencia: { desde: "2026-10-01", hasta: "2026-10-31", dias: ["mie"] },
      montoMinimo: 5000,
      jurisdiccion: "caba",
      canal: "presencial",
    });
    expect(primeraReglaQueFalla(p, contexto(compra({ comercio: "Coto" })))).toBeNull();
    expect(mediosCompatibles(p, [medio()])).toEqual([medio()]);
  });

  it("normaliza el comercio sin mayúsculas, acentos ni espacios de más", () => {
    expect(normalizar("  COTO  ")).toBe(normalizar("Coto"));
    expect(normalizar("Café   Martínez")).toBe("cafe martinez");
  });

  it("las jurisdicciones válidas del MVP son nacional, CABA y PBA", () => {
    expect(JURISDICCIONES_VALIDAS).toEqual(["nacional", "caba", "pba"]);
  });

  it("una promo sin jurisdicción informada aplica", () => {
    expect(primeraReglaQueFalla(promo({ jurisdiccion: null }), contexto())).toBeNull();
  });

  it("el primer y el último día de la vigencia son válidos", () => {
    const desdeHoy = promo({ vigencia: { desde: "2026-10-21", hasta: "2026-10-31", dias: null } });
    const hastaHoy = promo({ vigencia: { desde: "2026-10-01", hasta: "2026-10-21", dias: null } });
    expect(primeraReglaQueFalla(desdeHoy, contexto())).toBeNull();
    expect(primeraReglaQueFalla(hastaHoy, contexto())).toBeNull();
  });

  it("solo es compatible el medio del mismo banco con una red aceptada para su tipo", () => {
    const p = promo({ tarjetas: { debito: ["master"], credito: ["visa"] } });
    const credito = medio();
    const debitoMaster = medio({ id: "galicia-debito-master", tipo: "debito", red: "master" });
    const debitoVisa = medio({ id: "galicia-debito-visa", tipo: "debito", red: "visa" });
    const otroBanco = medio({ id: "santander-credito-visa", bancoId: SANTANDER });
    expect(mediosCompatibles(p, [credito, debitoMaster, debitoVisa, otroBanco])).toEqual([
      credito,
      debitoMaster,
    ]);
  });
});
