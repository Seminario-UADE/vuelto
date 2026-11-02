import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  AHORA_CORPUS_ISO,
  calcularSalidas,
  ejecutarGeneracion,
  formatoCanonico,
  generarBancosSql,
  generarFixtures,
  generarPromocionesSql,
} from "./generar.ts";
import { idDePromocion } from "./ids.ts";
import { leerInsumos } from "./insumos.ts";
import { BANCO_GALICIA, BANCO_ICBC, entrada } from "./test/fabricas.ts";
import type { ArchivoCorpus, EntradaCorpus, Insumos } from "./tipos.ts";

const BANCOS = [
  { id: BANCO_ICBC, name: "ICBC" },
  { id: BANCO_GALICIA, name: "Galicia" },
];

function insumos(promociones: EntradaCorpus[]): Insumos {
  return {
    archivo: { version: 1, promociones },
    exclusiones: [],
    gruposTope: {},
    bancos: BANCOS,
  };
}

describe("generarBancosSql", () => {
  it("emite un upsert de los bancos con el nombre del catálogo", () => {
    const sql = generarBancosSql(BANCOS);
    expect(sql).toContain("GENERADO");
    expect(sql).toContain("insert into public.bancos (id, nombre) values");
    expect(sql).toContain(`('${BANCO_ICBC}', 'ICBC')`);
    expect(sql).toContain("on conflict (id) do update set nombre = excluded.nombre;");
  });

  it("escapa las comillas simples de un nombre", () => {
    expect(generarBancosSql([{ id: BANCO_ICBC, name: "Banco D'Argento" }])).toContain("'Banco D''Argento'");
  });

  it("ordena por id, sin importar el orden de entrada", () => {
    const sql = generarBancosSql([...BANCOS].reverse());
    expect(sql.indexOf(BANCO_GALICIA)).toBeLessThan(sql.indexOf(BANCO_ICBC));
  });

  it("sin bancos no emite ninguna sentencia", () => {
    expect(generarBancosSql([])).not.toContain("insert into");
  });
});

