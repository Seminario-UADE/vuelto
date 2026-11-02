import { existsSync, readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { calcularCobertura, candidatasPorCaso, listaDeRevision } from "./cobertura.ts";
import type { Crudo } from "./mapear.ts";

type Libre = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

function fixture(nombre: string): Crudo {
  return JSON.parse(readFileSync(new URL(`./test/detalles/${nombre}.json`, import.meta.url), "utf8")) as Crudo;
}

const OPCIONES = { categoriasDelDueno: [1, 4], hoy: "2026-11-02", catalogoBancos: null };

describe("calcularCobertura", () => {
  const crudos = ["a", "b", "c", "d"];

  it("separa lo contabilizado de lo pendiente", () => {
    const c = calcularCobertura(crudos, ["a"], ["b"]);
    expect(c.crudos).toBe(4);
    expect(c.enCorpus).toBe(1);
    expect(c.enExclusiones).toBe(1);
    expect(c.pendientes).toEqual(["c", "d"]);
    expect(c.huerfanas).toEqual({ entradas: [], exclusiones: [] });
  });

  it("una promo partida cuenta una vez, aunque tenga muchas entradas", () => {
    const c = calcularCobertura(crudos, ["a#b-111", "a#b-222", "a#b-333"], []);
    expect(c.enCorpus).toBe(1);
    expect(c.pendientes).toEqual(["b", "c", "d"]);
  });

  it("una promo partida puede tener algunas entradas y otras excluidas sin contarse dos veces como pendiente", () => {
    const c = calcularCobertura(crudos, ["a#b-111"], ["a#b-222"]);
    expect(c.pendientes).toEqual(["b", "c", "d"]);
  });

  it("sin pendientes cuando todo está contabilizado", () => {
    expect(calcularCobertura(crudos, ["a", "b"], ["c", "d"]).pendientes).toEqual([]);
  });

  it("una entrada o una exclusión sin crudo es huérfana: se rompe la trazabilidad", () => {
    const c = calcularCobertura(crudos, ["a", "zzz"], ["yyy#b-1"]);
    expect(c.huerfanas).toEqual({ entradas: ["zzz"], exclusiones: ["yyy#b-1"] });
    expect(c.enCorpus).toBe(1);
  });

  it("con el corpus vacío todo es pendiente", () => {
    expect(calcularCobertura(crudos, [], []).pendientes).toEqual(crudos);
  });
});

describe("candidatasPorCaso — lo que sale de campos estructurados", () => {
  const casos = candidatasPorCaso(
    [fixture("petrelli"), fixture("tienda-nova"), fixture("dona-catalina"), fixture("cooperativa-obrera")],
    OPCIONES,
  );

  it("solo crédito (Tienda Nova) y con débito y crédito (Petrelli) no se mezclan", () => {
    expect(casos.solo_credito).toContain("20off-tiendanova-macro-dic25");
    expect(casos.solo_credito).not.toContain("20-supermercadospetrelli-icbc-ene26");
    expect(casos.solo_debito).toEqual([]);
  });

  it("solo débito: una promo sin ninguna red de crédito", () => {
    const crudo = structuredClone(fixture("petrelli")) as unknown as { detalle: Libre } & Crudo;
    crudo.detalle.conditions.payment_methods.methods = [{ type: "debit_card", issuer: "visa" }];
    expect(candidatasPorCaso([crudo], OPCIONES).solo_debito).toEqual(["20-supermercadospetrelli-icbc-ene26"]);
  });

  it("días, monto mínimo y los tres períodos de tope", () => {
    expect(casos.dias).toContain("20-supermercadospetrelli-icbc-ene26");
    expect(casos.monto_minimo).toEqual(["dona-catalina-nov26"]);
    expect(casos.tope_semanal).toEqual(["20-supermercadospetrelli-icbc-ene26"]);
    expect(casos.tope_mensual).toContain("20off-tiendanova-macro-dic25");
    // Cooperativa Obrera (tope diario) se propone para excluir: ya no cuenta como «por compra».
    expect(casos.tope_por_compra).toEqual([]);
  });

  it("tope por compra: solo el tope por transacción", () => {
    const crudo = structuredClone(fixture("petrelli")) as unknown as { detalle: Libre } & Crudo;
    crudo.detalle.offers[0].limits.period_cap.amount_by_period = 0;
    crudo.detalle.offers[0].limits.transaction_cap.amount_by_transaction = 500;
    expect(candidatasPorCaso([crudo], OPCIONES).tope_por_compra).toEqual(["20-supermercadospetrelli-icbc-ene26"]);
  });

  it("canal ambos, y una promo partida cuenta por su slug, no por sus entradas", () => {
    const crudo = structuredClone(fixture("petrelli")) as unknown as { detalle: Libre } & Crudo;
    crudo.detalle.conditions.payment_flow.flows = ["instore", "online"];
    expect(candidatasPorCaso([crudo], OPCIONES).canal_ambos).toEqual(["20-supermercadospetrelli-icbc-ene26"]);
    expect(casos.dias.filter((s) => s === "dona-catalina-nov26")).toHaveLength(1);
  });

  it("sin tope: monto null", () => {
    const crudo = structuredClone(fixture("petrelli")) as unknown as { detalle: Libre } & Crudo;
    crudo.detalle.offers[0].limits.period_cap.amount_by_period = 0;
    expect(candidatasPorCaso([crudo], OPCIONES).sin_tope).toEqual(["20-supermercadospetrelli-icbc-ene26"]);
  });

  it("una promo que el mapeo no puede procesar no rompe el chequeo: se omite", () => {
    const crudo = structuredClone(fixture("petrelli")) as unknown as { detalle: Libre } & Crudo;
    crudo.detalle.conditions.schedule.days_of_week = ["someday"];
    expect(() => candidatasPorCaso([crudo], OPCIONES)).not.toThrow();
  });
});

describe("candidatasPorCaso — lo que sale de la letra chica (solo candidatas: las confirma una persona)", () => {
  const casos = candidatasPorCaso(
    [fixture("petrelli"), fixture("tienda-nova"), fixture("dona-catalina"), fixture("cooperativa-obrera")],
    OPCIONES,
  );

  it("no acumulable: «no acumula» y «no será acumulable»", () => {
    expect(casos.no_acumulable).toEqual(expect.arrayContaining(["20off-tiendanova-macro-dic25", "30-credicoop-cooperativaobrera-oct25"]));
    expect(casos.no_acumulable).not.toContain("dona-catalina-nov26");
  });

  it("acumulable: solo la mención afirmativa", () => {
    expect(casos.acumulable).toEqual(["dona-catalina-nov26"]);
  });

  it("vencida por la letra chica: la fecha más reciente del legal ya pasó aunque la estructura diga otra cosa", () => {
    expect(casos.vencida_por_letra_chica).toEqual(["20-supermercadospetrelli-icbc-ene26"]);
  });

  it("tope compartido: la frase «el tope es compartido»", () => {
    const crudo = structuredClone(fixture("petrelli")) as unknown as { detalle: Libre } & Crudo;
    crudo.detalle.terms_and_conditions =
      "<p>CON TOPE DE $10.000 POR USUARIO POR MES. EL TOPE ES COMPARTIDO Y DISTRIBUIDO ENTRE LOS COMERCIOS ADHERIDOS.</p>";
    expect(candidatasPorCaso([crudo], OPCIONES).tope_compartido).toEqual(["20-supermercadospetrelli-icbc-ene26"]);
    expect(casos.tope_compartido).toEqual([]);
  });

  it("un legal sin fechas no es candidata a vencida", () => {
    expect(casos.vencida_por_letra_chica).not.toContain("dona-catalina-nov26");
  });
});

describe("listaDeRevision", () => {
  const crudos = [fixture("petrelli"), fixture("tienda-nova"), fixture("dona-catalina"), fixture("a-la-mesa")];

  it("agrupa por comercio, con la cantidad de entradas, y marca la exclusión propuesta", () => {
    const lista = listaDeRevision(crudos, OPCIONES);
    const dona = lista.find((x) => x.slug === "dona-catalina-nov26")!;
    expect(dona).toMatchObject({ comercio: "Doña Catalina", banco: expect.any(String), entradas: 24, exclusion: null, error: null });
    const mesa = lista.find((x) => x.slug === "20-a-la-mesa-icbc-mar26")!;
    expect(mesa).toMatchObject({ entradas: 0, exclusion: "transversal" });
  });

  it("ordena por comercio sin importar mayúsculas ni acentos", () => {
    const comercios = listaDeRevision(crudos, OPCIONES).map((x) => x.comercio);
    expect(comercios).toEqual(["A La Mesa", "Doña Catalina", "Supermercados Petrelli", "Tienda Nova"]);
  });

  it("informa un error de mapeo con su ruta en vez de romper", () => {
    const roto = structuredClone(fixture("petrelli")) as unknown as { detalle: Libre } & Crudo;
    roto.detalle.conditions.schedule.days_of_week = ["someday"];
    const [x] = listaDeRevision([roto], OPCIONES);
    expect(x).toMatchObject({ entradas: 0, error: "conditions.schedule.days_of_week[0]" });
  });
});

describe("el corpus real del repo", () => {
  const raiz = new URL("../../../", import.meta.url);
  // La carpeta de crudos puede no existir todavía (llega con el PR del relevamiento): sin crudos
  // no hay nada que comprobar, y el corpus del repo tiene que estar vacío o este test lo avisa.
  const carpetaDeCrudos = new URL("supabase/seed/crudo/", raiz);
  const slugs = existsSync(carpetaDeCrudos)
    ? readdirSync(carpetaDeCrudos)
        .filter((f) => f.endsWith(".json"))
        .map((f) => f.replace(/\.json$/, ""))
    : [];
  const archivo = JSON.parse(readFileSync(new URL("supabase/seed/promociones.json", raiz), "utf8")) as { promociones: { fuenteId: string }[] };
  const exclusiones = JSON.parse(readFileSync(new URL("supabase/seed/exclusiones.json", raiz), "utf8")) as { slug: string }[];

  it("toda entrada y toda exclusión tiene su crudo (trazabilidad, RNF-08)", () => {
    const c = calcularCobertura(
      slugs,
      archivo.promociones.map((e) => e.fuenteId),
      exclusiones.map((e) => e.slug),
    );
    expect(c.huerfanas).toEqual({ entradas: [], exclusiones: [] });
  });

  it("el nombre de cada crudo es el slug que trae adentro", () => {
    for (const slug of slugs) {
      const crudo = JSON.parse(readFileSync(new URL(`supabase/seed/crudo/${slug}.json`, raiz), "utf8")) as Crudo;
      expect((crudo.detalle as { slug: string }).slug).toBe(slug);
    }
  });
});
