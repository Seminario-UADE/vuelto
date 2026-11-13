import { describe, expect, it } from "vitest";
import {
  ExtractorNoDisponibleError,
  ExtractorTiempoAgotadoError,
  RespuestaFueraDeEsquemaError,
  type Extractor,
  type LecturaCruda,
} from "./extractor.ts";
import { LectorDeTickets, TicketIlegibleError } from "./servicio.ts";
import { AHORA, TICKETS } from "./test/tickets.ts";

const IMAGEN = new Uint8Array([0xff, 0xd8, 0xff]);

function extractorQueDevuelve(cruda: LecturaCruda): Extractor {
  return { leer: async () => cruda };
}

function extractorQueFalla(error: Error): Extractor {
  return {
    leer: async () => {
      throw error;
    },
  };
}

function lector(extractor: Extractor): LectorDeTickets {
  return new LectorDeTickets(extractor, () => AHORA);
}

describe("LectorDeTickets: datos del ticket (US1)", () => {
  it.each(TICKETS)("$nombre: monto, comercio, fecha y medio coinciden campo por campo (SC-001)", async (t) => {
    const lectura = await lector(extractorQueDevuelve(t.cruda)).leer(IMAGEN, "image/jpeg");
    // El texto se compara en la parte de privacidad (US2).
    expect(lectura).toEqual({ ...t.esperada, textoExtraido: expect.any(String) });
  });

  it("un dato imposible vacía solo ese campo (US1-8)", async () => {
    const base = TICKETS[0]!.cruda;
    const cruda: LecturaCruda = {
      ...base,
      // Posterior a hoy (13/11/2026), una red que no existe y "últimos 4" de 3 dígitos.
      fechaImpresa: "20/11/2026",
      medio: { ...base.medio, redImpresa: "TARJETA PLATINO", ultimos4Impresos: "123" },
    };
    const lectura = await lector(extractorQueDevuelve(cruda)).leer(IMAGEN, "image/jpeg");
    expect(lectura).toMatchObject({
      monto: 24500,
      comercio: "ALMACÉN DON TOMÁS",
      fecha: null,
      medio: { banco: "BCO DEL PLATA", tipo: "debito", red: null, ultimos4: null },
    });
  });

  it("monto, comercio y fecha vacíos: TicketIlegibleError (FR-009)", async () => {
    const cruda: LecturaCruda = {
      montoImpreso: "abc",
      comercio: "   ",
      fechaImpresa: "14/10",
      medio: { bancoImpreso: null, tipoImpreso: "DEBITO", redImpresa: "VISA", ultimos4Impresos: "1234" },
      texto: "una foto de un gato",
    };
    await expect(lector(extractorQueDevuelve(cruda)).leer(IMAGEN, "image/jpeg")).rejects.toBeInstanceOf(
      TicketIlegibleError,
    );
  });

  it("con uno solo de los tres alcanza para devolver la lectura", async () => {
    const cruda: LecturaCruda = {
      montoImpreso: "1.500,00",
      comercio: null,
      fechaImpresa: null,
      medio: { bancoImpreso: null, tipoImpreso: null, redImpresa: null, ultimos4Impresos: null },
      texto: null,
    };
    await expect(lector(extractorQueDevuelve(cruda)).leer(IMAGEN, "image/jpeg")).resolves.toMatchObject({
      monto: 1500,
      comercio: null,
      fecha: null,
    });
  });

  it.each([
    new ExtractorTiempoAgotadoError(),
    new ExtractorNoDisponibleError(429, null, 30),
    new RespuestaFueraDeEsquemaError("comercio", "tipo"),
  ])("los errores del extractor se propagan sin cambiar ($name)", async (error) => {
    await expect(lector(extractorQueFalla(error)).leer(IMAGEN, "image/jpeg")).rejects.toBe(error);
  });

  it("pasa la imagen y su tipo al extractor tal cual", async () => {
    const recibidos: unknown[] = [];
    const extractor: Extractor = {
      leer: async (imagen, tipo) => {
        recibidos.push(imagen, tipo);
        return TICKETS[0]!.cruda;
      },
    };
    await lector(extractor).leer(IMAGEN, "image/png");
    expect(recibidos).toEqual([IMAGEN, "image/png"]);
  });
});

describe("LectorDeTickets: privacidad del texto (US2)", () => {
  it.each(TICKETS)("$nombre: el texto devuelto es el esperado, con los datos personales tapados", async (t) => {
    const lectura = await lector(extractorQueDevuelve(t.cruda)).leer(IMAGEN, "image/jpeg");
    expect(lectura).toEqual(t.esperada);
  });

  it("en los textos de ejemplo no queda ninguna tarjeta completa, CUIT de persona ni DNI anunciado (SC-003)", async () => {
    for (const t of TICKETS) {
      const { textoExtraido } = await lector(extractorQueDevuelve(t.cruda)).leer(IMAGEN, "image/jpeg");
      expect(textoExtraido).not.toMatch(/\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?\d{4}/);
      expect(textoExtraido).not.toMatch(/\b(20|23|24|27)-?\d{8}-?\d\b/);
      expect(textoExtraido).not.toMatch(/DNI:?\s*\d/i);
    }
  });

  it("sin texto del proveedor, el texto devuelto es vacío", async () => {
    const cruda: LecturaCruda = { ...TICKETS[0]!.cruda, texto: null };
    const lectura = await lector(extractorQueDevuelve(cruda)).leer(IMAGEN, "image/jpeg");
    expect(lectura.textoExtraido).toBe("");
  });

  it("un texto largo se recorta después de tapar", async () => {
    const cruda: LecturaCruda = { ...TICKETS[0]!.cruda, texto: `${"a".repeat(9_995)} 4509 9535 6623 3704 ${"b".repeat(500)}` };
    const lectura = await lector(extractorQueDevuelve(cruda)).leer(IMAGEN, "image/jpeg");
    expect(lectura.textoExtraido.endsWith("[…]")).toBe(true);
    expect(lectura.textoExtraido).not.toMatch(/4509/);
  });
});
