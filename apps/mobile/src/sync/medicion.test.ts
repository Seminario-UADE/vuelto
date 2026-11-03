import { describe, expect, it } from "vitest";
import { promociones } from "../data/fixtures";
import { informe, medirCorpus, proyectarCorpus, TOPE_TOTAL_BYTES } from "./medicion";

describe("medirCorpus (FR-020)", () => {
  it("cuenta promos, bytes del valor guardado, promedio y máximo por promo", () => {
    const m = medirCorpus(promociones);
    expect(m.cantidad).toBe(promociones.length);
    const porPromo = promociones.map((p) => new TextEncoder().encode(JSON.stringify(p)).length);
    expect(m.maximoPorPromo).toBe(Math.max(...porPromo));
    expect(m.promedioPorPromo).toBe(Math.round(porPromo.reduce((a, b) => a + b, 0) / porPromo.length));
    // El valor completo es más que la suma de las promos (lleva el envoltorio) y es lo que se compara con los topes.
    expect(m.bytesTotales).toBeGreaterThan(porPromo.reduce((a, b) => a + b, 0));
    expect(m.fraccionDe6MB).toBeCloseTo(m.bytesTotales / TOPE_TOTAL_BYTES, 10);
    expect(m.fraccionDe2MB).toBeCloseTo(m.bytesTotales / (2 * 1024 * 1024), 10);
  });

  it("un corpus vacío da ceros sin dividir por cero", () => {
    const m = medirCorpus([]);
    expect(m).toMatchObject({ cantidad: 0, promedioPorPromo: 0, maximoPorPromo: 0 });
    expect(Number.isFinite(m.fraccionDe6MB)).toBe(true);
  });

  it("la proyección escala el promedio de la muestra a la cantidad pedida", () => {
    const base = medirCorpus(promociones);
    const p = proyectarCorpus(promociones, 2000);
    expect(p.cantidad).toBe(2000);
    expect(p.bytesTotales).toBe(base.promedioPorPromo * 2000);
  });

  it("el informe rotula lo que muestra", () => {
    expect(informe(medirCorpus(promociones), "PROYECCIÓN")).toContain("PROYECCIÓN");
  });
});
