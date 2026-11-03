import { describe, expect, it } from "vitest";
import { buscarBancos } from "./buscar-bancos";
import type { Banco } from "./modelo";

const banco = (id: string, nombre: string, onHubList: boolean | null = true): Banco => ({ id, nombre, onHubList });

const galicia = banco("b-galicia", "Banco Galicia");
const santander = banco("b-santander", "Santander");
const bancoDelSol = banco("b-sol", "Banco del Sol", false);
const nacion = banco("b-nacion", "Banco de la Nación Argentina");
const catalogo = [santander, bancoDelSol, galicia, nacion];

const nombres = (bs: Banco[]) => bs.map((b) => b.nombre);

describe("buscarBancos", () => {
  it("no distingue mayúsculas ni acentos", () => {
    for (const texto of ["galic", "GALIC", "Galíc"]) {
      expect(nombres(buscarBancos(catalogo, texto))).toEqual(["Banco Galicia"]);
    }
    expect(nombres(buscarBancos(catalogo, "nacion"))).toEqual(["Banco de la Nación Argentina"]);
  });

  it("encuentra la palabra aunque esté en el medio del nombre", () => {
    expect(nombres(buscarBancos(catalogo, "sol"))).toEqual(["Banco del Sol"]);
  });

  it("los espacios de más no importan", () => {
    expect(nombres(buscarBancos(catalogo, "  banco   del  "))).toEqual(["Banco del Sol"]);
  });

  it("texto vacío o sin coincidencias devuelve []", () => {
    expect(buscarBancos(catalogo, "")).toEqual([]);
    expect(buscarBancos(catalogo, "   ")).toEqual([]);
    expect(buscarBancos(catalogo, "mercado pago")).toEqual([]);
  });

  it("los on_hub_list van primero y cada grupo en orden alfabético (US3-1)", () => {
    expect(nombres(buscarBancos(catalogo, "banco"))).toEqual([
      "Banco de la Nación Argentina",
      "Banco Galicia",
      "Banco del Sol",
    ]);
  });

  it("onHubList null se ordena como no priorizado (decisión 9)", () => {
    const sinDato = banco("b-ciudad", "Banco Ciudad", null);
    expect(nombres(buscarBancos([sinDato, galicia], "banco"))).toEqual(["Banco Galicia", "Banco Ciudad"]);
  });

  it("a igual nombre desempata por id, comparando por código", () => {
    const a = banco("a-id", "Banco Repetido");
    const z = banco("Z-id", "Banco Repetido");
    expect(buscarBancos([a, z], "repetido").map((b) => b.id)).toEqual(["Z-id", "a-id"]);
  });

  it("el resultado no depende del orden del catálogo", () => {
    const resultado = buscarBancos(catalogo, "banco");
    expect(buscarBancos([...catalogo].reverse(), "banco")).toEqual(resultado);
  });

  it("no muta el catálogo", () => {
    const copia = [...catalogo];
    buscarBancos(catalogo, "banco");
    expect(catalogo).toEqual(copia);
  });
});
