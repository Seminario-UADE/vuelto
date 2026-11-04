import type { Promocion } from "@vuelto/motor";
import { describe, expect, it } from "vitest";
import { sincronizado } from "../store/acciones";
import { comerciosLeidos, mediosConfirmados } from "../store/perfil";
import { storeDePrueba } from "../store/prueba";
import {
  selectBuscarComercioPorId,
  selectCatalogoComercios,
  selectEntradasMotor,
  selectComercioSimulado,
  selectComerciosFrecuentes,
  selectHoy,
  selectRecomendacion,
} from "../store/selectores";
import { comercioElegido } from "../store/simulacion";
import { compraParaGuardar } from "./calculo";
import { buscarComercios, comerciosDelCorpus, etiquetaDeComercio, idDeComercio, nombreDeRubro } from "./comercios";
import { catalogoComercios, mediosDeEjemplo, promociones } from "./fixtures";

// Issue #43, spec 004 FR-030: el buscador sale de las promos del corpus, no de una lista a mano.
// Las promos de prueba son las de ejemplo con otro comercio, rubro o vigencia.

const base = promociones[0]!;
const promo = (id: string, cambios: Partial<Promocion>): Promocion => ({
  ...base,
  id,
  ...cambios,
  vigencia: { ...base.vigencia, desde: "2026-01-01", hasta: "2026-12-31", ...cambios.vigencia },
});
const HOY = "2026-11-04";

describe("comerciosDelCorpus (FR-030)", () => {
  it("un comercio por (nombre, rubro), sin las promos de toda la categoría ni las vencidas", () => {
    const corpus = [
      promo("a", { comercio: "COTO", categoriaId: 1 }),
      promo("b", { comercio: " coto  ", categoriaId: 1 }),
      promo("c", { comercio: null, categoriaId: 1 }),
      promo("d", { comercio: "Farmacity", categoriaId: 4, vigencia: { desde: "2026-01-01", hasta: "2026-11-03", dias: null } }),
      promo("e", { comercio: "Farmacity", categoriaId: 4, vigencia: { desde: "2026-01-01", hasta: HOY, dias: null } }),
    ];
    const r = comerciosDelCorpus(corpus, HOY);
    expect(r.map((c) => [c.nombre, c.categoriaId])).toEqual([
      ["COTO", 1],
      ["Farmacity", 4],
    ]);
    expect(r[0]).toMatchObject({ id: idDeComercio("coto", 1), rubro: "supermercado", inicial: "C", frecuente: false });
  });

  it("el mismo comercio en dos rubros aparece dos veces, y el chip lleva el rubro", () => {
    const r = comerciosDelCorpus(
      [promo("a", { comercio: "Carrefour", categoriaId: 1 }), promo("b", { comercio: "Carrefour", categoriaId: 10 })],
      HOY,
    );
    expect(r).toHaveLength(2);
    expect(r.map((c) => etiquetaDeComercio(c, r))).toEqual(["Carrefour · Supermercado", "Carrefour · Electro y Tecnología"]);
    expect(etiquetaDeComercio(r[0]!, [r[0]!])).toBe("Carrefour");
  });

  it("una categoría de MODO sin rubro propio en la app se nombra con el de MODO, sin perder su id", () => {
    const [c] = comerciosDelCorpus([promo("a", { comercio: "Puppis", categoriaId: 12 })], HOY);
    expect(c).toMatchObject({ rubro: "otro", categoriaId: 12 });
    expect(nombreDeRubro(c!)).toBe("Mascotas");
  });
});

describe("identidad del comercio", () => {
  it("«Café Martínez» y «Cafe  martinez» en el mismo rubro son uno solo", () => {
    const r = comerciosDelCorpus(
      [promo("a", { comercio: "Café Martínez", categoriaId: 2 }), promo("b", { comercio: "Cafe  martinez", categoriaId: 2 })],
      HOY,
    );
    expect(r.map((c) => c.nombre)).toEqual(["Café Martínez"]);
  });
});

