import { describe, expect, it } from "vitest";
import { quitarComercio, SELECCION_VACIA, tocarComercio } from "./seleccion-comercios";

// Spec 012, US4 escenarios 2 a 5 (FR-025, FR-026): la selección de la primera respuesta.

describe("selección de comercios de la primera respuesta", () => {
  it("arranca sin marcados ni respuesta (FR-026: se puede seguir así)", () => {
    expect(SELECCION_VACIA).toEqual({ marcados: [], activo: null });
  });

  it("tocar un comercio lo marca y muestra su respuesta", () => {
    expect(tocarComercio(SELECCION_VACIA, "dia")).toEqual({ marcados: ["dia"], activo: "dia" });
  });

  it("tocar otro pasa la respuesta a ese y los dos quedan marcados", () => {
    const s = tocarComercio(tocarComercio(SELECCION_VACIA, "dia"), "farmacity");
    expect(s).toEqual({ marcados: ["dia", "farmacity"], activo: "farmacity" });
  });

  it("tocar uno ya marcado muestra su respuesta y no lo desmarca", () => {
    const s = tocarComercio(tocarComercio(tocarComercio(SELECCION_VACIA, "dia"), "farmacity"), "dia");
    expect(s).toEqual({ marcados: ["dia", "farmacity"], activo: "dia" });
  });

  it("la × desmarca; si era el de la respuesta, pasa al último marcado que queda", () => {
    let s = tocarComercio(tocarComercio(tocarComercio(SELECCION_VACIA, "coto"), "dia"), "farmacity");
    s = quitarComercio(s, "farmacity");
    expect(s).toEqual({ marcados: ["coto", "dia"], activo: "dia" });
  });

  it("la × sobre otro que no es el de la respuesta no cambia la respuesta", () => {
    const s = quitarComercio(tocarComercio(tocarComercio(SELECCION_VACIA, "coto"), "dia"), "coto");
    expect(s).toEqual({ marcados: ["dia"], activo: "dia" });
  });

  it("quitar el último marcado deja sin respuesta", () => {
    expect(quitarComercio(tocarComercio(SELECCION_VACIA, "dia"), "dia")).toEqual(SELECCION_VACIA);
  });

  it("quitar uno que no estaba marcado no cambia nada", () => {
    const s = tocarComercio(SELECCION_VACIA, "dia");
    expect(quitarComercio(s, "coto")).toBe(s);
  });
});
