import { describe, expect, it } from "vitest";
import {
  CAMPOS_OBLIGATORIOS_PROMO,
  camposFaltantes,
  esPromocionPublicable,
} from "./publicable.ts";
import type { BorradorPromocion } from "./tipos.ts";

function borradorCompleto(): BorradorPromocion {
  return {
    id: "promo-1",
    fuente: "modo",
    titulo: "20% en Coto con Galicia",
    bancoId: "88d8705e-2dda-46f9-8411-bb4916af858e",
    categoriaId: 1,
    comercio: "Coto",
    porcentaje: 20,
    tarjetas: { debito: ["visa"], credito: ["visa", "master"] },
    vigencia: { desde: "2026-10-01", hasta: "2026-10-31", dias: ["mie"] },
    tope: { monto: 15000, periodo: "mensual", alcance: "compartido", grupoTopeId: "galicia-super" },
    montoMinimo: null,
    jurisdiccion: "caba",
    canal: "presencial",
    acumulable: null,
  };
}

describe("esPromocionPublicable", () => {
  it("acepta un borrador con todos los campos obligatorios", () => {
    const b = borradorCompleto();
    expect(camposFaltantes(b)).toEqual([]);
    expect(esPromocionPublicable(b)).toBe(true);
  });

  const anular: Record<(typeof CAMPOS_OBLIGATORIOS_PROMO)[number], (b: BorradorPromocion) => void> = {
    bancoId: (b) => (b.bancoId = null),
    categoriaId: (b) => (b.categoriaId = null),
    porcentaje: (b) => (b.porcentaje = null),
    "vigencia.desde": (b) => (b.vigencia.desde = null),
    "vigencia.hasta": (b) => (b.vigencia.hasta = null),
    tarjetas: (b) => (b.tarjetas = null),
  };

  it.each(CAMPOS_OBLIGATORIOS_PROMO)("rechaza el borrador si %s es null", (campo) => {
    const b = borradorCompleto();
    anular[campo](b);
    expect(camposFaltantes(b)).toEqual([campo]);
    expect(esPromocionPublicable(b)).toBe(false);
  });

  it("trata como faltante a tarjetas sin ninguna red", () => {
    const b = borradorCompleto();
    b.tarjetas = { debito: [], credito: [] };
    expect(camposFaltantes(b)).toEqual(["tarjetas"]);
  });

  it("acepta tarjetas con un solo tipo informado", () => {
    const b = borradorCompleto();
    b.tarjetas = { debito: ["cabal"], credito: [] };
    expect(esPromocionPublicable(b)).toBe(true);
  });

  it("devuelve todos los faltantes, en el orden de la lista", () => {
    const b = borradorCompleto();
    b.tarjetas = null;
    b.bancoId = null;
    b.vigencia.hasta = null;
    expect(camposFaltantes(b)).toEqual(["bancoId", "vigencia.hasta", "tarjetas"]);
  });

  it("no exige los campos no obligatorios", () => {
    const b = borradorCompleto();
    b.tope = { monto: null, periodo: null, alcance: null, grupoTopeId: null };
    b.comercio = null;
    b.vigencia.dias = null;
    b.jurisdiccion = null;
    b.canal = null;
    b.acumulable = null;
    expect(esPromocionPublicable(b)).toBe(true);
  });
});
