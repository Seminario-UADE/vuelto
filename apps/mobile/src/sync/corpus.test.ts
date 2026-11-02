import { describe, expect, it } from "vitest";
import type { EstadoCorpus } from "../store/acciones";
import { aplicarPromociones, masReciente } from "./corpus";
import { filaAPromocion } from "./mapeo";
import { fila, ID } from "./prueba";

const AHORA = "2026-11-02T15:00:00.000Z";
const INICIO = "2026-11-01";

const vacio: EstadoCorpus = { promociones: [], marca: null, sincronizadoEn: null, descartadas: 0 };
const ejemplo: EstadoCorpus = { ...vacio, promociones: [filaAPromocion(fila(99))!] };

const ids = (c: EstadoCorpus) => c.promociones.map((p) => p.id).sort();

function sincronizado(actual: EstadoCorpus, filas: ReturnType<typeof fila>[], delServidor = filas.map((f) => f.id)) {
  return aplicarPromociones(actual, filas, { inicioPeriodo: INICIO, idsDelServidor: new Set(delServidor), ahora: AHORA });
}

describe("aplicarPromociones", () => {
  it("con marca null y al menos una promo, REEMPLAZA el corpus de ejemplo (no mezcla)", () => {
    const r = sincronizado(ejemplo, [fila(1), fila(2)]);
    expect(ids(r!)).toEqual([ID(1), ID(2)]);
    expect(r!.promociones.some((p) => p.id === ID(99))).toBe(false);
  });

  it("con marca null y cero promos no cambia nada (FR-013)", () => {
    expect(sincronizado(ejemplo, [])).toBeNull();
  });

  it("con marca no nula mezcla por id y gana la fila nueva", () => {
    const actual = sincronizado(vacio, [fila(1), fila(2)])!;
    const r = sincronizado(actual, [fila(2, { porcentaje: 30, actualizada_en: "2026-11-02T13:00:00.5+00:00" }), fila(3)], [
      ID(1),
      ID(2),
      ID(3),
    ])!;
    expect(ids(r)).toEqual([ID(1), ID(2), ID(3)]);
    expect(r.promociones.find((p) => p.id === ID(2))!.porcentaje).toBe(30);
  });

  it("la marca es el texto exacto de la última fila y no baja si llegan filas más viejas (margen)", () => {
    const a = sincronizado(vacio, [fila(1), fila(2)])!;
    expect(a.marca).toBe(fila(2).actualizada_en);
    // Relectura del margen: llega una fila anterior a la marca. La marca no retrocede.
    const b = sincronizado(a, [fila(1)], [ID(1), ID(2)])!;
    expect(b.marca).toBe(fila(2).actualizada_en);
  });

  it("sin filas nuevas conserva la marca y las promos; actualiza sincronizadoEn", () => {
    const a = sincronizado(vacio, [fila(1)])!;
    const b = aplicarPromociones(a, [], {
      inicioPeriodo: INICIO,
      idsDelServidor: new Set([ID(1)]),
      ahora: "2026-11-02T18:00:00.000Z",
    })!;
    expect(b.marca).toBe(a.marca);
    expect(ids(b)).toEqual([ID(1)]);
    expect(b.sincronizadoEn).toBe("2026-11-02T18:00:00.000Z");
  });

  it("una baja deja la promo en el corpus, vencida (su consumo sigue contando en el tope)", () => {
    const a = sincronizado(vacio, [fila(1), fila(2)])!;
    const r = sincronizado(a, [fila(1, { dada_de_baja_en: "2026-11-02T15:00:00+00:00", actualizada_en: "2026-11-02T14:00:00+00:00" })], [
      ID(1),
      ID(2),
    ])!;
    const p = r.promociones.find((x) => x.id === ID(1))!;
    expect(p.vigencia.hasta).toBe("2026-11-01");
  });

  it("una baja cuya fila no se puede mapear igual se aplica a la versión que había", () => {
    const a = sincronizado(vacio, [fila(1)])!;
    const r = sincronizado(a, [fila(1, { dada_de_baja_en: "2026-11-02T15:00:00+00:00", canal: "telepatia" })])!;
    expect(r.promociones.find((x) => x.id === ID(1))!.vigencia.hasta).toBe("2026-11-01");
    expect(r.descartadas).toBe(1);
  });

  it("una actualización inválida SACA la versión anterior de esa promo y cuenta la descartada", () => {
    const a = sincronizado(vacio, [fila(1), fila(2)])!;
    const r = sincronizado(a, [fila(2, { canal: "telepatia" })], [ID(1), ID(2)])!;
    expect(ids(r)).toEqual([ID(1)]);
    expect(r.descartadas).toBe(1);
  });

  it("una fila inválida de una promo nueva se descarta y se cuenta", () => {
    const r = sincronizado(vacio, [fila(1), fila(2, { jurisdiccion: "marte" })])!;
    expect(ids(r)).toEqual([ID(1)]);
    expect(r.descartadas).toBe(1);
  });

  it("saca los ids que el servidor ya no tiene (borrado físico o re-siembra, FR-009)", () => {
    const a = sincronizado(vacio, [fila(1), fila(2), fila(3)])!;
    const r = sincronizado(a, [fila(4)], [ID(4), ID(3)])!;
    expect(ids(r)).toEqual([ID(3), ID(4)]);
  });

  it("poda las promos vencidas antes del inicio del período (FR-011) y conserva las del período", () => {
    const a = sincronizado(vacio, [fila(1, { vigencia_hasta: "2026-10-31" }), fila(2, { vigencia_hasta: "2026-11-01" })])!;
    expect(ids(a)).toEqual([ID(2)]);
  });

  it("una vigencia acortada a antes del período saca la promo (la incremental no filtra por vigencia)", () => {
    const a = sincronizado(vacio, [fila(1)])!;
    const r = sincronizado(a, [fila(1, { vigencia_hasta: "2026-10-20", actualizada_en: "2026-11-02T14:00:00+00:00" })])!;
    expect(ids(r)).toEqual([]);
  });
});

