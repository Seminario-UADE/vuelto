import { describe, expect, it } from "vitest";
import { listarCandidatas } from "./listado.ts";
import { clienteCon, tarjeta, tarjetaAnterior } from "./test/modo-falso.ts";
import type { Libre } from "./test/modo-falso.ts";

const slugs = (r: { candidatas: { slug: string }[] }) => r.candidatas.map((c) => c.slug);

describe("listarCandidatas", () => {
  it("recorre todas las secciones que informa la web, en su orden", async () => {
    const r = await listarCandidatas(clienteCon({ carrusel: [tarjeta("a")], supermercados: [tarjeta("b")], "mas-promos": [tarjeta("c")] }), [1]);
    expect(r.resumen.secciones).toEqual(["carrusel", "supermercados", "mas-promos"]);
    expect(slugs(r)).toEqual(["a", "b", "c"]);
  });

  it("se queda con los reintegros vigentes y descarta cuotas, sorteos y vencidas", async () => {
    const r = await listarCandidatas(
      clienteCon({
        seccion: [
          tarjeta("a"),
          tarjeta("b", { estado: "FINISHED" }),
          tarjeta("c", { tipo: "financing" }),
          tarjeta("d", { tipo: "payment_scratch" }),
        ],
      }),
      [1],
    );
    expect(slugs(r)).toEqual(["a"]);
    expect(r.resumen.candidatas).toBe(1);
    expect(r.resumen.descartadas).toEqual({ noVigente: 1, noEsReintegro: 2, otraCategoria: 0 });
  });

  it("filtra por las categorías pedidas y cuenta una promo en cada categoría pedida que tiene", async () => {
    const r = await listarCandidatas(
      clienteCon({
        seccion: [tarjeta("super"), tarjeta("farma", { categorias: ["4"] }), tarjeta("ambas", { categorias: ["1", "4"] }), tarjeta("nafta", { categorias: ["8"] })],
      }),
      [1, 4],
    );
    expect(slugs(r).sort()).toEqual(["ambas", "farma", "super"]);
    expect(r.resumen.porCategoria).toEqual({ 1: 2, 4: 2 });
    expect(r.resumen.descartadas.otraCategoria).toBe(1);
  });

  it("una promo que aparece en varias secciones (mismo slug o mismo id de beneficio) cuenta una vez", async () => {
    const r = await listarCandidatas(
      clienteCon({
        carrusel: [tarjeta("coto"), tarjeta("b", { promoId: "mismo" })],
        supermercados: [tarjeta("coto"), tarjeta("c", { promoId: "mismo" })],
      }),
      [1],
    );
    expect(slugs(r).sort()).toEqual(["b", "coto"]);
  });

  it("suma las promos vigentes que solo trae el listado anterior por categoría y las informa", async () => {
    const r = await listarCandidatas(
      clienteCon({ supermercados: [tarjeta("coto")] }, undefined, {
        1: [tarjetaAnterior("coto", { promo_id: "promo-coto" }), tarjetaAnterior("jubilados-bna")],
      }),
      [1],
    );
    expect(slugs(r)).toEqual(["coto", "jubilados-bna"]);
    expect(r.resumen.soloEnElListadoAnterior).toEqual(["jubilados-bna"]);
    expect(r.resumen.porBanco).toEqual({ ICBC: 1, BNA: 1 });
    // La promo que está en los dos se queda con la tarjeta de la web.
    expect((r.candidatas[0]!.tarjeta as Libre).card).toBeDefined();
  });

  it("del listado anterior descarta las vencidas y las que no son de pago, y la categoría es la pedida", async () => {
    const r = await listarCandidatas(
      clienteCon({}, undefined, {
        4: [
          tarjetaAnterior("farma"),
          tarjetaAnterior("vieja", { calculated_status: "FINISHED" }),
          tarjetaAnterior("cuotas", { trigger_type: "installments" }),
        ],
      }),
      [1, 4],
    );
    expect(slugs(r)).toEqual(["farma"]);
    expect(r.resumen.porCategoria).toEqual({ 1: 0, 4: 1 });
    expect(r.resumen.descartadas).toEqual({ noVigente: 1, noEsReintegro: 1, otraCategoria: 0 });
  });

  it("una tarjeta sin banco cuenta como «(sin banco)»", async () => {
    const sinBanco = { ...tarjeta("a"), card: {} };
    const r = await listarCandidatas(clienteCon({ s: [sinBanco] }), [1]);
    expect(r.resumen.porBanco).toEqual({ "(sin banco)": 1 });
  });

  it.each([
    ["un slug con barras", { s: [tarjeta("../../etc/passwd")] }, /sección s.*slug/],
    ["una tarjeta sin slug", { s: [{ calculated_status: "RUNNING", benefit: { type: "cashback" } }] }, /slug/],
    ["algo que no es una tarjeta", { s: [42 as unknown as Libre] }, /no es un objeto/],
  ])("%s frena el listado entero", async (_nombre, listados, error) => {
    await expect(listarCandidatas(clienteCon(listados), [1])).rejects.toThrow(error);
  });

  it("una tarjeta del listado anterior con slug inválido también", async () => {
    await expect(listarCandidatas(clienteCon({ s: [tarjeta("a")] }, undefined, { 1: [tarjetaAnterior("../x")] }), [1])).rejects.toThrow(
      /categoría 1.*slug/,
    );
  });

  it("una promo publicada que todavía no empezó también es candidata, y se cuenta aparte", async () => {
    const r = await listarCandidatas(clienteCon({ s: [tarjeta("hoy"), tarjeta("manana", { estado: "NEXT_FOR_PRODUCT" })] }), [1]);
    expect(slugs(r)).toEqual(["hoy", "manana"]);
    expect(r.resumen.porEmpezar).toBe(1);
    expect(r.resumen.descartadas.noVigente).toBe(0);
  });

  it("desglosa lo que deja afuera por estado, tipo y categoría", async () => {
    const r = await listarCandidatas(
      clienteCon(
        {
          s: [
            tarjeta("a"),
            tarjeta("b", { estado: "FINISHED_FOR_PRODUCT" }),
            tarjeta("c", { estado: "FINISHED_FOR_PRODUCT" }),
            tarjeta("d", { tipo: "financing" }),
            tarjeta("e", { tipo: "payment_scratch" }),
            tarjeta("f", { categorias: ["15"] }),
            tarjeta("g", { categorias: ["15", "0"] }),
            tarjeta("h", { categorias: [] }),
            { ...tarjeta("i"), calculated_status: undefined },
          ],
        },
        undefined,
        { 1: [tarjetaAnterior("vieja", { calculated_status: "FINISHED" }), tarjetaAnterior("cuotas", { trigger_type: "installments" })] },
      ),
      [1],
    );
    expect(slugs(r)).toEqual(["a"]);
    expect(r.resumen.descartadas).toEqual({ noVigente: 4, noEsReintegro: 3, otraCategoria: 3 });
    expect(r.resumen.desglose).toEqual({
      porEstado: { FINISHED_FOR_PRODUCT: 2, "(sin estado)": 1, FINISHED: 1 },
      porTipo: { financing: 1, payment_scratch: 1, installments: 1 },
      porCategoria: { 15: 2, 0: 1, "(sin categoría)": 1 },
    });
  });

  it("controla las cadenas grandes: cuántas promos vio de cada una y qué pasó con ellas", async () => {
    const de = (slug: string, comercio: string, o = {}) => ({ ...tarjeta(slug, o), card: { validity_place: comercio, participating_bank: "ICBC" } });
    const r = await listarCandidatas(
      clienteCon({
        s: [
          de("c1", "Carrefour Hiper, Market y Express", { estado: "FINISHED_FOR_PRODUCT" }),
          de("c2", "CARREFOUR", { estado: "FINISHED_FOR_PRODUCT" }),
          de("coto", "COTO"),
          de("coto-cuotas", "Coto", { tipo: "financing" }),
          de("chango", "ChangoMas", { estado: "NEXT_FOR_PRODUCT" }),
          de("dia", "DIA"),
          de("diarco", "Diarco Mayorista"),
          de("anonima", "La Anónima"),
          de("jumbo-libreria", "LIBRERIA JUMBO", { categorias: ["15"] }),
        ],
      }),
      [1],
    );
    expect(Object.keys(r.resumen.cadenas)).toEqual(["Carrefour", "Coto", "Jumbo", "Disco", "Vea", "Día", "ChangoMás", "La Anónima"]);
    expect(r.resumen.cadenas.Carrefour).toEqual({ candidatas: 0, noVigentes: 2, otrasDescartadas: 0 });
    expect(r.resumen.cadenas.Coto).toEqual({ candidatas: 1, noVigentes: 0, otrasDescartadas: 1 });
    expect(r.resumen.cadenas["ChangoMás"]!.candidatas).toBe(1);
    // «Diarco» no es «Día»: el nombre se busca como palabra entera.
    expect(r.resumen.cadenas["Día"]).toEqual({ candidatas: 1, noVigentes: 0, otrasDescartadas: 0 });
    expect(r.resumen.cadenas["La Anónima"]!.candidatas).toBe(1);
    expect(r.resumen.cadenas.Jumbo).toEqual({ candidatas: 0, noVigentes: 0, otrasDescartadas: 1 });
    expect(r.resumen.cadenas.Disco).toEqual({ candidatas: 0, noVigentes: 0, otrasDescartadas: 0 });
  });
});
