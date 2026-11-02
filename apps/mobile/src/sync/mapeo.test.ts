import { describe, expect, it } from "vitest";
import { diaAnterior, filaACompra, filaAPromocion } from "./mapeo";
import { fila, filaCompra, ID } from "./prueba";

describe("filaAPromocion (FR-012)", () => {
  it("arma TarjetasAceptadas y el resto de la promo sin inventar nada", () => {
    const p = filaAPromocion(
      fila(1, {
        debito_redes: ["visa", "maestro"],
        credito_redes: ["visa"],
        porcentaje: "25.50",
        tope_monto: "10000.00",
        tope_periodo: "mensual",
        tope_alcance: "compartido",
        grupo_tope_id: "g1",
        monto_minimo: "5000",
        dias: ["mie", "jue"],
        canal: "ambos",
        acumulable: false,
        comercio: "Coto",
      }),
    );
    expect(p).toEqual({
      id: ID(1),
      fuente: "manual",
      titulo: "promo 1",
      bancoId: "88d8705e-2dda-46f9-8411-bb4916af858e",
      categoriaId: 1,
      comercio: "Coto",
      porcentaje: 25.5,
      tarjetas: { debito: ["visa", "maestro"], credito: ["visa"] },
      vigencia: { desde: "2026-10-01", hasta: "2026-12-31", dias: ["mie", "jue"] },
      tope: { monto: 10000, periodo: "mensual", alcance: "compartido", grupoTopeId: "g1" },
      montoMinimo: 5000,
      jurisdiccion: "nacional",
      canal: "ambos",
      acumulable: false,
    });
  });

  it("lo ausente es null: tope, monto mínimo, jurisdicción, canal, acumulable, días y comercio", () => {
    const p = filaAPromocion(fila(1, { jurisdiccion: null }));
    expect(p?.tope).toEqual({ monto: null, periodo: null, alcance: null, grupoTopeId: null });
    expect(p?.montoMinimo).toBeNull();
    expect(p?.jurisdiccion).toBeNull();
    expect(p?.canal).toBeNull();
    expect(p?.acumulable).toBeNull();
    expect(p?.vigencia.dias).toBeNull();
    expect(p?.comercio).toBeNull();
  });

  it("conserva otra_provincia: el motor la descarta, la app no decide por él", () => {
    expect(filaAPromocion(fila(1, { jurisdiccion: "otra_provincia" }))?.jurisdiccion).toBe("otra_provincia");
  });

  it.each([
    ["una red que esta versión no conoce", { credito_redes: ["visa", "bitcoin"] }],
    ["un canal desconocido", { canal: "telepatia" }],
    ["una jurisdicción desconocida", { jurisdiccion: "marte" }],
    ["un día desconocido", { dias: ["lun", "xxx"] }],
    ["un período de tope desconocido", { tope_periodo: "anual" }],
    ["un alcance de tope desconocido", { tope_alcance: "global" }],
    ["un porcentaje que no es número", { porcentaje: "veinte" }],
    ["un tope que no es número", { tope_monto: "mucho" }],
    ["una fecha mal formada", { vigencia_hasta: "31/12/2026" }],
  ])("descarta la fila con %s", (_n, resto) => {
    expect(filaAPromocion(fila(1, resto as never))).toBeNull();
  });

  it("una baja deja la promo vencida el día anterior a la baja, en hora de Argentina", () => {
    // 2026-11-02T01:00Z = 2026-11-01 22:00 en Argentina ⇒ el día anterior es el 31/10.
    const p = filaAPromocion(fila(1, { dada_de_baja_en: "2026-11-02T01:00:00+00:00" }));
    expect(p?.vigencia.hasta).toBe("2026-10-31");
  });

  it("una baja nunca alarga la vigencia: queda la menor", () => {
    const p = filaAPromocion(fila(1, { vigencia_hasta: "2026-10-15", dada_de_baja_en: "2026-11-02T15:00:00+00:00" }));
    expect(p?.vigencia.hasta).toBe("2026-10-15");
  });
});

describe("diaAnterior", () => {
  it("cruza mes y año, y el 29 de febrero", () => {
    expect(diaAnterior("2026-11-01")).toBe("2026-10-31");
    expect(diaAnterior("2027-01-01")).toBe("2026-12-31");
    expect(diaAnterior("2028-03-01")).toBe("2028-02-29");
  });
});

describe("filaACompra (FR-012)", () => {
  it("arma la Compra del motor y conserva el UUID del medio", () => {
    const c = filaACompra(
      filaCompra(1, {
        monto: "12500.50",
        descuento_obtenido: "2500.10",
        promocion_id: ID(3),
        origen: "excepcion",
        texto_extraido: "ticket",
      }),
    );
    expect(c).toEqual({
      id: ID(1001),
      fecha: "2026-11-02",
      monto: 12500.5,
      comercio: "Coto",
      categoriaId: 1,
      medioDePagoId: ID(9000),
      promocionId: ID(3),
      descuentoObtenido: 2500.1,
      reintegroEsperado: null,
      fechaAcreditacionEstimada: null,
      origen: "excepcion",
      textoExtraido: "ticket",
    });
  });

  it("descarta una compra con origen desconocido o monto que no es número", () => {
    expect(filaACompra(filaCompra(1, { origen: "magia" }))).toBeNull();
    expect(filaACompra(filaCompra(1, { monto: "mucho" }))).toBeNull();
  });
});
