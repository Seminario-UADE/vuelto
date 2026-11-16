import { describe, expect, it } from "vitest";
import type { Comercio } from "./contracts";
import {
  UMBRAL_PARECIDO,
  buscarEnCatalogo,
  nombreLimpio,
  parecido,
  sugerirComercio,
  type ResultadoSugerencia,
} from "./sugerir-comercio";

// Spec 015 (issue #134): la sugerencia del comercio del catálogo. Research R1-R5.

describe("nombreLimpio (spec 015, Definiciones)", () => {
  it.each([
    ["COTO C.I.C.S.A.", "coto"],
    ["Coto Suc. 112", "coto"],
    ["COTO SA", "coto"],
    ["COTO S.A.", "coto"],
    ["Musimundo S.R.L.", "musimundo"],
    ["Fravega SACIeI", "fravega"],
    ["Frávega S.A.C.I.e.I.", "fravega"],
    ["Mercado Libre S.A.S.", "mercado libre"],
    ["Easy Sucursal Palermo", "easy palermo"],
    ["Open25", "open"],
    ["Open 25", "open"],
    ["  Café   Martínez  ", "cafe martinez"],
    ["MC DONALD'S", "mc donald s"],
    ["", ""],
  ])("«%s» → «%s»", (nombre, limpio) => {
    expect(nombreLimpio(nombre)).toBe(limpio);
  });

  it("no saca palabras que solo empiezan como una forma societaria", () => {
    expect(nombreLimpio("Sabores de Salta")).toBe("sabores de salta");
    expect(nombreLimpio("Sucre Restaurant")).toBe("sucre restaurant");
  });
});

describe("parecido (research R1)", () => {
  it("1 si son iguales, 0 si no tienen nada en común", () => {
    expect(parecido("coto", "coto")).toBe(1);
    expect(parecido("abcd", "wxyz")).toBe(0);
  });

  it("cuenta una letra de más, de menos, cambiada o dos invertidas como una diferencia", () => {
    expect(parecido("carrefur", "carrefour")).toBeCloseTo(8 / 9);
    expect(parecido("shel", "shell")).toBeCloseTo(4 / 5);
    expect(parecido("farmasity", "farmacity")).toBeCloseTo(8 / 9);
    expect(parecido("jubmo", "jumbo")).toBeCloseTo(4 / 5);
  });

  it("es simétrico", () => {
    expect(parecido("havana", "havanna")).toBe(parecido("havanna", "havana"));
  });
});

/**
 * Lista de ajuste del umbral (research R2): distinta de los anexos de la spec, que se miden en
 * `sugerir-comercio.anexos.test.ts` y no se usan para ajustar.
 */
describe(`lista de ajuste del umbral (${UMBRAL_PARECIDO})`, () => {
  it.each([
    ["jumb", "jumbo"],
    ["farmasity", "farmacity"],
    ["mostasa", "mostaza"],
    ["carrefur", "carrefour"],
    ["havana", "havanna"],
    ["musimundoo", "musimundo"],
    ["dexer", "dexter"],
  ])("«%s» se parece a «%s»", (leido, catalogo) => {
    expect(parecido(leido, catalogo)).toBeGreaterThanOrEqual(UMBRAL_PARECIDO);
  });

  it.each([
    ["kiosco", "disco"],
    ["almacen", "carrefour"],
    ["sol", "shell"],
    ["lucho", "coto"],
    ["rosa", "coto"],
    ["easy", "vea"],
    ["grande", "grido"],
  ])("«%s» no se parece a «%s»", (leido, catalogo) => {
    expect(parecido(leido, catalogo)).toBeLessThan(UMBRAL_PARECIDO);
  });
});

const comercio = (nombre: string, categoriaId: number): Comercio => ({
  id: `${categoriaId}-${nombre.toLowerCase()}`,
  nombre,
  inicial: nombre.charAt(0),
  rubro: "otro",
  categoriaId,
  frecuente: false,
});

/** Ordenado por nombre y categoría, como `comerciosDelCorpus`. Coto está en dos rubros. */
const CATALOGO: Comercio[] = [
  comercio("Carrefour", 1),
  comercio("Coto", 1),
  comercio("Coto", 9),
  comercio("Día", 1),
  comercio("Disco", 1),
  comercio("Farmacity", 4),
  comercio("Jumbo", 1),
  comercio("Shell", 5),
  // Un rubro sin comercio, como los que suma `selectCatalogoParaCompras`: nunca se sugiere.
  { id: "rubro-1", nombre: "Supermercados", inicial: "S", rubro: "supermercado", categoriaId: 1, frecuente: false },
];

const sugerir = (nombre: string, textoTicket: string | null = null, categoriaConocida: number | null = null) =>
  sugerirComercio({ nombre, textoTicket, catalogo: CATALOGO, categoriaConocida });

const nombres = (r: ResultadoSugerencia) =>
  r.tipo === "sugerencias" ? r.sugerencias.map((s) => `${s.comercio.nombre}/${s.comercio.categoriaId}`) : [];

