import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { raizDelRepo } from "./args.ts";
import { describirBorrador, leerCrudo, opcionesDeArgumentos } from "./borrador.ts";
import type { Crudo } from "./mapear.ts";

function fixture(nombre: string): Crudo {
  return JSON.parse(readFileSync(new URL(`./test/detalles/${nombre}.json`, import.meta.url), "utf8")) as Crudo;
}

const OPCIONES = { categoriasDelDueno: [1, 4], hoy: "2026-11-02", catalogoBancos: null };

describe("describirBorrador", () => {
  it("imprime el borrador mapeado y las frases de la letra chica", () => {
    const salida = describirBorrador(fixture("tienda-nova"), OPCIONES);
    expect(salida).toContain("20off-tiendanova-macro-dic25");
    expect(salida).toContain('"fuenteId": "20off-tiendanova-macro-dic25"');
    expect(salida).toContain('"monto": 10000');
    expect(salida).toMatch(/\[no acumul\].*NO ACUMULA CON OTRA PROMOCIÓN/);
    expect(salida).toMatch(/\[tope\].*\$10\.000 POR USUARIO, POR MES/);
  });

  it("recuerda qué completa una persona", () => {
    const salida = describirBorrador(fixture("petrelli"), OPCIONES);
    expect(salida).toMatch(/acumulable/);
    expect(salida).toMatch(/jurisdiccion/);
    expect(salida).toMatch(/tope\.alcance/);
  });

  it("con muchas entradas muestra la primera y lista el resto por fuenteId", () => {
    const salida = describirBorrador(fixture("dona-catalina"), OPCIONES);
    expect(salida).toMatch(/24 entradas/);
    expect(salida.match(/"fuenteId"/g)).toHaveLength(1);
    expect(salida.match(/dona-catalina-nov26#b-[0-9a-f]{8}/g)!.length).toBeGreaterThanOrEqual(24);
  });

  it("muestra la exclusión propuesta", () => {
    const salida = describirBorrador(fixture("a-la-mesa"), OPCIONES);
    expect(salida).toContain("Exclusión propuesta: transversal");
    expect(salida).toContain("11 categorías");
  });

  it("informa un formato que el mapeo no reconoce, con su ruta, y muestra igual el legal", () => {
    const crudo = structuredClone(fixture("petrelli")) as unknown as { detalle: Record<string, any> } & Crudo; // eslint-disable-line @typescript-eslint/no-explicit-any
    crudo.detalle.conditions.schedule.days_of_week = ["someday"];
    const salida = describirBorrador(crudo, OPCIONES);
    expect(salida).toContain("No se pudo mapear");
    expect(salida).toContain("conditions.schedule.days_of_week[0]");
    expect(salida).toMatch(/\[tope\]/);
  });

  it("avisa cuando no hay ninguna frase de interés", () => {
    const crudo = structuredClone(fixture("petrelli")) as unknown as { detalle: Record<string, any> } & Crudo; // eslint-disable-line @typescript-eslint/no-explicit-any
    crudo.detalle.terms_and_conditions = "<p>Gracias.</p>";
    expect(describirBorrador(crudo, OPCIONES)).toContain("sin frases para revisar");
  });
});

describe("describirBorrador — fecha de cierre de la letra chica", () => {
  it("avisa cuando la fecha más reciente del legal ya pasó aunque MODO la liste como vigente", () => {
    const salida = describirBorrador(fixture("petrelli"), OPCIONES);
    expect(salida).toMatch(/Aviso: La letra chica menciona como fecha más reciente 30\/09\/2026, que ya pasó/);
    expect(salida).toMatch(/vigente hasta 2026-12-31/);
    expect(salida).toMatch(/la letra chica prevalece/i);
  });

  it("no avisa si la fecha es futura o el legal no trae fechas", () => {
    expect(describirBorrador(fixture("tienda-nova"), OPCIONES)).not.toMatch(/que ya pasó/);
    expect(describirBorrador(fixture("dona-catalina"), OPCIONES)).not.toMatch(/que ya pasó/);
  });
});

describe("leerCrudo", () => {
  it("lee el crudo de un slug de la carpeta", () => {
    const leidas: string[] = [];
    const crudo = leerCrudo("a-b", "carpeta", (ruta) => {
      leidas.push(ruta);
      return JSON.stringify({ capturadoEl: "2026-11-02", url: "u", tarjeta: null, detalle: {} });
    });
    expect(leidas).toEqual(["carpeta/a-b.json"]);
    expect(crudo.capturadoEl).toBe("2026-11-02");
  });

  it("rechaza un slug que no es seguro como nombre de archivo", () => {
    expect(() => leerCrudo("../x", "carpeta", () => "{}")).toThrow(/slug/);
  });

  it("un archivo que no es un crudo es un error que nombra el slug", () => {
    expect(() => leerCrudo("a", "carpeta", () => '{"x":1}')).toThrow(/a/);
  });
});

describe("opcionesDeArgumentos", () => {
  it("lee los slugs y usa la carpeta y los dueños por defecto", () => {
    expect(opcionesDeArgumentos(["slug-a", "slug-b"])).toEqual({
      slugs: ["slug-a", "slug-b"],
      carpeta: resolve(raizDelRepo(), "supabase/seed/crudo"),
      categoriasDelDueno: [1, 4],
    });
  });

  it("acepta carpeta y dueños propios", () => {
    const o = opcionesDeArgumentos(["x", "--carpeta", "otra", "--categorias", "2,5"]);
    expect(o).toMatchObject({ carpeta: resolve("otra"), categoriasDelDueno: [2, 5] });
  });

  it("sin slugs es un error", () => {
    expect(() => opcionesDeArgumentos([])).toThrow(/slug/);
  });
});
