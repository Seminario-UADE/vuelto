import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { aTexto, fechaDeCierreDelLegal, fechasDelLegal, resaltar } from "./resaltar.ts";
import type { Crudo } from "./mapear.ts";

function legal(nombre: string): string {
  const crudo = JSON.parse(readFileSync(new URL(`./test/detalles/${nombre}.json`, import.meta.url), "utf8")) as Crudo;
  return (crudo.detalle as { terms_and_conditions: string }).terms_and_conditions;
}

describe("aTexto", () => {
  it("saca las etiquetas y decodifica las entidades", () => {
    expect(aTexto('<p class="x"><span>Hola&nbsp;&amp; chau</span></p><p>otra &quot;línea&quot;</p>')).toBe(
      'Hola & chau otra "línea"',
    );
  });

  it("decodifica entidades numéricas y junta los espacios", () => {
    expect(aTexto("a&#233;   b&#x41;\n\n c")).toBe("aé bA c");
  });

  it("un texto vacío da un texto vacío", () => {
    expect(aTexto("")).toBe("");
  });
});

describe("resaltar", () => {
  it("marca la frase de no acumulable del legal de Tienda Nova", () => {
    const frases = resaltar(legal("tienda-nova"));
    const noAcumula = frases.find((f) => f.terminos.includes("no acumul"));
    expect(noAcumula?.frase).toContain("NO ACUMULA CON OTRA PROMOCIÓN");
  });

  it("marca la frase del tope del legal de Tienda Nova", () => {
    const frases = resaltar(legal("tienda-nova"));
    const tope = frases.find((f) => f.terminos.includes("tope"));
    expect(tope?.frase).toContain("$10.000 POR USUARIO, POR MES");
  });

  it("marca el tope por día y las sucursales del legal de Petrelli", () => {
    const frases = resaltar(legal("petrelli"));
    expect(frases.some((f) => f.frase.includes("POR DÍA") && f.terminos.includes("tope"))).toBe(true);
    expect(frases.some((f) => f.terminos.includes("sucursal"))).toBe(true);
  });

  it("marca la acumulabilidad afirmativa de Doña Catalina y que no aplica online", () => {
    const frases = resaltar(legal("dona-catalina"));
    expect(frases.some((f) => /acumulable con otros descuentos/i.test(f.frase) && f.terminos.includes("acumul"))).toBe(true);
    expect(frases.some((f) => /no aplica para compras online/i.test(f.frase) && f.terminos.includes("online"))).toBe(true);
  });

  it("reconoce la negación aunque no sea «no acumula»: «no será acumulable»", () => {
    const f = resaltar("<p>El beneficio no será acumulable con otros descuentos y/o promociones del comercio.</p>");
    expect(f[0]?.terminos).toEqual(["no acumul"]);
    const g = resaltar("<p>NO SE SUPERPONE NI ES ACUMULATIVO CON OTROS BENEFICIOS.</p>");
    expect(g[0]?.terminos).toEqual(["no acumul"]);
  });

  it("una frase afirmativa sigue siendo solo «acumul»", () => {
    const f = resaltar("<p>La Bonificación podrá ser acumulable con otros descuentos bancarios vigentes.</p>");
    expect(f[0]?.terminos).toEqual(["acumul"]);
  });

  it("CABAL no cuenta como CABA, pero CABA sola sí", () => {
    const a = resaltar("<p>VALIDO CON TARJETAS CABAL EN TODO EL PAÍS.</p>");
    expect(a).toEqual([]);
    const b = resaltar("<p>FLORIDA 99, CABA.</p>");
    expect(b[0]?.terminos).toEqual(["caba"]);
  });

  it("detecta provincia y AMBA", () => {
    const f = resaltar("<p>VÁLIDO EN LA PROVINCIA DE BUENOS AIRES Y EL AMBA.</p>");
    expect(f[0]?.terminos).toEqual(expect.arrayContaining(["provincia", "amba"]));
  });

  it("detecta compartido y mínimo, sin importar acentos ni mayúsculas", () => {
    const f = resaltar("<p>Tope compartido con otras promociones. Compra mínima de $40.000.</p>");
    expect(f.map((x) => x.terminos)).toEqual([["tope", "compartid"], ["minim"]]);
  });

  it("no parte una frase por el punto de los miles", () => {
    const f = resaltar("<p>TOPE DE $10.000 POR USUARIO.</p>");
    expect(f).toHaveLength(1);
    expect(f[0]?.frase).toContain("$10.000");
  });

  it("un legal sin ningún término devuelve una lista vacía", () => {
    expect(resaltar("<p>Gracias por su compra.</p>")).toEqual([]);
  });
});

describe("fechasDelLegal", () => {
  it("devuelve las fechas dd/mm/aaaa como ISO, ordenadas", () => {
    expect(fechasDelLegal("VÁLIDO DEL 01/07/2026 AL 31/10/2026. RESOLUCIÓN DEL 5/3/2020.")).toEqual([
      "2020-03-05",
      "2026-07-01",
      "2026-10-31",
    ]);
  });

  it("descarta lo que no es una fecha real", () => {
    expect(fechasDelLegal("EL 31/02/2026 Y EL 99/99/2026")).toEqual([]);
  });

  it("sin fechas devuelve una lista vacía", () => {
    expect(fechasDelLegal("Gracias por su compra.")).toEqual([]);
  });
});

describe("fechaDeCierreDelLegal", () => {
  it("es la fecha más reciente que menciona el legal", () => {
    expect(fechaDeCierreDelLegal(legal("petrelli"))).toBe("2026-09-30");
    expect(fechaDeCierreDelLegal(legal("tienda-nova"))).toBe("2026-12-31");
  });

  it("null si el legal no trae fechas o está vacío", () => {
    expect(fechaDeCierreDelLegal(legal("dona-catalina"))).toBeNull();
    expect(fechaDeCierreDelLegal("")).toBeNull();
  });
});