describe("generarPromocionesSql", () => {
  const sql = generarPromocionesSql([
    entrada({
      comercio: "Paladini",
      tope: { monto: 10000, periodo: "mensual", alcance: "exclusivo", grupoTopeId: null },
      acumulable: false,
      jurisdiccion: "caba",
      fragmentosFuente: { acumulable: "NO ACUMULA", jurisdiccion: "FLORIDA 99, CABA" },
    }),
  ]);

  it("es un upsert por la clave natural y no toca la baja de otras promos", () => {
    expect(sql).toContain("insert into public.promociones");
    expect(sql).toContain("on conflict (fuente, fuente_id) do update set");
    expect(sql).not.toMatch(/delete from/i);
  });

  it("usa el id UUID v5 de la promo", () => {
    expect(sql).toContain(`'${idDePromocion("manual", "20-paladini-icbc-ago26")}'`);
  });

  it("escribe cada columna con su tipo", () => {
    expect(sql).toContain("'manual'");
    expect(sql).toContain("'20-paladini-icbc-ago26'");
    expect(sql).toContain(`'${BANCO_ICBC}'`);
    expect(sql).toContain("array['visa']::text[]");
    expect(sql).toContain("array['visa','master']::text[]");
    expect(sql).toContain("'2026-08-07'::date");
    expect(sql).toContain("array['vie']::text[]");
    expect(sql).toContain("10000");
    expect(sql).toContain("'mensual'");
    expect(sql).toContain("'exclusivo'");
    expect(sql).toContain("false");
    expect(sql).toContain("'caba'");
    expect(sql).toContain("'presencial'");
  });

  it("escribe los fragmentos fuente como jsonb con la forma { campo: texto | null }", () => {
    expect(sql).toContain(`'{"acumulable":"NO ACUMULA","jurisdiccion":"FLORIDA 99, CABA"}'::jsonb`);
  });

  it("una lista de redes vacía es un arreglo vacío, y un dato ausente es null", () => {
    const s = generarPromocionesSql([
      entrada({
        tarjetas: { debito: [], credito: ["visa"] },
        comercio: null,
        vigencia: { desde: "2026-01-01", hasta: "2026-02-01", dias: null },
        tope: { monto: null, periodo: null, alcance: null, grupoTopeId: null },
        canal: null,
        fragmentosFuente: {},
      }),
    ]);
    expect(s).toContain("'{}'::text[]");
    expect(s).toContain("null");
    expect(s).toContain("'{}'::jsonb");
  });

  it("no incluye la revisión ni la marca de fixture: no son columnas", () => {
    const s = generarPromocionesSql([entrada({ revision: { verificadaEl: "2026-11-02", revisor: "persona-x", notas: ["una nota"] }, fixture: true })]);
    expect(s).not.toContain("persona-x");
    expect(s).not.toContain("una nota");
    expect(s).not.toContain("fixture");
  });

  it("escapa las comillas simples de los textos y de los fragmentos", () => {
    const s = generarPromocionesSql([
      entrada({ titulo: "20% en D'Angelo", acumulable: false, fragmentosFuente: { acumulable: "NO ACUMULA CON 'OTRAS'" } }),
    ]);
    expect(s).toContain("'20% en D''Angelo'");
    expect(s).toContain(`"NO ACUMULA CON ''OTRAS''"`);
  });

  it("al reactivar una promo limpia la baja", () => {
    expect(sql).toContain("dada_de_baja_en = null");
  });

  it("ordena por categoría y fuenteId sin importar el orden de entrada", () => {
    const a = entrada({ fuenteId: "b", categoriaId: 1 });
    const b = entrada({ fuenteId: "a", categoriaId: 4 });
    const c = entrada({ fuenteId: "a", categoriaId: 1 });
    const s = generarPromocionesSql([a, b, c]);
    const orden = ["'a'", "'b'"].map((x) => s.indexOf(x));
    expect(orden[0]).toBeLessThan(orden[1]!);
    // categoría 4 va después de la 1
    expect(s.lastIndexOf("'a'")).toBeGreaterThan(s.indexOf("'b'"));
  });

  it("sin promociones no emite ninguna sentencia", () => {
    const s = generarPromocionesSql([]);
    expect(s).not.toContain("insert into");
    expect(s).toContain("GENERADO");
  });

  it("es determinista", () => {
    const e = [entrada(), entrada({ fuenteId: "otra" })];
    expect(generarPromocionesSql(e)).toBe(generarPromocionesSql([...e].reverse()));
  });
});

describe("generarFixtures", () => {
  it("emite solo las entradas marcadas como fixture, tipadas como Promocion[]", () => {
    const ts = generarFixtures([
      entrada({ fuenteId: "si", fixture: true }),
      entrada({ fuenteId: "no", fixture: false }),
    ]);
    expect(ts).toContain("GENERADO");
    expect(ts).toContain('import type { Promocion } from "../tipos.ts";');
    expect(ts).toContain("export const PROMOS_CORPUS: Promocion[] = [");
    expect(ts).toContain(`"id": "${idDePromocion("manual", "si")}"`);
    expect(ts).toContain("// si");
    expect(ts).not.toContain(idDePromocion("manual", "no"));
  });

  it("fija el ahora de los tests del motor", () => {
    expect(generarFixtures([])).toContain(`export const AHORA_CORPUS = new Date("${AHORA_CORPUS_ISO}");`);
    expect(AHORA_CORPUS_ISO).toBe("2026-11-04T15:00:00Z");
  });

  it("no incluye trazabilidad ni claves que no son de Promocion", () => {
    const ts = generarFixtures([entrada({ fixture: true, revision: { verificadaEl: "2026-11-02", revisor: "persona-x", notas: [] } })]);
    expect(ts).not.toContain("persona-x");
    expect(ts).not.toContain('"fixture"');
    expect(ts).not.toContain("fragmentosFuente");
    expect(ts).not.toContain('"fuenteId"');
  });
});

