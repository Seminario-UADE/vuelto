import { describe, expect, it } from "vitest";
import { entrada, contexto, GRUPOS_PRUEBA } from "./test/fabricas.ts";
import type { Exclusion } from "./tipos.ts";
import { validarArchivo, validarExclusiones, validarGruposTope } from "./validar.ts";

type Cambio = (e: Record<string, any>) => void; // eslint-disable-line @typescript-eslint/no-explicit-any

/** Valida un archivo con una sola entrada válida a la que se le aplica `cambio`. */
function conCambio(cambio: Cambio, ctx = contexto()) {
  const e = structuredClone(entrada()) as unknown as Record<string, unknown>;
  cambio(e);
  return validarArchivo({ version: 1, promociones: [e] }, ctx);
}

function reglas(r: { errores: { regla: string }[] }): string[] {
  return r.errores.map((x) => x.regla);
}

describe("validarArchivo — lo que sí pasa", () => {
  it("una entrada válida no da errores ni avisos", () => {
    const r = validarArchivo({ version: 1, promociones: [entrada()] }, contexto());
    expect(r.errores).toEqual([]);
    expect(r.avisos).toEqual([]);
  });

  it("un dato ausente se escribe null explícito y es válido", () => {
    const r = conCambio((e) => {
      e.comercio = null;
      e.canal = null;
      e.jurisdiccion = null;
      e.acumulable = null;
      e.montoMinimo = null;
      e.vigencia.dias = null;
      e.tope = { monto: null, periodo: null, alcance: null, grupoTopeId: null };
    });
    expect(r.errores).toEqual([]);
  });

  it("un tope compartido con su grupo registrado y su fragmento es válido", () => {
    const r = conCambio((e) => {
      e.tope.alcance = "compartido";
      e.tope.grupoTopeId = "icbc:modo-mensual";
      e.fragmentosFuente = { "tope.alcance": "TOPE COMPARTIDO CON OTRAS PROMOCIONES" };
    });
    expect(r.errores).toEqual([]);
  });
});

describe("validarArchivo — estructura", () => {
  it("rechaza algo que no es el archivo del corpus", () => {
    expect(reglas(validarArchivo(null, contexto()))).toContain("estructura");
    expect(reglas(validarArchivo({ version: 2, promociones: [] }, contexto()))).toContain("estructura");
    expect(reglas(validarArchivo({ version: 1, promociones: {} }, contexto()))).toContain("estructura");
  });

  it("rechaza una entrada que no es un objeto", () => {
    expect(reglas(validarArchivo({ version: 1, promociones: [42] }, contexto()))).toContain("estructura");
  });

  it("una clave faltante es un error, aunque el valor fuera a ser null", () => {
    const r = conCambio((e) => delete e.comercio);
    expect(reglas(r)).toContain("clave-ausente");
    expect(r.errores.find((x) => x.regla === "clave-ausente")?.mensaje).toContain("comercio");
  });

  it("una clave faltante anidada se informa con su ruta", () => {
    const r = conCambio((e) => delete e.tope.periodo);
    expect(r.errores.find((x) => x.regla === "clave-ausente")?.mensaje).toContain("tope.periodo");
    expect(reglas(conCambio((e) => delete e.vigencia.dias))).toContain("clave-ausente");
    expect(reglas(conCambio((e) => delete e.tarjetas.debito))).toContain("clave-ausente");
    expect(reglas(conCambio((e) => delete e.revision.notas))).toContain("clave-ausente");
  });
});

