import { describe, expect, it } from "vitest";
import { validarCompraPropuesta } from "./validacion.ts";

const valido = { comercio: "Kansas", categoriaId: 2, monto: 15000, canal: "presencial" };

/** Copia de la compra válida sin un campo. */
function sin(campo: keyof typeof valido): Record<string, unknown> {
  const copia: Record<string, unknown> = { ...valido };
  delete copia[campo];
  return copia;
}

function campoInvalido(body: unknown): string | null {
  const r = validarCompraPropuesta(body);
  return r.ok ? null : r.campo;
}

describe("validarCompraPropuesta (FR-019)", () => {
  it("acepta una compra válida, con comercio o sin comercio", () => {
    expect(validarCompraPropuesta(valido)).toEqual({ ok: true, compra: valido });
    expect(validarCompraPropuesta({ ...valido, comercio: null, canal: "online" })).toEqual({
      ok: true,
      compra: { ...valido, comercio: null, canal: "online" },
    });
  });

  it("recorta los espacios de los extremos del comercio", () => {
    const r = validarCompraPropuesta({ ...valido, comercio: "  Kansas  " });
    expect(r).toEqual({ ok: true, compra: valido });
  });

  it("rechaza un body que no es un objeto", () => {
    for (const body of [null, [], "texto", 5, undefined]) {
      expect(campoInvalido(body)).toBe("body");
    }
  });

  it("rechaza campos extra, nombrando el primero", () => {
    expect(campoInvalido({ ...valido, x: 1 })).toBe("x");
  });

  it("valida categoriaId", () => {
    expect(campoInvalido(sin("categoriaId"))).toBe("categoriaId");
    expect(campoInvalido({ ...valido, categoriaId: "2" })).toBe("categoriaId");
    expect(campoInvalido({ ...valido, categoriaId: 2.5 })).toBe("categoriaId");
  });

  it("valida monto: mayor a 0, hasta 100.000.000, hasta 2 decimales", () => {
    for (const monto of [0, -1, 100000000.01, 10.123, Number.NaN, Number.POSITIVE_INFINITY, "100"]) {
      expect(campoInvalido({ ...valido, monto })).toBe("monto");
    }
    for (const monto of [100000000, 10.1, 0.01, 1234.56, 0.29]) {
      expect(campoInvalido({ ...valido, monto })).toBeNull();
    }
  });

  it("valida canal", () => {
    expect(campoInvalido({ ...valido, canal: "ambos" })).toBe("canal");
    expect(campoInvalido(sin("canal"))).toBe("canal");
  });

  it("valida comercio: null o texto de 1 a 100 caracteres", () => {
    for (const comercio of ["", "   ", "a".repeat(101), 5]) {
      expect(campoInvalido({ ...valido, comercio })).toBe("comercio");
    }
    expect(campoInvalido(sin("comercio"))).toBe("comercio");
    expect(campoInvalido({ ...valido, comercio: "a".repeat(100) })).toBeNull();
    expect(campoInvalido({ ...valido, comercio: "☕".repeat(100) })).toBeNull();
    expect(campoInvalido({ ...valido, comercio: "🍔".repeat(100) })).toBeNull();
    expect(campoInvalido({ ...valido, comercio: "🍔".repeat(101) })).toBe("comercio");
  });

  it("informa el primer campo que falla en orden fijo", () => {
    const todoMal = { comercio: "", categoriaId: "x", monto: 0, canal: "x" };
    expect(campoInvalido(todoMal)).toBe("categoriaId");
    expect(campoInvalido({ ...todoMal, categoriaId: 2 })).toBe("monto");
    expect(campoInvalido({ ...todoMal, categoriaId: 2, monto: 1 })).toBe("canal");
    expect(campoInvalido({ ...todoMal, extra: true })).toBe("extra");
  });
});
