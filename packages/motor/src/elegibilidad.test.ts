import { describe, expect, it } from "vitest";
import {
  JURISDICCIONES_VALIDAS,
  mediosCompatibles,
  normalizar,
  primeraReglaQueFalla,
} from "./elegibilidad";
import { diaArgentina, fechaArgentina } from "./fecha";
import { recomendar } from "./recomendar";
import { AHORA, compra, medio, perfil, promo, SANTANDER } from "./test/fabricas";
import type { CausaDescarte, CompraPropuesta, Promocion } from "./tipos";

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

describe("elegibilidad: una regla que falla sola da su causa (SC-002)", () => {
  const casos: [string, CausaDescarte, Partial<Promocion>, Partial<CompraPropuesta>][] = [
    ["solo los viernes, consulta un miércoles", "dia", { vigencia: { desde: "2026-10-01", hasta: "2026-10-31", dias: ["vie"] } }, {}],
    ["venció ayer", "vigencia", { vigencia: { desde: "2026-10-01", hasta: "2026-10-20", dias: null } }, {}],
    ["empieza mañana", "vigencia", { vigencia: { desde: "2026-10-22", hasta: "2026-10-31", dias: null } }, {}],
    ["banco no declarado", "medio_de_pago", { bancoId: SANTANDER }, {}],
    ["red no declarada", "medio_de_pago", { tarjetas: { debito: [], credito: ["master"] } }, {}],
    ["monto mínimo no alcanzado", "monto_minimo", { montoMinimo: 20000 }, { monto: 15000 }],
    ["solo online, compra presencial", "canal", { canal: "online" }, { canal: "presencial" }],
    ["otra categoría", "categoria", { categoriaId: 4 }, {}],
    ["otro comercio", "comercio", { comercio: "Coto" }, { comercio: "Jumbo" }],
    ["compra sin comercio contra promo de un comercio", "comercio", { comercio: "Coto" }, { comercio: null }],
    ["otra provincia", "jurisdiccion", { jurisdiccion: "otra_provincia" }, {}],
  ];

  it.each(casos)("%s ⇒ %s", (_, causa, datosPromo, datosCompra) => {
    const r = recomendar(compra(datosCompra), perfil(), [promo(datosPromo)], [], AHORA);
    expect(r.mejor).toBeNull();
    expect(r.descartadas).toHaveLength(1);
    expect(r.descartadas[0]?.causa).toBe(causa);
    expect(r.descartadas[0]?.motivo).not.toBe("");
  });

  it.each(["nacional", "caba", "pba"] as const)("una promo de jurisdicción %s aplica", (jurisdiccion) => {
    const r = recomendar(compra(), perfil(), [promo({ jurisdiccion })], [], AHORA);
    expect(r.mejor).not.toBeNull();
  });

  it("el monto mínimo se cumple con el monto justo", () => {
    const r = recomendar(compra({ monto: 20000 }), perfil(), [promo({ montoMinimo: 20000 })], [], AHORA);
    expect(r.mejor).not.toBeNull();
  });
});