describe("formatoCanonico", () => {
  const archivo: ArchivoCorpus = {
    version: 1,
    promociones: [entrada({ fuenteId: "z", categoriaId: 4 }), entrada({ fuenteId: "b", categoriaId: 1 }), entrada({ fuenteId: "a", categoriaId: 1 })],
  };

  it("ordena por categoría y fuenteId y termina con un salto de línea", () => {
    const texto = formatoCanonico(archivo);
    const ids = [...texto.matchAll(/"fuenteId": "([^"]+)"/g)].map((m) => m[1]);
    expect(ids).toEqual(["a", "b", "z"]);
    expect(texto.endsWith("\n")).toBe(true);
  });

  it("fija el orden de las claves, sin importar cómo vengan", () => {
    const e = entrada();
    const desordenada = Object.fromEntries(Object.entries(e).reverse()) as unknown as EntradaCorpus;
    expect(Object.keys(desordenada)[0]).toBe("revision"); // la entrada de prueba viene al revés
    const texto = formatoCanonico({ version: 1, promociones: [desordenada] });
    const orden = ["fuenteId", "fuente", "titulo", "bancoId", "categoriaId", "comercio", "porcentaje", "tarjetas", "vigencia", "tope", "montoMinimo", "jurisdiccion", "canal", "acumulable", "fragmentosFuente", "fixture", "revision"];
    const posiciones = orden.map((k) => texto.indexOf(`"${k}":`));
    expect([...posiciones].sort((x, y) => x - y)).toEqual(posiciones);
  });

  it("ordena las claves de los fragmentos", () => {
    const texto = formatoCanonico({ version: 1, promociones: [entrada({ acumulable: false, jurisdiccion: "caba", fragmentosFuente: { jurisdiccion: "x", acumulable: "y" } })] });
    expect(texto.indexOf('"acumulable": "y"')).toBeLessThan(texto.indexOf('"jurisdiccion": "x"'));
  });

  it("es idempotente", () => {
    const una = formatoCanonico(archivo);
    expect(formatoCanonico(JSON.parse(una) as ArchivoCorpus)).toBe(una);
  });

  it("un archivo vacío queda como la plantilla", () => {
    expect(formatoCanonico({ version: 1, promociones: [] })).toBe('{\n  "version": 1,\n  "promociones": []\n}\n');
  });
});

describe("calcularSalidas", () => {
  it("devuelve los cuatro archivos con sus rutas", () => {
    const salidas = calcularSalidas(insumos([entrada({ fixture: true })]));
    expect(Object.keys(salidas).sort()).toEqual([
      "packages/motor/src/test/corpus.ts",
      "supabase/seed/bancos.sql",
      "supabase/seed/promociones.json",
      "supabase/seed/promociones.sql",
    ]);
  });
});

