import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ErrorDeMapeo, intentarMapear, mapearDetalle } from "./mapear.ts";
import type { Crudo, OpcionesMapeo } from "./mapear.ts";
import { BANCO_ICBC, catalogoReal } from "./test/fabricas.ts";
import { validarPromocion } from "./validar.ts";

type Libre = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

function cargar(nombre: string): Crudo {
  return JSON.parse(readFileSync(new URL(`./test/detalles/${nombre}.json`, import.meta.url), "utf8")) as Crudo;
}

/** Copia del crudo con un cambio en el detalle. */
function conDetalle(nombre: string, cambio: (detalle: Libre) => void): Crudo {
  const crudo = structuredClone(cargar(nombre)) as unknown as { detalle: Libre } & Crudo;
  cambio(crudo.detalle);
  return crudo;
}

const CATALOGO = catalogoReal();
const OPCIONES: OpcionesMapeo = { categorias: [1, 4], hoy: "2026-11-02", catalogoBancos: CATALOGO };
const avisos = (c: Crudo, opciones = OPCIONES) => mapearDetalle(c, opciones).avisos.join(" ");

describe("mapearDetalle — Petrelli (ICBC, semanal, presencial)", () => {
  const r = mapearDetalle(cargar("petrelli"), OPCIONES);

  it("da una promo sin descartes", () => {
    expect(r.promociones).toHaveLength(1);
    expect(r.descartes).toEqual([]);
  });

  it("mapea por código lo que MODO trae estructurado", () => {
    expect(r.promociones[0]).toMatchObject({
      fuenteId: "20-supermercadospetrelli-icbc-ene26",
      fuente: "modo",
      titulo: "20% en Petrelli",
      bancoId: BANCO_ICBC,
      categoriaId: 1,
      porcentaje: 20,
      tarjetas: { debito: ["visa"], credito: ["visa", "master"] },
      vigencia: { desde: "2026-01-01", hasta: "2026-12-31", dias: ["jue"] },
      tope: { monto: 10000, periodo: "semanal", alcance: null, grupoTopeId: null },
      montoMinimo: null,
      canal: "presencial",
      fragmentosFuente: {},
    });
  });

  it("deja en null lo que solo está en la prosa: lo lee el extractor de #51", () => {
    expect(r.promociones[0]).toMatchObject({ jurisdiccion: null, acumulable: null });
    expect(r.promociones[0]!.tope).toMatchObject({ alcance: null, grupoTopeId: null });
  });

  it("toma el comercio de la tarjeta del listado", () => {
    expect(r.promociones[0]!.comercio).toBe("Supermercados Petrelli");
  });

  it("la promo pasa la validación de publicación tal como sale", () => {
    expect(validarPromocion(r.promociones[0]!, new Set(CATALOGO.map((b) => b.id)))).toEqual([]);
  });
});

describe("mapearDetalle — Tienda Nova (Macro, solo crédito Visa, mensual)", () => {
  const b = mapearDetalle(cargar("tienda-nova"), OPCIONES).promociones[0]!;

  it("mapea días, redes y canal", () => {
    expect(b.vigencia.dias).toEqual(["jue", "vie"]);
    expect(b.tarjetas).toEqual({ debito: [], credito: ["visa"] });
    expect(b.canal).toBe("presencial"); // instore + instore_nfc
    expect(b.tope).toMatchObject({ monto: 10000, periodo: "mensual" });
  });

  it("el tope sale del detalle aunque la tarjeta del listado diga 0", () => {
    const crudo = cargar("tienda-nova") as unknown as { tarjeta: Libre };
    expect(crudo.tarjeta.content.row[4].text).toBe("0");
    expect(b.tope.monto).toBe(10000);
  });
});

