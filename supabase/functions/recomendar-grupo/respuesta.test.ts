import { describe, expect, it } from "vitest";
import { recomendarGrupo, type ConsumoDeTope, type IntegranteDeGrupo } from "@vuelto/motor";
import type { DatosDeContacto } from "../_shared/repositorios.ts";
import { AHORA, GALICIA, SANTANDER, medio, promo } from "../_shared/test/fabricas.ts";
import { armarRespuesta } from "./respuesta.ts";

// Spec 013, FR-021 y SC-008. Lucía tiene un tope de $10.000 con $6.300 consumidos en 6 compras
// (le quedan $3.700) y dos medios: el Galicia, que conviene, y un Santander que no tiene promo.

const YO = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const LUCIA = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const NACION = "0330e59b-b6e3-43eb-9083-a88fcc61e845";

const conTope = promo({ id: "promo-galicia-tope", tope: { monto: 10000, periodo: "mensual", alcance: null, grupoTopeId: null } });
const galiciaLucia = { ...medio({ id: "lucia-galicia" }), bancoNombre: "Banco Galicia" };
const santanderLucia = {
  ...medio({ id: "lucia-santander-id-secreto", bancoId: SANTANDER, tipo: "debito" as const, red: "master" as const }),
  bancoNombre: "Banco Santander Secreto",
};
const consumosLucia: Omit<ConsumoDeTope, "id">[] = [1000, 1000, 1000, 1000, 1000, 1300].map((d, k) => ({
  promocionId: conTope.id,
  fecha: `2026-10-0${k + 1}`,
  monto: 5000,
  descuentoObtenido: d,
}));
const lucia: DatosDeContacto = { id: LUCIA, nombre: "Lucía", medios: [galiciaLucia, santanderLucia], consumos: consumosLucia };
const miNacion = medio({ id: "mi-nacion", bancoId: NACION, tipo: "debito", red: "visa" });

function caso(mios = [miNacion], consumosMios: ConsumoDeTope[] = [], monto = 10000) {
  const integrantes: IntegranteDeGrupo[] = [
    { tipo: "cuenta", id: YO, pide: true, mediosDePago: mios, consumos: consumosMios },
    {
      tipo: "cuenta",
      id: LUCIA,
      pide: false,
      mediosDePago: lucia.medios.map((m) => ({ id: m.id, bancoId: m.bancoId, tipo: m.tipo, red: m.red })),
      consumos: lucia.consumos.map((c, k) => ({ ...c, id: `c${k + 1}` })),
    },
    { tipo: "sin_cuenta", posicion: 0 },
  ];
  const r = recomendarGrupo({ comercio: null, categoriaId: 2, canal: "presencial", monto }, integrantes, [conTope], AHORA);
  return armarRespuesta("2026-10-24", r, YO, mios, [lucia]);
}

/** Todos los textos y claves del JSON, recorrido entero. */
function todo(x: unknown): string[] {
  if (x === null || x === undefined) return [];
  if (Array.isArray(x)) return x.flatMap(todo);
  if (typeof x === "object") return Object.entries(x).flatMap(([k, v]) => [k, ...todo(v)]);
  return [String(x)];
}

describe("armarRespuesta: lo que ve el teléfono de un contacto (FR-021, SC-008)", () => {
  it("tiene la forma del contrato y paga Lucía", () => {
    const r = caso();
    expect(r.fecha).toBe("2026-10-24");
    expect(r.quienPaga).toEqual({ tipo: "contacto", id: LUCIA });
    expect(r.reintegro).toBe(2000);
    expect(r.total).toBe(8000);
    expect(r.contactos).toEqual([
      {
        id: LUCIA,
        nombre: "Lucía",
        opcion: {
          medio: { bancoNombre: "Banco Galicia", tipo: "credito", red: "visa" },
          queDa: expect.any(String),
          reintegro: 2000,
          base: { tipo: "con_compras" },
        },
        parte: 2667,
      },
    ]);
    expect(r.sinCuenta).toEqual([{ posicion: 0, parte: 2666 }]);
    expect(r.vos).toEqual({ opcion: null, sinOpcion: null, parte: 2667 });
    expect(r.vos.parte + r.contactos[0]!.parte + r.sinCuenta[0]!.parte).toBe(r.total);
  });

  it("en ningún lugar del JSON aparecen su tope, lo que le queda, sus compras ni su otro medio", () => {
    const textos = todo(caso());
    const prohibidos = [/10\.?000/, /3\.?700/, /6\.?300/, /6 compras/, /comprasRegistradas/, /periodo/, /secreto/i, /santander/i, /master/, /debito/, /c[1-6]\b/];
    for (const t of textos) for (const p of prohibidos) expect(t).not.toMatch(p);
  });

  it("si el contacto no paga, no se nombra su medio ni qué da su promo", () => {
    // Quien pide tiene un Galicia con la misma promo: empata en $2.000 y gana (FR-004).
    const r = caso([medio({ id: "mi-galicia", bancoId: GALICIA })]);
    expect(r.quienPaga).toEqual({ tipo: "vos" });
    expect(r.contactos[0]?.opcion).toEqual({ medio: null, queDa: null, reintegro: 2000, base: { tipo: "con_compras" } });
  });

  it("de quien pide viene todo: su medio por id, qué da, el reintegro y la base con la cantidad y el período", () => {
    const mios = [medio({ id: "mi-galicia", bancoId: GALICIA })];
    const r = caso(mios, [{ id: "k1", promocionId: conTope.id, fecha: "2026-10-02", monto: 5000, descuentoObtenido: 500 }]);
    expect(r.vos.opcion).toEqual({
      medio: { id: "mi-galicia", bancoNombre: null, tipo: "credito", red: "visa" },
      queDa: expect.any(String),
      reintegro: 2000,
      base: { tipo: "con_compras", comprasRegistradas: 1, periodo: "mensual" },
    });
  });

  it("si quien pide no tiene opción, dice por qué con el motivo del motor (es su dato)", () => {
    const mios = [medio({ id: "mi-galicia", bancoId: GALICIA })];
    const agotado = [{ id: "k1", promocionId: conTope.id, fecha: "2026-10-02", monto: 50000, descuentoObtenido: 10000 }];
    const r = caso(mios, agotado);
    expect(r.vos.opcion).toBeNull();
    expect(r.vos.sinOpcion).toEqual(expect.any(String));
  });
});
