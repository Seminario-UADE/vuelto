import { describe, expect, it } from "vitest";
import type { MedioDePago } from "./modelo";
import { medioDelMotor, medioVista, nombreCorto } from "./vista";

const GALICIA = "88d8705e-2dda-46f9-8411-bb4916af858e";
const galicia: MedioDePago = { id: "m1", bancoId: GALICIA, nombreBanco: "Banco Galicia", tipo: "credito", red: "visa" };

describe("nombreCorto", () => {
  it("saca el «Banco» (y «de la») del principio: «Usar Galicia»", () => {
    expect(nombreCorto("Banco Galicia")).toBe("Galicia");
    expect(nombreCorto("Banco de la Nación Argentina")).toBe("Nación Argentina");
    expect(nombreCorto("BBVA")).toBe("BBVA");
  });

  it("si el nombre es solo «Banco», no lo deja vacío", () => {
    expect(nombreCorto("Banco")).toBe("Banco");
  });
});

describe("medioVista", () => {
  it("arma nombre, detalle e inicial con el banco, la red y el tipo", () => {
    expect(medioVista(galicia)).toEqual({
      id: "m1",
      banco: "Galicia",
      nombre: "Galicia Visa crédito",
      nombreCorto: "Galicia",
      detalle: "Crédito · Banco Galicia",
      inicial: "G",
      conCobertura: true,
    });
  });

  it("sin el nombre del banco no lo inventa: dice «Banco» y usa la etiqueta de la red", () => {
    const v = medioVista({ ...galicia, nombreBanco: null, tipo: "debito", red: "master" });
    expect(v.nombre).toBe("Mastercard débito");
    expect(v.detalle).toBe("Débito");
    expect(v.nombreCorto).toBe("Mastercard");
  });
});

describe("medioDelMotor", () => {
  it("pasa id, banco, tipo y red sin el nombre", () => {
    expect(medioDelMotor(galicia)).toEqual({ id: "m1", bancoId: GALICIA, tipo: "credito", red: "visa" });
  });
});

describe("medios de ejemplo", () => {
  it("las vistas armadas con los medios guardados dan los mismos textos que el catálogo de ejemplo", async () => {
    const { medios, mediosGuardados } = await import("../data/fixtures");
    for (const clave of Object.keys(mediosGuardados) as (keyof typeof mediosGuardados)[]) {
      expect(medioVista(mediosGuardados[clave])).toEqual(medios[clave]);
    }
  });
});