describe("mapearDetalle — Cooperativa Obrera (tope diario, presencial y online)", () => {
  it("un tope que se reinicia por día no es representable: se descarta y no se aproxima", () => {
    const r = mapearDetalle(cargar("cooperativa-obrera"), OPCIONES);
    expect(r.promociones).toEqual([]);
    expect(r.descartes).toEqual([
      { slug: "30-credicoop-cooperativaobrera-oct25", motivo: "tope_no_representable", detalle: expect.stringMatching(/por d[ií]a/i) },
    ]);
  });

  it("con otro reinicio, presencial y online dan ambos y se mapean los días y las redes", () => {
    const crudo = conDetalle("cooperativa-obrera", (d) => (d.offers[0].limits.period_cap.reset_by = "week"));
    const b = mapearDetalle(crudo, OPCIONES).promociones[0]!;
    expect(b.tope).toMatchObject({ monto: 15000, periodo: "semanal" });
    expect(b.canal).toBe("ambos");
    expect(b.vigencia.dias).toEqual(["mar"]);
    expect(b.tarjetas).toEqual({ debito: ["cabal"], credito: ["cabal"] });
  });
});

describe("mapearDetalle — Doña Catalina (24 bancos, monto mínimo)", () => {
  const r = mapearDetalle(cargar("dona-catalina"), OPCIONES);

  it("parte la promo en una entrada por banco", () => {
    expect(r.promociones).toHaveLength(24);
    const ids = r.promociones.map((b) => b.fuenteId);
    expect(new Set(ids).size).toBe(24);
    expect(ids[0]).toMatch(/^dona-catalina-nov26#b-[0-9a-f]{8}$/);
    expect(new Set(r.promociones.map((b) => b.bancoId)).size).toBe(24);
  });

  it("todas las entradas comparten las condiciones de la promo", () => {
    for (const b of r.promociones) {
      expect(b).toMatchObject({
        porcentaje: 10,
        montoMinimo: 40000,
        canal: "presencial",
        comercio: "Doña Catalina",
        tope: { monto: 10000, periodo: "mensual" },
        vigencia: { desde: "2026-11-02", hasta: "2026-11-30", dias: ["lun", "mie"] },
      });
    }
  });

  it("las 24 partes comparten un solo tope: la app no suma un tope por banco", () => {
    for (const b of r.promociones) {
      expect(b.tope).toEqual({ monto: 10000, periodo: "mensual", alcance: "compartido", grupoTopeId: "modo:dona-catalina-nov26" });
      expect(b.fragmentosFuente["tope.alcance"]).toMatch(/una sola oferta de MODO para 24 banco/);
    }
    const bancos = new Set(CATALOGO.map((b) => b.id));
    for (const b of r.promociones) expect(validarPromocion(b, bancos)).toEqual([]);
  });

  it("ignora un método de pago que no es tarjeta, y avisa", () => {
    const b = r.promociones[0]!;
    expect(b.tarjetas.credito).toHaveLength(7);
    expect(b.tarjetas.debito).toHaveLength(5);
    expect(r.avisos.join(" ")).toMatch(/dona-catalina-nov26: .*pct/);
  });
});

describe("mapearDetalle — categorías", () => {
  it("una promo transversal (más de tres categorías) se descarta", () => {
    const r = mapearDetalle(cargar("a-la-mesa"), OPCIONES);
    expect(r.promociones).toEqual([]);
    expect(r.descartes).toEqual([
      { slug: "20-a-la-mesa-icbc-mar26", motivo: "transversal", detalle: expect.stringContaining("11 categorías") },
    ]);
  });

  it("con dos categorías, una entrada por categoría con sufijo, y solo las que se publican", () => {
    const crudo = conDetalle("petrelli", (d) => (d.offers[0].categories = ["1", "2"]));
    const r = mapearDetalle(crudo, OPCIONES);
    expect(r.promociones.map((b) => b.fuenteId)).toEqual(["20-supermercadospetrelli-icbc-ene26#c-1"]);
    // La parte de la categoría 2 no se publica, pero el tope es el mismo: queda como grupo.
    expect(r.promociones[0]!.tope).toMatchObject({ alcance: "compartido", grupoTopeId: "modo:20-supermercadospetrelli-icbc-ene26" });
  });

  it("si ninguna categoría se publica no devuelve nada", () => {
    const crudo = conDetalle("petrelli", (d) => (d.offers[0].categories = ["2"]));
    expect(mapearDetalle(crudo, OPCIONES)).toEqual({ promociones: [], descartes: [], avisos: [] });
  });

  it("una promo que parte por banco y por categoría combina los sufijos en ese orden", () => {
    const crudo = conDetalle("petrelli", (d) => {
      d.offers[0].categories = ["1", "4"];
      d.offers[0].requirements.banks.list = [BANCO_ICBC, "88d8705e-2dda-46f9-8411-bb4916af858e"];
    });
    const ids = mapearDetalle(crudo, OPCIONES).promociones.map((b) => b.fuenteId);
    expect(ids).toHaveLength(4);
    expect(ids).toContain("20-supermercadospetrelli-icbc-ene26#b-bcfcac03.c-1");
    expect(ids).toContain("20-supermercadospetrelli-icbc-ene26#b-88d8705e.c-4");
  });
});

describe("mapearDetalle — descartes", () => {
  it("sin ningún banco: banco_no_determinado", () => {
    const r = mapearDetalle(conDetalle("petrelli", (d) => (d.offers[0].requirements.banks.list = [])), OPCIONES);
    expect(r.promociones).toEqual([]);
    expect(r.descartes[0]).toMatchObject({ slug: "20-supermercadospetrelli-icbc-ene26", motivo: "banco_no_determinado" });
  });

  it.each([
    ["un reintegro que no es porcentaje", (d: Libre) => (d.offers[0].outcomes.cashback.amount_type = "fixed")],
    ["sin reintegro", (d: Libre) => delete d.offers[0].outcomes.cashback],
    ["un beneficio que no es cashback", (d: Libre) => (d.type = "installments")],
  ])("%s: no_es_reintegro", (_nombre, cambio) => {
    const r = mapearDetalle(conDetalle("petrelli", cambio), OPCIONES);
    expect(r.promociones).toEqual([]);
    expect(r.descartes[0]!.motivo).toBe("no_es_reintegro");
  });

  it("una promo que la fuente ya no da por vigente: vencida_en_la_fuente", () => {
    const r = mapearDetalle(conDetalle("petrelli", (d) => (d.real_status = "FINISHED")), OPCIONES);
    expect(r.descartes[0]!.motivo).toBe("vencida_en_la_fuente");
  });

  it("una promo que ya terminó aunque MODO la siga listando: vencida_en_la_fuente", () => {
    const r = mapearDetalle(cargar("petrelli"), { ...OPCIONES, hoy: "2027-01-01" });
    expect(r.descartes[0]).toMatchObject({ motivo: "vencida_en_la_fuente", detalle: expect.stringContaining("2026-12-31") });
    expect(mapearDetalle(cargar("petrelli"), { ...OPCIONES, hoy: "2026-12-31" }).promociones).toHaveLength(1);
  });

  it("más de una oferta: se descarta (el mapeo lee una sola)", () => {
    const r = mapearDetalle(conDetalle("petrelli", (d) => d.offers.push(structuredClone(d.offers[0]))), OPCIONES);
    expect(r.descartes[0]).toMatchObject({ motivo: "otro", detalle: expect.stringContaining("2 ofertas") });
  });
});

describe("mapearDetalle — tope", () => {
  it("sin tope por período ni por transacción: monto y período null (decisión 5)", () => {
    const r = mapearDetalle(conDetalle("petrelli", (d) => (d.offers[0].limits.period_cap.amount_by_period = 0)), OPCIONES);
    expect(r.promociones[0]!.tope).toEqual({ monto: null, periodo: null, alcance: null, grupoTopeId: null });
  });

  it("solo tope por transacción: por_compra", () => {
    const r = mapearDetalle(
      conDetalle("petrelli", (d) => {
        d.offers[0].limits.period_cap.amount_by_period = 0;
        d.offers[0].limits.transaction_cap.amount_by_transaction = 500;
      }),
      OPCIONES,
    );
    expect(r.promociones[0]!.tope).toMatchObject({ monto: 500, periodo: "por_compra" });
  });

  it("con tope por período y por transacción: no representable (quedarse con uno sobrestima)", () => {
    const r = mapearDetalle(
      conDetalle("petrelli", (d) => (d.offers[0].limits.transaction_cap.amount_by_transaction = 500)),
      OPCIONES,
    );
    expect(r.promociones).toEqual([]);
    expect(r.descartes[0]).toMatchObject({ motivo: "tope_no_representable", detalle: expect.stringMatching(/transacci[oó]n de \$500/) });
  });

  it("una promo partida con tope por compra no arma grupo: el tope no se acumula entre compras", () => {
    const crudo = conDetalle("dona-catalina", (d) => {
      d.offers[0].limits.period_cap.amount_by_period = 0;
      d.offers[0].limits.transaction_cap = { amount_by_transaction: 500 };
    });
    for (const b of mapearDetalle(crudo, OPCIONES).promociones) {
      expect(b.tope).toEqual({ monto: 500, periodo: "por_compra", alcance: null, grupoTopeId: null });
      expect(b.fragmentosFuente).toEqual({});
    }
  });

  it("nunca deja un monto sin período", () => {
    for (const reset of ["month", "week"]) {
      const r = mapearDetalle(conDetalle("petrelli", (d) => (d.offers[0].limits.period_cap.reset_by = reset)), OPCIONES);
      const t = r.promociones[0]!.tope;
      expect(t.monto !== null && t.periodo === null).toBe(false);
    }
  });

  it("un monto mínimo mayor que 0 pasa tal cual; 0 es null", () => {
    expect(mapearDetalle(cargar("dona-catalina"), OPCIONES).promociones[0]!.montoMinimo).toBe(40000);
    expect(mapearDetalle(cargar("petrelli"), OPCIONES).promociones[0]!.montoMinimo).toBeNull();
  });
});

describe("mapearDetalle — canal y datos de contexto", () => {
  it.each([
    [["online"], "online"],
    [["instore"], "presencial"],
    [["instore", "instore_nfc"], "presencial"],
    [["instore", "online"], "ambos"],
    [[], null],
  ])("flows %j da canal %s", (flows, canal) => {
    const r = mapearDetalle(conDetalle("petrelli", (d) => (d.conditions.payment_flow.flows = flows)), OPCIONES);
    expect(r.promociones[0]!.canal).toBe(canal);
  });

  it("sin tarjeta del listado el comercio queda null", () => {
    const crudo = { ...cargar("petrelli"), tarjeta: null };
    const b = mapearDetalle(crudo, OPCIONES).promociones[0]!;
    expect(b.comercio).toBeNull();
  });

  it("los siete días de la semana equivalen a todos: null", () => {
    const r = mapearDetalle(
      conDetalle("petrelli", (d) => {
        d.conditions.schedule.days_of_week = ["thursday", "monday", "sunday", "tuesday", "saturday", "friday", "wednesday"];
      }),
      OPCIONES,
    );
    expect(r.promociones[0]!.vigencia.dias).toBeNull();
  });
});

describe("mapearDetalle — falla de forma explícita ante lo que no reconoce", () => {
  function ruta(crudo: Crudo): string {
    try {
      mapearDetalle(crudo, OPCIONES);
    } catch (e) {
      expect(e).toBeInstanceOf(ErrorDeMapeo);
      return (e as ErrorDeMapeo).ruta;
    }
    throw new Error("tendría que haber fallado");
  }

  it("un día desconocido nombra su ruta", () => {
    expect(ruta(conDetalle("petrelli", (d) => (d.conditions.schedule.days_of_week = ["someday"])))).toBe(
      "conditions.schedule.days_of_week[0]",
    );
  });

  it("una lista de días vacía", () => {
    expect(ruta(conDetalle("petrelli", (d) => (d.conditions.schedule.days_of_week = [])))).toBe(
      "conditions.schedule.days_of_week",
    );
  });

  it("un reinicio de tope desconocido", () => {
    expect(ruta(conDetalle("petrelli", (d) => (d.offers[0].limits.period_cap.reset_by = "year")))).toBe(
      "offers[0].limits.period_cap.reset_by",
    );
  });

  it("una red desconocida", () => {
    expect(
      ruta(conDetalle("petrelli", (d) => (d.conditions.payment_methods.methods[0].issuer = "amex"))),
    ).toBe("conditions.payment_methods.methods[0].issuer");
  });

  it("un canal desconocido", () => {
    expect(ruta(conDetalle("petrelli", (d) => (d.conditions.payment_flow.flows = ["teleport"])))).toBe(
      "conditions.payment_flow.flows[0]",
    );
  });

  it("una fecha inválida", () => {
    expect(ruta(conDetalle("petrelli", (d) => (d.conditions.schedule.start_date = "2026-13-45")))).toBe(
      "conditions.schedule.start_date",
    );
  });

  it("un detalle que no es un objeto", () => {
    expect(ruta({ ...cargar("petrelli"), detalle: null })).toBe("detalle");
  });

  it("un slug faltante", () => {
    expect(ruta(conDetalle("petrelli", (d) => delete d.slug))).toBe("slug");
  });

  it("un porcentaje que no es número", () => {
    expect(ruta(conDetalle("petrelli", (d) => (d.offers[0].outcomes.cashback.amount = "veinte")))).toBe(
      "offers[0].outcomes.cashback.amount",
    );
  });
});

describe("mapearDetalle — formatos que MODO usa y el contrato no tenía (relevamiento real)", () => {
  it("physical-card: vale con la tarjeta física, es presencial", () => {
    const crudo = conDetalle("petrelli", (d) => (d.conditions.payment_flow.flows = ["physical-card"]));
    expect(mapearDetalle(crudo, OPCIONES).promociones[0]!.canal).toBe("presencial");
  });

  it("all: todos los canales", () => {
    const crudo = conDetalle("petrelli", (d) => (d.conditions.payment_flow.flows = ["all"]));
    expect(mapearDetalle(crudo, OPCIONES).promociones[0]!.canal).toBe("ambos");
  });

  it("physical-card junto con online da ambos", () => {
    const crudo = conDetalle("petrelli", (d) => (d.conditions.payment_flow.flows = ["online", "physical-card"]));
    expect(mapearDetalle(crudo, OPCIONES).promociones[0]!.canal).toBe("ambos");
  });

  it("una red que el contrato no representa (patagonia_365) se ignora y se avisa", () => {
    const crudo = conDetalle("petrelli", (d) => {
      d.conditions.payment_methods.methods.push({ type: "credit_card", issuer: "patagonia_365" });
    });
    const b = mapearDetalle(crudo, OPCIONES).promociones[0]!;
    expect(b.tarjetas.credito).toEqual(["visa", "master"]);
    expect(avisos(crudo)).toMatch(/patagonia_365/);
  });

  it("si solo acepta redes que el contrato no representa, se descarta", () => {
    const crudo = conDetalle("petrelli", (d) => {
      d.conditions.payment_methods.methods = [{ type: "credit_card", issuer: "patagonia_365" }];
    });
    const r = mapearDetalle(crudo, OPCIONES);
    expect(r.promociones).toEqual([]);
    expect(r.descartes[0]).toMatchObject({ motivo: "otro", detalle: expect.stringContaining("patagonia_365") });
  });

  it("una red realmente desconocida sigue siendo un error, no se ignora", () => {
    const crudo = conDetalle("petrelli", (d) => (d.conditions.payment_methods.methods[0].issuer = "amex"));
    expect(() => mapearDetalle(crudo, OPCIONES)).toThrow(ErrorDeMapeo);
  });

  it("un tope diario, aunque el tope por transacción exista, sigue siendo no representable: no hay aproximación", () => {
    const crudo = conDetalle("petrelli", (d) => {
      d.offers[0].limits.period_cap.reset_by = "day";
      d.offers[0].limits.transaction_cap.amount_by_transaction = 500;
    });
    const r = mapearDetalle(crudo, OPCIONES);
    expect(r.promociones).toEqual([]);
    expect(r.descartes[0]).toMatchObject({ motivo: "tope_no_representable", detalle: expect.stringMatching(/por d[ií]a/i) });
  });

  it("un tope diario sin monto (0) no es un tope: no se descarta", () => {
    const crudo = conDetalle("petrelli", (d) => {
      d.offers[0].limits.period_cap.reset_by = "day";
      d.offers[0].limits.period_cap.amount_by_period = 0;
    });
    const r = mapearDetalle(crudo, OPCIONES);
    expect(r.descartes).toEqual([]);
    expect(r.promociones[0]!.tope).toMatchObject({ monto: null, periodo: null });
  });

  it("un tope que vale para toda la promo (reset_by promo) no es representable: se descarta", () => {
    const crudo = conDetalle("petrelli", (d) => (d.offers[0].limits.period_cap.reset_by = "promo"));
    const r = mapearDetalle(crudo, OPCIONES);
    expect(r.promociones).toEqual([]);
    expect(r.descartes[0]).toMatchObject({ motivo: "tope_no_representable", detalle: expect.stringContaining("promo") });
  });

  it("limits en null equivale a sin tope", () => {
    const crudo = conDetalle("petrelli", (d) => (d.offers[0].limits = null));
    expect(mapearDetalle(crudo, OPCIONES).promociones[0]!.tope).toEqual({
      monto: null,
      periodo: null,
      alcance: null,
      grupoTopeId: null,
    });
  });
});

describe("mapearDetalle — no interpreta la letra chica", () => {
  it("lo que solo está en la prosa queda en null aunque la letra chica lo diga", () => {
    const crudo = conDetalle("petrelli", (d) => (d.terms_and_conditions = "NO ACUMULABLE CON OTRAS PROMOCIONES. SOLO CABA."));
    expect(mapearDetalle(crudo, OPCIONES).promociones[0]).toMatchObject({ acumulable: null, jurisdiccion: null });
  });
});

describe("mapearDetalle — claves de Object.prototype no son valores de MODO", () => {
  it.each(["constructor", "toString", "__proto__", "hasOwnProperty"])("el día %j es desconocido", (dia) => {
    const crudo = conDetalle("petrelli", (d) => (d.conditions.schedule.days_of_week = [dia]));
    expect(() => mapearDetalle(crudo, OPCIONES)).toThrow(ErrorDeMapeo);
  });

  it.each(["constructor", "toString", "__proto__"])("el reinicio %j es desconocido", (reinicio) => {
    const crudo = conDetalle("petrelli", (d) => (d.offers[0].limits.period_cap.reset_by = reinicio));
    expect(() => mapearDetalle(crudo, OPCIONES)).toThrow(ErrorDeMapeo);
  });
});

describe("mapearDetalle — transversal solo cuenta si alguna categoría se publica", () => {
  it("una promo de más de tres categorías que no incluye ninguna publicada no es un descarte", () => {
    const crudo = conDetalle("petrelli", (d) => (d.offers[0].categories = ["2", "3", "5", "7"]));
    expect(mapearDetalle(crudo, OPCIONES)).toEqual({ promociones: [], descartes: [], avisos: [] });
  });

  it("si incluye una publicada y son más de tres, sí se descarta", () => {
    const crudo = conDetalle("petrelli", (d) => (d.offers[0].categories = ["1", "2", "3", "5"]));
    expect(mapearDetalle(crudo, OPCIONES).descartes[0]).toMatchObject({ motivo: "transversal" });
  });
});

describe("mapearDetalle — nivel de cliente (Selecta, Platinum…)", () => {
  it("el nombre de la promo con «Selecta» la descarta", () => {
    const crudo = conDetalle("petrelli", (d) => (d.name = "Supermercados Selecta N2"));
    const r = mapearDetalle(crudo, OPCIONES);
    expect(r.promociones).toEqual([]);
    expect(r.descartes[0]).toMatchObject({ slug: "20-supermercadospetrelli-icbc-ene26", motivo: "nivel_de_cliente", detalle: expect.stringContaining("Selecta") });
  });

  it("el rótulo del banco en el listado («Macro Selecta») también", () => {
    const crudo = structuredClone(cargar("petrelli")) as unknown as { tarjeta: Libre } & Crudo;
    crudo.tarjeta.content.row[5] = { text: "Macro Selecta" };
    expect(mapearDetalle(crudo, OPCIONES).descartes[0]).toMatchObject({ motivo: "nivel_de_cliente" });
  });

  it("el rótulo de la tarjeta de /v2/slots («Macro Platinum») también", () => {
    const crudo = structuredClone(cargar("petrelli")) as unknown as { tarjeta: Libre } & Crudo;
    crudo.tarjeta = { card: { validity_place: "Paladar", participating_bank: "Macro Platinum" } };
    expect(mapearDetalle(crudo, OPCIONES).descartes[0]).toMatchObject({ motivo: "nivel_de_cliente", detalle: expect.stringContaining("Platinum") });
  });

  it("el comercio sale de la tarjeta de /v2/slots", () => {
    const crudo = structuredClone(cargar("petrelli")) as unknown as { tarjeta: Libre } & Crudo;
    crudo.tarjeta = { card: { validity_place: "Supermercados Petrelli", participating_bank: "ICBC" } };
    expect(mapearDetalle(crudo, OPCIONES).promociones[0]!.comercio).toBe("Supermercados Petrelli");
    expect(avisos(crudo)).not.toMatch(/no se resuelve|pero el detalle trae/);
  });

  it("la descripción interna con «Platinum» también", () => {
    const crudo = conDetalle("petrelli", (d) => (d.short_description = "2507-Macro-Platinum-Paladar-Presencial-20off"));
    expect(mapearDetalle(crudo, OPCIONES).descartes[0]).toMatchObject({ motivo: "nivel_de_cliente", detalle: expect.stringContaining("Platinum") });
  });

  it("una promo común no se marca", () => {
    expect(mapearDetalle(cargar("petrelli"), OPCIONES).descartes).toEqual([]);
    expect(mapearDetalle(cargar("tienda-nova"), OPCIONES).descartes).toEqual([]);
  });
});

describe("mapearDetalle — contraste del nombre de banco del listado con el id del detalle", () => {
  const nota = avisos;
  const conBanco = (nombre: string) => {
    const crudo = structuredClone(cargar("petrelli")) as unknown as { tarjeta: Libre } & Crudo;
    crudo.tarjeta.content.row[5] = { text: nombre };
    return crudo;
  };

  it("sin discrepancia no agrega nada", () => {
    expect(nota(cargar("petrelli"))).not.toMatch(/banco/i);
    expect(nota(conBanco("ICBC"))).not.toMatch(/listado dice/i);
  });

  it("un nombre que resuelve a otro banco se avisa, pero manda el id del detalle", () => {
    expect(mapearDetalle(conBanco("Macro"), OPCIONES).promociones[0]!.bancoId).toBe(BANCO_ICBC);
    expect(nota(conBanco("Macro"))).toMatch(/listado dice.*Macro.*detalle trae ICBC/i);
  });

  it("un nombre que no se resuelve se avisa", () => {
    expect(nota(conBanco("Banco Inexistente"))).toMatch(/Banco Inexistente.*no se resuelve/i);
  });

  it("en una promo multibanco el rótulo del listado no es un banco: no se contrasta", () => {
    const crudo = structuredClone(cargar("dona-catalina")) as unknown as { tarjeta: Libre } & Crudo;
    crudo.tarjeta.content.row[5] = { text: "Bancos adheridos" };
    expect(nota(crudo)).not.toMatch(/no se resuelve|listado dice/i);
  });

  it("sin catálogo no contrasta", () => {
    expect(nota(conBanco("Macro"), { ...OPCIONES, catalogoBancos: null })).not.toMatch(/listado dice/i);
  });

  it("un catálogo ambiguo no frena la promo: se avisa", () => {
    const ambiguo = [...CATALOGO, { id: "00000000-0000-4000-8000-000000000001", name: "ICBC" }];
    const r = mapearDetalle(conBanco("ICBC"), { ...OPCIONES, catalogoBancos: ambiguo });
    expect(r.promociones).toHaveLength(1);
    expect(r.avisos.join(" ")).toMatch(/No se pudo contrastar el banco: .*ambiguo/);
  });
});

describe("intentarMapear", () => {
  it("devuelve el resultado cuando el mapeo anda", () => {
    const r = intentarMapear(cargar("petrelli"), OPCIONES);
    expect(r).toMatchObject({ ok: true });
    if (r.ok) expect(r.resultado.promociones).toHaveLength(1);
  });

  it("devuelve la ruta del campo cuando el formato no se reconoce, sin lanzar", () => {
    const crudo = conDetalle("petrelli", (d) => (d.conditions.schedule.days_of_week = ["someday"]));
    expect(intentarMapear(crudo, OPCIONES)).toEqual({ ok: false, ruta: "conditions.schedule.days_of_week[0]" });
  });

  it("un error que no es de mapeo sí se propaga", () => {
    expect(() => intentarMapear(cargar("petrelli"), { ...OPCIONES, hoy: "ayer" })).toThrow(/hoy/);
  });
});
