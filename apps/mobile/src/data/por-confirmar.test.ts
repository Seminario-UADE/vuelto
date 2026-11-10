import { describe, expect, it } from "vitest";
import type { BorradorCompra } from "./contracts";
import { catalogoComercios } from "./fixtures";
import {
  VENCIMIENTO_POR_CONFIRMAR_MS,
  antiguedad,
  borradorDesdePorConfirmar,
  estaVigente,
  origenAlConfirmar,
  type CompraPorConfirmar,
} from "./por-confirmar";

// Spec 012, US1: las reglas puras de la compra por confirmar (data-model.md).

const enCoto: CompraPorConfirmar = {
  id: "00000000-0000-4000-8000-0000000000aa",
  usuarioId: "u1",
  comercioId: "coto",
  comercioNombre: "Coto",
  medioId: "galicia-visa-credito",
  monto: 24500,
  // 14/10 a las 23:30 en Argentina: en UTC ya es el 15, el día tiene que salir en hora argentina.
  creadaEn: "2026-10-15T02:30:00.000Z",
};

const borrador = (cambios: Partial<BorradorCompra> = {}): BorradorCompra => ({
  modo: "excepcion",
  comercio: "Coto",
  fecha: "2026-10-14",
  monto: 24500,
  medioId: "galicia-visa-credito",
  textoExtraido: null,
  usarPromo: true,
  ...cambios,
});

describe("origenAlConfirmar (FR-006, tabla de data-model.md)", () => {
  it("«Ya pagué» con el medio y el comercio sin cambios: excepcion", () => {
    expect(origenAlConfirmar(enCoto, borrador(), false, catalogoComercios)).toBe("excepcion");
  });

  it("el comercio se compara como el catálogo, sin importar mayúsculas ni espacios", () => {
    expect(origenAlConfirmar(enCoto, borrador({ comercio: "  coto " }), false, catalogoComercios)).toBe("excepcion");
  });

  it("cambiar el monto o la fecha no cambia el origen", () => {
    expect(origenAlConfirmar(enCoto, borrador({ monto: 1000, fecha: "2026-10-16" }), false, catalogoComercios)).toBe("excepcion");
  });

  it("«Ya pagué» con otro medio: manual", () => {
    expect(origenAlConfirmar(enCoto, borrador({ medioId: "macro-visa-debito" }), false, catalogoComercios)).toBe("manual");
  });

  it("«Ya pagué» con otro comercio: manual", () => {
    expect(origenAlConfirmar(enCoto, borrador({ comercio: "Jumbo" }), false, catalogoComercios)).toBe("manual");
  });

  it("«Ya pagué» sin medio o sin comercio: manual", () => {
    expect(origenAlConfirmar(enCoto, borrador({ medioId: null }), false, catalogoComercios)).toBe("manual");
    expect(origenAlConfirmar(enCoto, borrador({ comercio: null }), false, catalogoComercios)).toBe("manual");
  });

  it("un comercio que está en dos rubros se compara en el rubro con el que se recomendó (#43)", () => {
    const dosRubros = [
      { id: "coto-super", nombre: "Coto", inicial: "C", rubro: "supermercado" as const, categoriaId: 1, frecuente: false },
      { id: "coto-tec", nombre: "Coto", inicial: "C", rubro: "otro" as const, categoriaId: 5, frecuente: false },
    ];
    const enCotoTec = { ...enCoto, comercioId: "coto-tec", categoriaId: 5 };
    expect(origenAlConfirmar(enCotoTec, borrador(), false, dosRubros)).toBe("excepcion");
  });

  it("si vino del ticket, siempre ticket", () => {
    expect(origenAlConfirmar(enCoto, borrador(), true, catalogoComercios)).toBe("ticket");
    expect(origenAlConfirmar(enCoto, borrador({ medioId: "macro-visa-debito" }), true, catalogoComercios)).toBe("ticket");
  });
});

