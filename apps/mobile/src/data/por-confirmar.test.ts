import { describe, expect, it } from "vitest";
import type { BorradorCompra } from "./contracts";
import { catalogoComercios } from "./fixtures";
import {
  VENCIMIENTO_POR_CONFIRMAR_MS,
  antiguedad,
  borradorDesdePorConfirmar,
  cruceDelTicket,
  porConfirmarDelTicket,
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

  it("los días posibles van del día de la simulación a hoy (spec 014, FR-010)", () => {
    expect(borradorDesdePorConfirmar(enCoto, null, "2026-10-14").diasPosibles).toEqual({ desde: "2026-10-14", hoy: "2026-10-14" });
    const r = borradorDesdePorConfirmar(enCoto, null, "2026-10-15");
    expect(r.diasPosibles).toEqual({ desde: "2026-10-14", hoy: "2026-10-15" });
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

describe("borradorDesdePorConfirmar con ticket (spec 012 FR-007, spec 014 FR-008 y FR-010)", () => {
  const ticket = { monto: 24500, fecha: "2026-10-14", medioSugeridoTicket: "galicia-visa-credito", textoExtraido: "COTO 24500" };

  it("guarda como ticket, con los datos del ticket y el comercio de la compra por confirmar", () => {
    const r = borradorDesdePorConfirmar(enCoto, ticket, "2026-10-14");
    expect(r.borrador).toMatchObject({ modo: "ticket", comercio: "Coto", monto: 24500, textoExtraido: "COTO 24500" });
    expect(r.avisos).toEqual([]);
  });

  it("el medio nunca va marcado, aunque el ticket sugiera uno (FR-008)", () => {
    expect(borradorDesdePorConfirmar(enCoto, ticket, "2026-10-14").borrador.medioId).toBeNull();
  });

  it("si la sugerencia del ticket es el medio simulado, una sola nota: no va la de la simulación", () => {
    expect(borradorDesdePorConfirmar(enCoto, ticket, "2026-10-14").medioSugerido).toBeNull();
  });

  it("lo que el ticket no trae sale de la compra por confirmar", () => {
    const r = borradorDesdePorConfirmar(enCoto, { ...ticket, monto: null, fecha: null }, "2026-10-15");
    expect(r.borrador.monto).toBe(24500);
    expect(r.borrador.fecha).toBe("2026-10-14");
  });

  it("sin sugerencia del ticket, vale la nota de la simulación (spec 012 FR-008)", () => {
    const r = borradorDesdePorConfirmar(enCoto, { ...ticket, medioSugeridoTicket: null }, "2026-10-14");
    expect(r.borrador.medioId).toBeNull();
    expect(r.medioSugerido).toBe("galicia-visa-credito");
    expect(r.avisos).toEqual([]);
  });

  it("avisa si el monto o la sugerencia del ticket difieren de la simulación", () => {
    const r = borradorDesdePorConfirmar(enCoto, { ...ticket, monto: 25000, medioSugeridoTicket: "macro-visa-debito" }, "2026-10-14");
    expect(r.borrador).toMatchObject({ monto: 25000, medioId: null });
    expect(r.medioSugerido).toBeNull();
    expect(r.avisos).toEqual(["monto-distinto", "medio-distinto"]);
  });

  it("sin monto simulado no avisa diferencia de monto", () => {
    const r = borradorDesdePorConfirmar({ ...enCoto, monto: null }, { ...ticket, monto: 9000 }, "2026-10-14");
    expect(r.avisos).toEqual([]);
  });

  it("los días posibles van del día de la simulación a hoy (FR-010)", () => {
    expect(borradorDesdePorConfirmar(enCoto, ticket, "2026-10-16").diasPosibles).toEqual({ desde: "2026-10-14", hoy: "2026-10-16" });
  });

  it("una fecha del ticket anterior a la simulación no se propone: va el día de la simulación (spec 012 FR-013)", () => {
    expect(borradorDesdePorConfirmar(enCoto, { ...ticket, fecha: "2026-10-10" }, "2026-10-16").borrador.fecha).toBe("2026-10-14");
    expect(borradorDesdePorConfirmar(enCoto, { ...ticket, fecha: "2026-10-15" }, "2026-10-16").borrador.fecha).toBe("2026-10-15");
  });
});

describe("cruceDelTicket (spec 012 FR-013, revisado en la issue #110)", () => {
  const ticket = (comercio: string | null, fecha: string | null = "2026-10-14", textoExtraido: string | null = null) => ({
    comercio,
    fecha,
    textoExtraido,
  });

  it("el primer resultado de la sugerencia es el comercio simulado: coincide, sin preguntar", () => {
    expect(cruceDelTicket(enCoto, ticket("COTO C.I.C.S.A."), catalogoComercios)).toBe("coincide");
    expect(cruceDelTicket(enCoto, ticket("Coto"), catalogoComercios)).toBe("coincide");
  });

  it("la razón social con la marca en el texto: coincide", () => {
    expect(cruceDelTicket(enCoto, ticket("C.I.C.S.A.", "2026-10-14", "C.I.C.S.A.\nCOTO\nTOTAL"), catalogoComercios)).toBe(
      "coincide",
    );
  });

  it("el primer resultado es otro comercio, o ninguno: otro_comercio (se pregunta)", () => {
    expect(cruceDelTicket(enCoto, ticket("JUMBO RETAIL S.A."), catalogoComercios)).toBe("otro_comercio");
    expect(cruceDelTicket(enCoto, ticket("Cotolengo"), catalogoComercios)).toBe("otro_comercio");
    expect(cruceDelTicket(enCoto, ticket("Kiosco El Sol"), catalogoComercios)).toBe("otro_comercio");
  });

  it("el ticket no trae comercio: sin_comercio, aunque el texto nombre a otro del catálogo", () => {
    expect(cruceDelTicket(enCoto, ticket(null), catalogoComercios)).toBe("sin_comercio");
    expect(cruceDelTicket(enCoto, ticket("  "), catalogoComercios)).toBe("sin_comercio");
    expect(cruceDelTicket(enCoto, ticket(null, "2026-10-14", "JUMBO\nTOTAL"), catalogoComercios)).toBe("sin_comercio");
  });

  it("una fecha anterior al día de la simulación: anterior, aunque el comercio coincida", () => {
    expect(cruceDelTicket(enCoto, ticket("Coto", "2026-10-13"), catalogoComercios)).toBe("anterior");
  });

  it("una fecha mal leída (no AAAA-MM-DD) no contradice nada: se cruza (idea del PR #165)", () => {
    expect(cruceDelTicket(enCoto, ticket("Coto", "13/10/2026"), catalogoComercios)).toBe("coincide");
  });

  it("el mismo día o después, y sin fecha, se cruza", () => {
    expect(cruceDelTicket(enCoto, ticket("Coto", "2026-10-16"), catalogoComercios)).toBe("coincide");
    expect(cruceDelTicket(enCoto, ticket("Coto", null), catalogoComercios)).toBe("coincide");
  });
});

describe("porConfirmarDelTicket: escanear suelto (spec 012 US2-9)", () => {
  const enJumbo: CompraPorConfirmar = { ...enCoto, id: "pc-jumbo", comercioId: "jumbo", comercioNombre: "Jumbo" };
  const lectura = { comercio: "COTO C.I.C.S.A.", fecha: "2026-10-14", textoExtraido: null };

  it("devuelve la compra por confirmar con la que coincide", () => {
    expect(porConfirmarDelTicket([enJumbo, enCoto], lectura, catalogoComercios)?.id).toBe(enCoto.id);
  });

  it("si coinciden varias, la más reciente (idea del PR #165)", () => {
    const vieja = { ...enCoto, id: "vieja", creadaEn: "2026-10-14T13:00:00.000Z" };
    const nueva = { ...enCoto, id: "nueva", creadaEn: "2026-10-15T02:45:00.000Z" };
    expect(porConfirmarDelTicket([vieja, nueva], lectura, catalogoComercios)?.id).toBe("nueva");
  });

  it("ninguna coincide, el ticket no trae comercio o es anterior: null", () => {
    expect(porConfirmarDelTicket([enJumbo], lectura, catalogoComercios)).toBeNull();
    expect(porConfirmarDelTicket([enCoto], { ...lectura, comercio: null }, catalogoComercios)).toBeNull();
    expect(porConfirmarDelTicket([enCoto], { ...lectura, comercio: null, textoExtraido: "COTO\nTOTAL" }, catalogoComercios)).toBeNull();
    expect(porConfirmarDelTicket([enCoto], { ...lectura, fecha: "2026-10-01" }, catalogoComercios)).toBeNull();
    expect(porConfirmarDelTicket([], lectura, catalogoComercios)).toBeNull();
  });
});