describe("sugerirComercio (spec 015, FR-001, FR-002, FR-006, FR-011, FR-013)", () => {
  it("coincide exacto en un solo rubro: la línea de confirmación, sin recuadro", () => {
    expect(sugerir("  jumbo ")).toEqual({ tipo: "coincide", comercio: CATALOGO[6] });
  });

  it("el mismo nombre en dos rubros y sin rubro conocido: «¿En qué rubro?», en orden de categoría", () => {
    expect(sugerir("COTO")).toEqual({ tipo: "elegir_rubro", opciones: [CATALOGO[1], CATALOGO[2]] });
  });

  it("con el rubro conocido (compra por confirmar, recomendación o una elegida) no se pregunta", () => {
    expect(sugerir("Coto", null, 9)).toEqual({ tipo: "coincide", comercio: CATALOGO[2] });
  });

  it("«COTO C.I.C.S.A.»: las sugerencias, con Coto primero", () => {
    const r = sugerir("COTO C.I.C.S.A.");
    expect(r).toMatchObject({ tipo: "sugerencias", titulo: "no_encontrado" });
    expect(nombres(r)).toEqual(["Coto/1", "Coto/9"]);
  });

  it("la razón social con la marca en otra línea del ticket: la marca primero, por el texto", () => {
    const r = sugerir("INC S.A.", "INC S.A.\nCUIT 30-12345678-9\nCARREFOUR MARKET\nTOTAL 1.000,00");
    expect(nombres(r)[0]).toBe("Carrefour/1");
    expect(r.tipo === "sugerencias" && r.sugerencias[0]?.origen).toBe("texto_del_ticket");
  });

  it("dos comercios en el texto: en el orden en que aparecen", () => {
    const r = sugerir("Cencosud S.A.", "CENCOSUD S.A.\nDISCO\nCon tu tarjeta Jumbo Más sumás puntos");
    expect(nombres(r).slice(0, 2)).toEqual(["Disco/1", "Jumbo/1"]);
  });

  it("un nombre de 3 letras o menos solo cuenta si ocupa una línea entera del texto", () => {
    expect(nombres(sugerir("Supermercado", "Lunes y martes: es el día de la semana"))).not.toContain("Día/1");
    expect(nombres(sugerir("Supermercado", "SUPERMERCADO\nDIA\nTOTAL"))).toContain("Día/1");
  });

  it("en el nombre leído, el nombre corto sí cuenta como palabra entera", () => {
    expect(nombres(sugerir("DIA ARGENTINA S.A."))[0]).toBe("Día/1");
  });

  it("por parecido, si supera el umbral", () => {
    expect(nombres(sugerir("Carrefur"))).toEqual(["Carrefour/1"]);
    expect(nombres(sugerir("Shel"))).toEqual(["Shell/5"]);
  });

  it("nada parecido: el recuadro sin sugerencias", () => {
    expect(sugerir("Perfumería Raffe")).toEqual({ tipo: "sugerencias", titulo: "no_encontrado", sugerencias: [] });
  });

  it("nombre vacío con un comercio en el texto: «¿Es alguno de estos?»", () => {
    expect(sugerir("", "FARMACITY\nTOTAL")).toMatchObject({ tipo: "sugerencias", titulo: "es_alguno" });
  });

  it("nombre vacío y nada en el texto: no hay recuadro", () => {
    expect(sugerir("", "TOTAL 1.000")).toEqual({ tipo: "nada" });
    expect(sugerir("   ")).toEqual({ tipo: "nada" });
  });

  it("nunca sugiere un rubro sin comercio, aunque el texto lo nombre", () => {
    const r = sugerir("Super del barrio", "SUPERMERCADOS\nTOTAL");
    expect(nombres(r)).not.toContain("Supermercados/1");
    expect(sugerir("Supermercados").tipo).not.toBe("coincide");
  });

  it("como mucho 3, sin repetir", () => {
    const r = sugerir("Coto Jumbo", "COTO\nJUMBO\nDISCO\nCARREFOUR");
    const lista = nombres(r);
    expect(lista.length).toBeLessThanOrEqual(3);
    expect(new Set(lista).size).toBe(lista.length);
  });

  it("es determinística: dos llamadas dan lo mismo", () => {
    expect(sugerir("COTO C.I.C.S.A.", "COTO\nTOTAL")).toEqual(sugerir("COTO C.I.C.S.A.", "COTO\nTOTAL"));
  });
});

describe("buscarEnCatalogo: «Buscar otro comercio» (spec 015, FR-007, FR-013)", () => {
  const buscar = (texto: string) => buscarEnCatalogo(CATALOGO, texto, 20).map((c) => `${c.nombre}/${c.categoriaId}`);

  it("primero los que contienen lo escrito: «jum» encuentra «Jumbo»", () => {
    expect(buscar("jum")).toEqual(["Jumbo/1"]);
  });

  it("después los parecidos: «farmasity» encuentra «Farmacity»", () => {
    expect(buscar("farmasity")).toEqual(["Farmacity/4"]);
  });

  it("los dos rubros de un comercio, sin repetir", () => {
    expect(buscar("cot")).toEqual(["Coto/1", "Coto/9"]);
  });

  it("nunca un rubro sin comercio, y nada sin texto", () => {
    expect(buscar("super")).toEqual([]);
    expect(buscar("   ")).toEqual([]);
  });
});

describe("tiempo (spec 015, SC-005)", () => {
  it("con 1.000 comercios y 60 líneas de ticket, menos de 100 ms", () => {
    const grande = Array.from({ length: 1000 }, (_, i) => comercio(`Comercio Numero ${String.fromCharCode(97 + (i % 26))}${i}x`, (i % 13) + 1));
    const texto = Array.from({ length: 60 }, (_, i) => `ITEM ${i} PRODUCTO VARIOS 1.234,56`).join("\n");
    // El catálogo se limpia una sola vez (research R5): la pantalla reusa el mismo catálogo en cada búsqueda.
    sugerirComercio({ nombre: "", textoTicket: null, catalogo: grande, categoriaConocida: null });
    const inicio = performance.now();
    sugerirComercio({ nombre: "COMERCIO NUMERIO S.A.", textoTicket: texto, catalogo: grande, categoriaConocida: null });
    expect(performance.now() - inicio).toBeLessThan(100);
  });
});