describe("buscarComercios", () => {
  const catalogo = comerciosDelCorpus(
    [promo("a", { comercio: "FARMACITY", categoriaId: 4 }), promo("b", { comercio: "Café Martínez", categoriaId: 2 })],
    HOY,
  );
  it("sin acentos, mayúsculas ni espacios de más; sin texto, nada", () => {
    expect(buscarComercios(catalogo, "farma").map((c) => c.nombre)).toEqual(["FARMACITY"]);
    expect(buscarComercios(catalogo, "cafe martinez").map((c) => c.nombre)).toEqual(["Café Martínez"]);
    expect(buscarComercios(catalogo, " CAFÉ   martínez ").map((c) => c.nombre)).toEqual(["Café Martínez"]);
    expect(buscarComercios(catalogo, "  ")).toEqual([]);
  });
});

describe("selectCatalogoComercios", () => {
  it("antes de sincronizar es el catálogo de ejemplo (va con las promos de ejemplo)", () => {
    expect(selectCatalogoComercios(storeDePrueba().getState())).toBe(catalogoComercios);
  });

  it("con el corpus sincronizado, los comercios de sus promos; tocar uno da la recomendación de su rubro", () => {
    const s = storeDePrueba();
    s.dispatch(
      sincronizado({
        corpus: {
          promociones: [promo("p1", { comercio: "DIA", categoriaId: 1 })],
          marca: "2026-11-04T09:00:00+00:00",
          sincronizadoEn: "2026-11-04T09:00:00.000Z",
          descartadas: 0,
        },
        compras: [],
        ahora: "2026-11-04T15:00:00.000Z",
      }),
    );
    expect(selectHoy(s.getState())).toBe(HOY);
    const catalogo = selectCatalogoComercios(s.getState());
    expect(catalogo.map((c) => c.nombre)).toEqual(["DIA"]);
    s.dispatch(comercioElegido(catalogo[0]!.id));
    expect(selectComercioSimulado(s.getState())?.nombre).toBe("DIA");
    expect(selectRecomendacion(s.getState())).not.toBeNull();
  });

  it("un habitual que está en el corpus toma su rubro de ahí", () => {
    const s = storeDePrueba();
    s.dispatch(comerciosLeidos([{ id: "c1", nombre: "coto" }]));
    expect(selectComerciosFrecuentes(s.getState())[0]).toMatchObject({ nombre: "Coto", categoriaId: 1 });
  });

  it("un habitual que está en dos rubros del corpus da un acceso rápido por rubro", () => {
    const s = conCorpus([
      promo("a", { comercio: "Carrefour", categoriaId: 1 }),
      promo("b", { comercio: "Carrefour", categoriaId: 10 }),
    ]);
    s.dispatch(comerciosLeidos([{ id: "c1", nombre: "carrefour" }]));
    expect(selectComerciosFrecuentes(s.getState()).map((c) => c.categoriaId)).toEqual([1, 10]);
  });

  it("un id de antes de sincronizar («coto») sigue encontrando su comercio de ejemplo", () => {
    const s = conCorpus([promo("a", { comercio: "DIA", categoriaId: 1 })]);
    expect(selectBuscarComercioPorId(s.getState())("coto")).toMatchObject({ nombre: "Coto", categoriaId: 1 });
  });

  it("guardar una compra usa el mismo catálogo que la propuso: un comercio del corpus no queda sin rubro", () => {
    const s = conCorpus([promo("a", { comercio: "DIA", categoriaId: 1 })]);
    s.dispatch(mediosConfirmados(mediosDeEjemplo(["galicia-visa-credito"])));
    const estado = s.getState();
    const medio = estado.perfil.medios[0]!;
    const c = compraParaGuardar(
      selectEntradasMotor(estado),
      { modo: "manual", comercio: "dia", fecha: HOY, monto: 1000, medioId: medio.id, textoExtraido: null, usarPromo: true },
      "n1",
      selectCatalogoComercios(estado),
    );
    expect(c.categoriaId).toBe(1);
  });
});

function conCorpus(promos: Promocion[]) {
  const s = storeDePrueba();
  s.dispatch(
    sincronizado({
      corpus: { promociones: promos, marca: "2026-11-04T09:00:00+00:00", sincronizadoEn: "2026-11-04T09:00:00.000Z", descartadas: 0 },
      compras: [],
      ahora: "2026-11-04T15:00:00.000Z",
    }),
  );
  return s;
}