describe("validarArchivo — identidad", () => {
  it("la fuente tiene que ser manual", () => {
    expect(reglas(conCambio((e) => (e.fuente = "modo")))).toContain("fuente");
  });

  it("el fuenteId no puede estar vacío", () => {
    expect(reglas(conCambio((e) => (e.fuenteId = "  ")))).toContain("fuente-id");
    expect(reglas(conCambio((e) => (e.fuenteId = 7)))).toContain("fuente-id");
  });

  it("el fuenteId no se repite en el archivo", () => {
    const r = validarArchivo({ version: 1, promociones: [entrada(), entrada({ titulo: "otra" })] }, contexto());
    expect(reglas(r)).toContain("fuente-id-duplicado");
  });

  it("un slug no puede estar a la vez en el corpus y en las exclusiones", () => {
    const exclusion: Exclusion = {
      slug: "20-paladini-icbc-ago26",
      motivo: "fuera_de_zona",
      detalle: null,
      verificadaEl: "2026-11-02",
      revisor: "spazos32",
    };
    const r = validarArchivo({ version: 1, promociones: [entrada()] }, contexto({ exclusiones: [exclusion] }));
    expect(reglas(r)).toContain("exclusion-duplicada");
  });
});

describe("validarArchivo — reglas del motor", () => {
  it("sin ninguna red en ningún tipo de tarjeta no es publicable", () => {
    const r = conCambio((e) => (e.tarjetas = { debito: [], credito: [] }));
    expect(reglas(r)).toContain("publicable");
    expect(reglas(r)).toContain("tarjetas");
  });

  it("un tope de 0 no es publicable", () => {
    const r = conCambio((e) => (e.tope.monto = 0));
    expect(reglas(r)).toContain("publicable");
    expect(reglas(r)).toContain("tope-monto");
  });
});

describe("validarArchivo — porcentaje", () => {
  it.each([150, 0, -5, "20", null])("rechaza porcentaje %s", (valor) => {
    expect(reglas(conCambio((e) => (e.porcentaje = valor)))).toContain("porcentaje");
  });

  it("acepta 100", () => {
    expect(reglas(conCambio((e) => (e.porcentaje = 100)))).not.toContain("porcentaje");
  });
});

describe("validarArchivo — vigencia", () => {
  it.each(["2026-02-30", "2026-8-7", "07/08/2026", "", null])("rechaza la fecha %s", (valor) => {
    expect(reglas(conCambio((e) => (e.vigencia.desde = valor)))).toContain("vigencia-fecha");
    expect(reglas(conCambio((e) => (e.vigencia.hasta = valor)))).toContain("vigencia-fecha");
  });

  it("rechaza desde posterior a hasta", () => {
    const r = conCambio((e) => {
      e.vigencia.desde = "2027-02-01";
      e.vigencia.hasta = "2027-01-30";
    });
    expect(reglas(r)).toContain("vigencia-orden");
  });

  it("acepta desde igual a hasta", () => {
    const r = conCambio((e) => {
      e.vigencia.desde = "2027-01-30";
      e.vigencia.hasta = "2027-01-30";
    });
    expect(reglas(r)).not.toContain("vigencia-orden");
  });

  it.each([[[]], [["lun", "lun"]], [["xyz"]], ["lun"]])("rechaza los días %j", (dias) => {
    expect(reglas(conCambio((e) => (e.vigencia.dias = dias)))).toContain("dias");
  });
});

describe("validarArchivo — tarjetas", () => {
  it("rechaza una red desconocida", () => {
    expect(reglas(conCambio((e) => (e.tarjetas.credito = ["visa", "mastercard"])))).toContain("tarjetas");
  });

  it("rechaza redes repetidas", () => {
    expect(reglas(conCambio((e) => (e.tarjetas.debito = ["visa", "visa"])))).toContain("tarjetas");
  });

  it("acepta solo débito o solo crédito", () => {
    expect(reglas(conCambio((e) => (e.tarjetas = { debito: ["visa"], credito: [] })))).not.toContain("tarjetas");
    expect(reglas(conCambio((e) => (e.tarjetas = { debito: [], credito: ["naranja"] })))).not.toContain("tarjetas");
  });
});