describe("ejecutarGeneracion", () => {
  function disco(inicial: Record<string, string> = {}) {
    const archivos = new Map(Object.entries(inicial));
    return {
      archivos,
      leer: (ruta: string) => archivos.get(ruta) ?? null,
      escribir: (ruta: string, contenido: string) => void archivos.set(ruta, contenido),
    };
  }

  it("escribe los derivados cuando el archivo es válido", () => {
    const d = disco();
    const r = ejecutarGeneracion(insumos([entrada()]), { ...d, verificar: false });
    expect(r.ok).toBe(true);
    expect(d.archivos.get("supabase/seed/promociones.sql")).toContain("insert into public.promociones");
    expect(d.archivos.get("supabase/seed/bancos.sql")).toContain("insert into public.bancos");
  });

  it("un archivo inválido no escribe nada y devuelve los errores", () => {
    const d = disco();
    const r = ejecutarGeneracion(insumos([entrada({ porcentaje: 150 })]), { ...d, verificar: false });
    expect(r.ok).toBe(false);
    expect(r.errores.map((e) => e.regla)).toContain("porcentaje");
    expect(d.archivos.size).toBe(0);
  });

  it("con verificar no escribe y pasa si los derivados coinciden", () => {
    const d = disco();
    const datos = insumos([entrada()]);
    ejecutarGeneracion(datos, { ...d, verificar: false });
    const antes = new Map(d.archivos);
    const r = ejecutarGeneracion(datos, { ...d, verificar: true });
    expect(r.ok).toBe(true);
    expect(r.desfasados).toEqual([]);
    expect(d.archivos).toEqual(antes);
  });

  it("con verificar falla y nombra el archivo desfasado y el comando a correr", () => {
    const d = disco();
    const datos = insumos([entrada()]);
    ejecutarGeneracion(datos, { ...d, verificar: false });
    d.archivos.set("supabase/seed/promociones.sql", "-- editado a mano");
    const r = ejecutarGeneracion(datos, { ...d, verificar: true });
    expect(r.ok).toBe(false);
    expect(r.desfasados).toEqual(["supabase/seed/promociones.sql"]);
    expect(r.mensaje).toContain("npm run corpus:generar -w ingesta");
  });

  it("con verificar, un derivado que falta es un desfase", () => {
    const d = disco();
    const r = ejecutarGeneracion(insumos([entrada()]), { ...d, verificar: true });
    expect(r.ok).toBe(false);
    expect(r.desfasados).toContain("supabase/seed/bancos.sql");
  });

  it("con verificar, un promociones.json que no está en formato canónico es un desfase", () => {
    const d = disco();
    const datos = insumos([entrada()]);
    ejecutarGeneracion(datos, { ...d, verificar: false });
    d.archivos.set("supabase/seed/promociones.json", JSON.stringify(datos.archivo));
    const r = ejecutarGeneracion(datos, { ...d, verificar: true });
    expect(r.desfasados).toEqual(["supabase/seed/promociones.json"]);
  });
});

describe("ejecutarGeneracion — insumos malformados", () => {
  it("un exclusiones.json que no es una lista da un error de estructura, no una excepción", () => {
    const datos = { ...insumos([entrada()]), exclusiones: {} as unknown as Insumos["exclusiones"] };
    const r = ejecutarGeneracion(datos, { leer: () => null, escribir: () => {}, verificar: false });
    expect(r.ok).toBe(false);
    expect(r.errores.map((e) => e.regla)).toContain("estructura");
  });

  it("un grupos-tope.json que es null también", () => {
    const datos = { ...insumos([entrada()]), gruposTope: null as unknown as Insumos["gruposTope"] };
    const r = ejecutarGeneracion(datos, { leer: () => null, escribir: () => {}, verificar: false });
    expect(r.ok).toBe(false);
    expect(r.errores.map((e) => e.regla)).toContain("estructura");
  });
});

describe("el corpus real del repo no está desfasado de sus derivados (gate del CI)", () => {
  const raiz = new URL("../../../", import.meta.url);
  const leerReal = (ruta: string): string => readFileSync(new URL(ruta, raiz), "utf8");

  it("promociones.json, bancos.sql, promociones.sql y las fixtures coinciden con lo que genera el código", () => {
    const r = ejecutarGeneracion(leerInsumos(leerReal), {
      verificar: true,
      escribir: () => {
        throw new Error("en modo verificar no se escribe");
      },
      leer: (ruta) => {
        try {
          return leerReal(ruta);
        } catch {
          return null;
        }
      },
    });
    expect(r.errores, r.mensaje).toEqual([]);
    expect(r.desfasados, `${r.mensaje}`).toEqual([]);
    expect(r.ok).toBe(true);
  });
});
