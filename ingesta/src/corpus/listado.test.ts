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
});