describe("masReciente", () => {
  it("compara instantes, no texto: .1 es menor que .123456 y .5 mayor que .49", () => {
    expect(masReciente("2026-11-02T12:00:00.1+00:00", "2026-11-02T12:00:00.123456+00:00")).toBe(
      "2026-11-02T12:00:00.123456+00:00",
    );
    expect(masReciente("2026-11-02T12:00:00.5+00:00", "2026-11-02T12:00:00.49+00:00")).toBe("2026-11-02T12:00:00.5+00:00");
  });

  it("con el mismo milisegundo desempata por el texto (microsegundos)", () => {
    expect(masReciente("2026-11-02T12:00:00.123456+00:00", "2026-11-02T12:00:00.123789+00:00")).toBe(
      "2026-11-02T12:00:00.123789+00:00",
    );
  });

  it("null cede ante cualquier valor", () => {
    expect(masReciente(null, "2026-11-02T12:00:00+00:00")).toBe("2026-11-02T12:00:00+00:00");
    expect(masReciente("2026-11-02T12:00:00+00:00", null)).toBe("2026-11-02T12:00:00+00:00");
    expect(masReciente(null, null)).toBeNull();
  });
});

describe("aplicarPromociones: la primera sincronización con filas inválidas", () => {
  it("si ninguna fila sirve, no reemplaza el corpus de ejemplo ni mueve la marca (FR-013)", () => {
    const r = aplicarPromociones(ejemplo, [fila(1, { canal: "telepatia" }), fila(2, { jurisdiccion: "marte" })], {
      inicioPeriodo: INICIO,
      idsDelServidor: new Set([ID(1), ID(2)]),
      ahora: AHORA,
    });
    expect(r).toBeNull();
  });
});