describe("validarArchivo — tope", () => {
  it("un monto sin período es un error: el motor usaría mensual en silencio", () => {
    const r = conCambio((e) => (e.tope.periodo = null));
    expect(reglas(r)).toContain("tope-periodo");
  });

  it("un período sin monto es un error", () => {
    const r = conCambio((e) => (e.tope.monto = null));
    expect(reglas(r)).toContain("tope-periodo");
  });

  it("rechaza un período o un alcance fuera del enum", () => {
    expect(reglas(conCambio((e) => (e.tope.periodo = "diario")))).toContain("tope-periodo");
    expect(reglas(conCambio((e) => (e.tope.alcance = "global")))).toContain("tope-alcance");
  });

  it("rechaza un monto negativo o que no es número", () => {
    expect(reglas(conCambio((e) => (e.tope.monto = -1)))).toContain("tope-monto");
    expect(reglas(conCambio((e) => (e.tope.monto = "10000")))).toContain("tope-monto");
  });

  it("compartido sin grupoTopeId es un error", () => {
    const r = conCambio((e) => {
      e.tope.alcance = "compartido";
      e.fragmentosFuente = { "tope.alcance": "compartido" };
    });
    expect(reglas(r)).toContain("tope-grupo");
  });

  it("un grupoTopeId sin alcance compartido es un error: el motor lo ignoraría", () => {
    const r = conCambio((e) => (e.tope.grupoTopeId = "icbc:modo-mensual"));
    expect(reglas(r)).toContain("tope-grupo");
  });

  it("un grupoTopeId que no está en el registro es un error", () => {
    const r = conCambio((e) => {
      e.tope.alcance = "compartido";
      e.tope.grupoTopeId = "macro:inventado";
      e.fragmentosFuente = { "tope.alcance": "compartido" };
    });
    expect(reglas(r)).toContain("tope-grupo");
  });
});

describe("validarArchivo — catálogos y enums", () => {
  it("el banco tiene que estar en el catálogo", () => {
    expect(reglas(conCambio((e) => (e.bancoId = "00000000-0000-4000-8000-000000000000")))).toContain("banco");
    expect(reglas(conCambio((e) => (e.bancoId = null)))).toContain("banco");
  });

  it("la categoría tiene que ser una de las 13 de MODO", () => {
    expect(reglas(conCambio((e) => (e.categoriaId = 9)))).toContain("categoria");
    expect(reglas(conCambio((e) => (e.categoriaId = "1")))).toContain("categoria");
  });

  it("el monto mínimo no puede ser negativo", () => {
    expect(reglas(conCambio((e) => (e.montoMinimo = -1)))).toContain("monto-minimo");
    expect(reglas(conCambio((e) => (e.montoMinimo = 40000)))).not.toContain("monto-minimo");
  });

  it("otra_provincia no entra al corpus y un valor desconocido tampoco", () => {
    expect(reglas(conCambio((e) => (e.jurisdiccion = "otra_provincia")))).toContain("jurisdiccion");
    expect(reglas(conCambio((e) => (e.jurisdiccion = "marte")))).toContain("jurisdiccion");
  });

  it("el canal tiene que ser presencial, online o ambos", () => {
    expect(reglas(conCambio((e) => (e.canal = "telefono")))).toContain("canal");
  });

  it("acumulable es un booleano o null", () => {
    expect(reglas(conCambio((e) => (e.acumulable = "no")))).toContain("acumulable");
  });

  it("el comercio no puede ser un texto vacío", () => {
    expect(reglas(conCambio((e) => (e.comercio = "")))).toContain("comercio");
  });

  it("fixture es un booleano", () => {
    expect(reglas(conCambio((e) => (e.fixture = "si")))).toContain("fixture");
  });
});