describe("borradorDesdePorConfirmar sin ticket (FR-006, FR-017)", () => {
  it("precarga comercio, medio, monto y el día de la simulación en hora argentina", () => {
    const r = borradorDesdePorConfirmar(enCoto, null, "2026-10-14");
    expect(r.borrador).toEqual({
      modo: "excepcion",
      comercio: "Coto",
      fecha: "2026-10-14",
      monto: 24500,
      medioId: "galicia-visa-credito",
      textoExtraido: null,
      usarPromo: true,
      canal: "presencial",
      categoriaId: null,
    });
    expect(r.medioSugerido).toBeNull();
    expect(r.avisos).toEqual([]);
  });

  it("conserva el canal y el rubro con los que se recomendó (#43)", () => {
    const r = borradorDesdePorConfirmar({ ...enCoto, canal: "online", categoriaId: 1 }, null, "2026-10-14");
    expect(r.borrador).toMatchObject({ canal: "online", categoriaId: 1 });
  });

  it("sin monto simulado, el borrador queda sin monto", () => {
    const r = borradorDesdePorConfirmar({ ...enCoto, monto: null }, null, "2026-10-14");
    expect(r.borrador.monto).toBeNull();
  });

  it("el mismo día: una sola fecha posible", () => {
    expect(borradorDesdePorConfirmar(enCoto, null, "2026-10-14").fechasPosibles).toEqual(["2026-10-14"]);
  });

  it("otro día: el de la simulación primero y hoy después", () => {
    const r = borradorDesdePorConfirmar(enCoto, null, "2026-10-15");
    expect(r.fechasPosibles).toEqual(["2026-10-14", "2026-10-15"]);
    expect(r.borrador.fecha).toBe("2026-10-14");
  });
});

describe("estaVigente (FR-011)", () => {
  const creada = Date.parse(enCoto.creadaEn);
  it("vigente hasta un milisegundo antes de las 48 h", () => {
    expect(VENCIMIENTO_POR_CONFIRMAR_MS).toBe(48 * 60 * 60 * 1000);
    expect(estaVigente(enCoto, new Date(creada + VENCIMIENTO_POR_CONFIRMAR_MS - 1).toISOString())).toBe(true);
  });

  it("vencida a las 48 h justas", () => {
    expect(estaVigente(enCoto, new Date(creada + VENCIMIENTO_POR_CONFIRMAR_MS).toISOString())).toBe(false);
  });
});

describe("antiguedad (la tarjeta «por confirmar», contracts/rutas.md)", () => {
  const desde = (ms: number) => new Date(Date.parse(enCoto.creadaEn) + ms).toISOString();
  it.each([
    [0, "recién"],
    [59_000, "recién"],
    [60_000, "hace 1 min"],
    [10 * 60_000, "hace 10 min"],
    [60 * 60_000, "hace 1 h"],
    [5 * 60 * 60_000 + 59 * 60_000, "hace 5 h"],
    [24 * 60 * 60_000, "hace 1 día"],
    [-5 * 60_000, "recién"],
  ])("%i ms después: %s", (ms, texto) => {
    expect(antiguedad(enCoto, desde(ms))).toBe(texto);
  });
});

describe("borradorDesdePorConfirmar con ticket (FR-007 a FR-009)", () => {
  const ticket = { monto: 24500, fecha: "2026-10-14", medioId: "galicia-visa-credito", textoExtraido: "COTO 24500" };

  it("guarda como ticket, con los datos del ticket y el comercio de la compra por confirmar", () => {
    const r = borradorDesdePorConfirmar(enCoto, ticket, "2026-10-14");
    expect(r.borrador).toMatchObject({ modo: "ticket", comercio: "Coto", monto: 24500, medioId: "galicia-visa-credito", textoExtraido: "COTO 24500" });
    expect(r.avisos).toEqual([]);
    expect(r.medioSugerido).toBeNull();
  });

  it("lo que el ticket no trae sale de la compra por confirmar", () => {
    const r = borradorDesdePorConfirmar(enCoto, { ...ticket, monto: null, fecha: null }, "2026-10-15");
    expect(r.borrador.monto).toBe(24500);
    expect(r.borrador.fecha).toBe("2026-10-14");
  });

  it("si el ticket no dice el medio, no lo preselecciona y sugiere el de la simulación (FR-008)", () => {
    const r = borradorDesdePorConfirmar(enCoto, { ...ticket, medioId: null }, "2026-10-14");
    expect(r.borrador.medioId).toBeNull();
    expect(r.medioSugerido).toBe("galicia-visa-credito");
  });

  it("avisa si el monto o el medio del ticket difieren (FR-009)", () => {
    const r = borradorDesdePorConfirmar(enCoto, { ...ticket, monto: 25000, medioId: "macro-visa-debito" }, "2026-10-14");
    expect(r.borrador).toMatchObject({ monto: 25000, medioId: "macro-visa-debito" });
    expect(r.avisos).toEqual(["monto-distinto", "medio-distinto"]);
  });

  it("sin monto simulado no avisa diferencia de monto", () => {
    const r = borradorDesdePorConfirmar({ ...enCoto, monto: null }, { ...ticket, monto: 9000 }, "2026-10-14");
    expect(r.avisos).toEqual([]);
  });
});
