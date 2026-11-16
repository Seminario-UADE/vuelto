import { describe, expect, it } from "vitest";
import { ESQUEMA_LECTURA, validarLecturaCruda } from "./esquema.ts";
import type { LecturaCruda } from "./extractor.ts";

function lectura(): LecturaCruda {
  return {
    montoImpreso: "$ 24.500,00",
    comercio: "SUPERMERCADO LA ESQUINA",
    fechaImpresa: "14/10/26",
    medio: { bancoImpreso: null, tipoImpreso: "DEBITO", redImpresa: "VISA", ultimos4Impresos: "1234" },
    texto: "SUPERMERCADO LA ESQUINA\nTOTAL 24.500,00",
  };
}

describe("validarLecturaCruda", () => {
  it("acepta una lectura completa, con texto y con null", () => {
    expect(validarLecturaCruda(lectura())).toEqual({ ok: true, lectura: lectura() });
    const vacia = {
      montoImpreso: null,
      comercio: null,
      fechaImpresa: null,
      medio: { bancoImpreso: null, tipoImpreso: null, redImpresa: null, ultimos4Impresos: null },
      texto: null,
    };
    expect(validarLecturaCruda(vacia)).toEqual({ ok: true, lectura: vacia });
  });

  it("rechaza una clave que falta, sin devolver valores", () => {
    const sinComercio: Record<string, unknown> = { ...lectura() };
    delete sinComercio["comercio"];
    expect(validarLecturaCruda(sinComercio)).toEqual({ ok: false, camino: "comercio", regla: "requerido" });
    const r = lectura();
    const medioSinRed: Record<string, unknown> = { ...r.medio };
    delete medioSinRed["redImpresa"];
    expect(validarLecturaCruda({ ...r, medio: medioSinRed })).toEqual({
      ok: false,
      camino: "medio.redImpresa",
      regla: "requerido",
    });
  });

  it("rechaza una clave de más", () => {
    expect(validarLecturaCruda({ ...lectura(), descuento: "100" })).toEqual({
      ok: false,
      camino: "descuento",
      regla: "adicional",
    });
    const r = lectura();
    expect(validarLecturaCruda({ ...r, medio: { ...r.medio, banco: "x" } })).toEqual({
      ok: false,
      camino: "medio.banco",
      regla: "adicional",
    });
  });

  it("rechaza un tipo distinto de texto o null, sin copiar el valor", () => {
    const r = validarLecturaCruda({ ...lectura(), montoImpreso: 24500 });
    expect(r).toEqual({ ok: false, camino: "montoImpreso", regla: "tipo" });
    expect(JSON.stringify(r)).not.toContain("24500");
  });

  it("rechaza un medio que no es objeto y una respuesta que no es objeto", () => {
    expect(validarLecturaCruda({ ...lectura(), medio: null })).toEqual({ ok: false, camino: "medio", regla: "tipo" });
    expect(validarLecturaCruda([lectura()])).toEqual({ ok: false, camino: "", regla: "tipo" });
    expect(validarLecturaCruda("texto")).toEqual({ ok: false, camino: "", regla: "tipo" });
  });
});

describe("ESQUEMA_LECTURA", () => {
  it("tiene las mismas claves que valida el servidor, todas requeridas y nullables, sin adicionales", () => {
    const claves = Object.keys(lectura()).sort();
    expect(Object.keys(ESQUEMA_LECTURA.properties).sort()).toEqual(claves);
    expect([...ESQUEMA_LECTURA.required].sort()).toEqual(claves);
    expect(ESQUEMA_LECTURA.additionalProperties).toBe(false);

    const medio = ESQUEMA_LECTURA.properties.medio;
    const clavesMedio = Object.keys(lectura().medio).sort();
    expect(Object.keys(medio.properties).sort()).toEqual(clavesMedio);
    expect([...medio.required].sort()).toEqual(clavesMedio);
    expect(medio.additionalProperties).toBe(false);

    for (const [clave, prop] of Object.entries(ESQUEMA_LECTURA.properties)) {
      if (clave === "medio") continue;
      expect(prop).toEqual({ type: ["string", "null"], description: expect.any(String) });
    }
    for (const prop of Object.values(medio.properties)) {
      expect(prop).toEqual({ type: ["string", "null"], description: expect.any(String) });
    }
  });
});