describe("validarArchivo — fragmentos de la letra chica", () => {
  it.each([
    ["acumulable", (e: Record<string, any>) => (e.acumulable = false)], // eslint-disable-line @typescript-eslint/no-explicit-any
    ["jurisdiccion", (e: Record<string, any>) => (e.jurisdiccion = "caba")], // eslint-disable-line @typescript-eslint/no-explicit-any
  ])("%s distinto de null pide su fragmento", (_campo, cambio) => {
    expect(reglas(conCambio(cambio))).toContain("fragmento");
  });

  it("tope.alcance exclusivo pide su fragmento", () => {
    expect(reglas(conCambio((e) => (e.tope.alcance = "exclusivo")))).toContain("fragmento");
  });

  it("un fragmento vacío no cuenta", () => {
    const r = conCambio((e) => {
      e.acumulable = false;
      e.fragmentosFuente = { acumulable: "   " };
    });
    expect(reglas(r)).toContain("fragmento");
  });

  it("con el fragmento, el campo es válido", () => {
    const r = conCambio((e) => {
      e.acumulable = false;
      e.fragmentosFuente = { acumulable: "NO ACUMULA CON OTRA PROMOCIÓN" };
    });
    expect(reglas(r)).not.toContain("fragmento");
  });

  it("montoMinimo y canal salen de campos estructurados y no piden fragmento", () => {
    const r = conCambio((e) => {
      e.montoMinimo = 40000;
      e.canal = "online";
    });
    expect(reglas(r)).not.toContain("fragmento");
  });

  it("fragmentosFuente tiene que ser un objeto de texto o null", () => {
    expect(reglas(conCambio((e) => (e.fragmentosFuente = [])))).toContain("fragmento");
    expect(reglas(conCambio((e) => (e.fragmentosFuente = { acumulable: 5 })))).toContain("fragmento");
  });
});

describe("validarArchivo — revisión", () => {
  it("la fecha de verificación tiene que ser una fecha ISO real", () => {
    expect(reglas(conCambio((e) => (e.revision.verificadaEl = "ayer")))).toContain("revision");
  });

  it("el revisor no puede estar vacío", () => {
    expect(reglas(conCambio((e) => (e.revision.revisor = " ")))).toContain("revision");
  });

  it("las notas son una lista de textos", () => {
    expect(reglas(conCambio((e) => (e.revision.notas = "una nota")))).toContain("revision");
    expect(reglas(conCambio((e) => (e.revision.notas = [1])))).toContain("revision");
  });
});

describe("validarArchivo — avisos", () => {
  it("avisa, sin fallar, de dos entradas del mismo banco, categoría y comercio con vigencias que se superponen", () => {
    const a = entrada({ fuenteId: "a" });
    const b = entrada({ fuenteId: "b", porcentaje: 30 });
    const r = validarArchivo({ version: 1, promociones: [a, b] }, contexto());
    expect(r.errores).toEqual([]);
    expect(r.avisos.map((x) => x.regla)).toContain("comercio-superpuesto");
  });

  it("no avisa si las vigencias no se superponen o el comercio es otro", () => {
    const a = entrada({ fuenteId: "a", vigencia: { desde: "2026-01-01", hasta: "2026-02-01", dias: null } });
    const b = entrada({ fuenteId: "b", vigencia: { desde: "2026-03-01", hasta: "2026-04-01", dias: null } });
    const c = entrada({ fuenteId: "c", comercio: "Farmacity" });
    expect(validarArchivo({ version: 1, promociones: [a, b] }, contexto()).avisos).toEqual([]);
    expect(validarArchivo({ version: 1, promociones: [entrada({ fuenteId: "a" }), c] }, contexto()).avisos).toEqual([]);
  });

  it("compara el comercio sin mayúsculas ni acentos", () => {
    const a = entrada({ fuenteId: "a", comercio: "ChangoMás" });
    const b = entrada({ fuenteId: "b", comercio: "changomas" });
    expect(validarArchivo({ version: 1, promociones: [a, b] }, contexto()).avisos).toHaveLength(1);
  });
});

