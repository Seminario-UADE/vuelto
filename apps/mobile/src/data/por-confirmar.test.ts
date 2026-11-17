import { describe, expect, it } from "vitest";
import type { BorradorCompra } from "./contracts";
import { catalogoComercios } from "./fixtures";
import {
  VENCIMIENTO_POR_CONFIRMAR_MS,
  antiguedad,
  borradorDesdePorConfirmar,
  coincidenteConTicket,
  cruzarConTicket,
  estaVigente,
  normalizarComercio,
  origenAlConfirmar,
  ticketCoincide,
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

describe("normalizarComercio (spec 012 FR-013)", () => {
  it("minúsculas, sin tildes, sin puntuación y con espacios colapsados", () => {
    expect(normalizarComercio("  COTO   C.I.C.S.A. ")).toBe("coto cicsa");
    expect(normalizarComercio("Carrefour Maxi-Súper")).toBe("carrefour maxi super");
    expect(normalizarComercio("McDonald's")).toBe("mcdonalds");
  });
  it("un nombre sin letras ni números queda vacío", () => {
    expect(normalizarComercio(" ... ")).toBe("");
  });
});

describe("ticketCoincide (spec 012 FR-013, research R3)", () => {
  const ticket = { comercio: "COTO C.I.C.S.A.", fecha: "2026-10-14" };

  it("«COTO C.I.C.S.A.» coincide con Coto", () => {
    expect(ticketCoincide(enCoto, ticket)).toBe(true);
  });
  it("«Cotolengo» no coincide con Coto: tiene que ser palabra entera", () => {
    expect(ticketCoincide(enCoto, { ...ticket, comercio: "Cotolengo" })).toBe(false);
  });
  it("otro comercio no coincide", () => {
    expect(ticketCoincide(enCoto, { ...ticket, comercio: "Jumbo" })).toBe(false);
  });
  // enCoto se creó el 14 a las 23:30 en Argentina (el 15 en UTC): el día de la simulación es el 14.
  it("una fecha anterior al día de la simulación (argentino) no coincide; el mismo día o después, sí", () => {
    expect(ticketCoincide(enCoto, { ...ticket, fecha: "2026-10-13" })).toBe(false);
    expect(ticketCoincide(enCoto, { ...ticket, fecha: "2026-10-14" })).toBe(true);
    expect(ticketCoincide(enCoto, { ...ticket, fecha: "2026-10-15" })).toBe(true);
  });
  it("sin fecha legible no se descarta por la fecha", () => {
    expect(ticketCoincide(enCoto, { ...ticket, fecha: null })).toBe(true);
    expect(ticketCoincide(enCoto, { ...ticket, fecha: "ayer" })).toBe(true);
  });
  it("un ticket sin comercio no coincide", () => {
    expect(ticketCoincide(enCoto, { ...ticket, comercio: null })).toBe(false);
  });
  it("tampoco coincide si la compra tiene un nombre sin letras", () => {
    expect(ticketCoincide({ ...enCoto, comercioNombre: "..." }, ticket)).toBe(false);
  });
});

describe("coincidenteConTicket (spec 012 US2-9, research R3)", () => {
  const ticket = { comercio: "Coto Digital", fecha: "2026-10-15" };
  const enJumbo: CompraPorConfirmar = { ...enCoto, id: "j", comercioId: "jumbo", comercioNombre: "Jumbo" };

  it("sin ninguna que coincida, null", () => {
    expect(coincidenteConTicket([enJumbo], ticket)).toBeNull();
    expect(coincidenteConTicket([], ticket)).toBeNull();
  });
  it("devuelve la que coincide", () => {
    expect(coincidenteConTicket([enJumbo, enCoto], ticket)).toBe(enCoto);
  });
  it("si coinciden varias (un nombre contenido en otro), gana la más reciente", () => {
    const enCotoDigital: CompraPorConfirmar = {
      ...enCoto,
      id: "cd",
      comercioId: "coto-digital",
      comercioNombre: "Coto Digital",
      creadaEn: "2026-10-15T12:00:00.000Z",
    };
    expect(coincidenteConTicket([enCoto, enCotoDigital], ticket)).toBe(enCotoDigital);
    expect(coincidenteConTicket([enCotoDigital, enCoto], ticket)).toBe(enCotoDigital);
  });
});

describe("cruzarConTicket (spec 012 US2-1, US2-5, US2-6, US2-9)", () => {
  const ticket = { comercio: "COTO C.I.C.S.A.", fecha: "2026-10-14" };
  const enJumbo: CompraPorConfirmar = { ...enCoto, id: "j", comercioId: "jumbo", comercioNombre: "Jumbo" };

  it("desde la tarjeta, si coincide: directo con esa compra", () => {
    expect(cruzarConTicket(ticket, enCoto.id, [enCoto], [enCoto])).toEqual({ tipo: "directo", pc: enCoto });
  });
  it("desde la tarjeta, si el comercio no coincide: pregunta «¿Este ticket es de tu compra en X?»", () => {
    expect(cruzarConTicket({ ...ticket, comercio: "Jumbo" }, enCoto.id, [enCoto], [enCoto])).toEqual({
      tipo: "pregunta",
      pc: enCoto,
      desdeTarjeta: true,
    });
  });
  it("desde la tarjeta, un ticket del comercio pero anterior a la simulación no se cruza: aviso (US2-6)", () => {
    expect(cruzarConTicket({ ...ticket, fecha: "2026-10-13" }, enCoto.id, [enCoto], [enCoto])).toEqual({ tipo: "anterior", pc: enCoto });
  });
  it("sin tarjeta, un ticket del comercio pero anterior a la simulación: aviso, no pregunta (US2-6)", () => {
    expect(cruzarConTicket({ ...ticket, fecha: "2026-10-13" }, undefined, [enCoto], [enCoto])).toEqual({ tipo: "anterior", pc: enCoto });
  });
  it("desde la tarjeta, si la compra ya no está, sigue directo sin ella", () => {
    expect(cruzarConTicket(ticket, enCoto.id, [], [])).toEqual({ tipo: "directo", pc: null });
  });
  it("desde la tarjeta, una vencida con el escaneo abierto se sigue encontrando", () => {
    expect(cruzarConTicket(ticket, enCoto.id, [enCoto], [])).toEqual({ tipo: "directo", pc: enCoto });
  });
  it("sin tarjeta, si coincide una vigente: pregunta «¿Es tu compra por confirmar en X?»", () => {
    expect(cruzarConTicket(ticket, undefined, [enJumbo, enCoto], [enJumbo, enCoto])).toEqual({
      tipo: "pregunta",
      pc: enCoto,
      desdeTarjeta: false,
    });
  });
  it("sin tarjeta y sin coincidencia: suelto", () => {
    expect(cruzarConTicket(ticket, undefined, [enJumbo], [enJumbo])).toEqual({ tipo: "suelto" });
    expect(cruzarConTicket(ticket, undefined, [], [])).toEqual({ tipo: "suelto" });
  });
  it("sin tarjeta, una vencida no se ofrece", () => {
    expect(cruzarConTicket(ticket, undefined, [enCoto], [])).toEqual({ tipo: "suelto" });
  });
});
