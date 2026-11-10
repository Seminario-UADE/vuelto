import { describe, expect, it } from "vitest";
import { esPreferencia, esquemaEfectivo, esquemaParaElSistema, leerPreferencia } from "./apariencia";

describe("apariencia", () => {
  it("lee una preferencia guardada y vuelve a «sistema» con cualquier otra cosa", () => {
    expect(leerPreferencia("oscuro")).toBe("oscuro");
    expect(leerPreferencia("claro")).toBe("claro");
    expect(leerPreferencia(null)).toBe("sistema");
    expect(leerPreferencia("sepia")).toBe("sistema");
    expect(esPreferencia(3)).toBe(false);
  });

  it("la preferencia manda sobre el sistema, salvo en «sistema»", () => {
    expect(esquemaEfectivo("sistema", "oscuro")).toBe("oscuro");
    expect(esquemaEfectivo("sistema", "claro")).toBe("claro");
    expect(esquemaEfectivo("claro", "oscuro")).toBe("claro");
    expect(esquemaEfectivo("oscuro", "claro")).toBe("oscuro");
  });

  it("al sistema operativo le pide el esquema, o `unspecified` para devolverle el control", () => {
    expect(esquemaParaElSistema("claro")).toBe("light");
    expect(esquemaParaElSistema("oscuro")).toBe("dark");
    expect(esquemaParaElSistema("sistema")).toBe("unspecified");
  });
});