describe("validarExclusiones", () => {
  const valida: Exclusion = {
    slug: "30-credicoop-cooperativaobrera-oct25",
    motivo: "fuera_de_zona",
    detalle: "Cadena de Bahía Blanca.",
    verificadaEl: "2026-11-02",
    revisor: "spazos32",
  };

  it("una exclusión válida pasa", () => {
    expect(validarExclusiones([valida]).errores).toEqual([]);
  });

  it("rechaza algo que no es una lista", () => {
    expect(reglas(validarExclusiones({}))).toContain("estructura");
  });

  it("rechaza un motivo fuera del conjunto cerrado", () => {
    expect(reglas(validarExclusiones([{ ...valida, motivo: "porque_si" }]))).toContain("exclusion-motivo");
  });

  it("el motivo otro exige un detalle", () => {
    expect(reglas(validarExclusiones([{ ...valida, motivo: "otro", detalle: null }]))).toContain("exclusion-detalle");
    expect(validarExclusiones([{ ...valida, motivo: "otro", detalle: "Condición rara." }]).errores).toEqual([]);
  });

  it("rechaza un slug vacío, una fecha mala o un revisor vacío", () => {
    expect(reglas(validarExclusiones([{ ...valida, slug: "" }]))).toContain("exclusion-slug");
    expect(reglas(validarExclusiones([{ ...valida, verificadaEl: "ayer" }]))).toContain("exclusion-revision");
    expect(reglas(validarExclusiones([{ ...valida, revisor: "" }]))).toContain("exclusion-revision");
  });

  it("rechaza un slug repetido", () => {
    expect(reglas(validarExclusiones([valida, valida]))).toContain("exclusion-slug");
  });
});

describe("validarGruposTope", () => {
  it("el registro de prueba es válido", () => {
    expect(validarGruposTope(GRUPOS_PRUEBA).errores).toEqual([]);
  });

  it("la clave tiene que ser <banco>:<clave>", () => {
    const r = validarGruposTope({ "otro-id": GRUPOS_PRUEBA["icbc:modo-mensual"] });
    expect(reglas(r)).toContain("grupo");
  });

  it("el fragmento y el creador no pueden estar vacíos", () => {
    const g = GRUPOS_PRUEBA["icbc:modo-mensual"]!;
    expect(reglas(validarGruposTope({ "icbc:modo-mensual": { ...g, fragmento: "" } }))).toContain("grupo");
    expect(reglas(validarGruposTope({ "icbc:modo-mensual": { ...g, creadoPor: "" } }))).toContain("grupo");
  });

  it("rechaza algo que no es un objeto", () => {
    expect(reglas(validarGruposTope([]))).toContain("estructura");
  });
});


describe("validarArchivo — insumos malformados no lo hacen lanzar", () => {
  const archivo = { version: 1, promociones: [entrada()] };
  const sinContexto = (cambios: Record<string, unknown>) =>
    ({ ...contexto(), ...cambios }) as unknown as Parameters<typeof validarArchivo>[1];

  it.each([null, {}, "x", 5])("exclusiones = %j", (exclusiones) => {
    expect(() => validarArchivo(archivo, sinContexto({ exclusiones }))).not.toThrow();
  });

  it.each([null, [], "x"])("gruposTope = %j", (gruposTope) => {
    expect(() => validarArchivo(archivo, sinContexto({ gruposTope }))).not.toThrow();
  });

  it("una exclusión que no es un objeto no lo hace lanzar", () => {
    expect(() => validarArchivo(archivo, sinContexto({ exclusiones: [null, 7, "x"] }))).not.toThrow();
  });

  it("con gruposTope malformado, un grupo referenciado es un error y no una excepción", () => {
    const conGrupo = { version: 1, promociones: [entrada({ tope: { monto: 10000, periodo: "mensual", alcance: "compartido", grupoTopeId: "icbc:modo-mensual" }, fragmentosFuente: { "tope.alcance": "compartido" } })] };
    const r = validarArchivo(conGrupo, sinContexto({ gruposTope: null }));
    expect(r.errores.map((e) => e.regla)).toContain("tope-grupo");
  });
});
