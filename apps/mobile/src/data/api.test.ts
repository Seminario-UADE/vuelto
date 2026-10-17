import { beforeEach, describe, expect, it } from "vitest";
import * as api from "./api";
import type { Base } from "./contracts";
import { comprasOctubre } from "./fixtures";
import { reiniciarSesion } from "./sesion";

// La capa de datos simula al servidor. Estos tests fijan las reglas que la UI da por
// sentadas: estimados con base (Principio V), null explícito, ADR-008 §3 y cuentas que
// cierran entre pantallas (auditoría v5, "qué funciona" #1).

beforeEach(() => {
  api.setDemora(0);
  api.setEscenario("normal");
  reiniciarSesion();
});

const tieneTexto = (b: Base | null) => b !== null && b.texto.trim().length > 0;

describe("recomendar", () => {
  it("Coto sin monto: Galicia, sin cifra de reintegro, con tope y base", async () => {
    const r = await api.recomendar("coto", null);
    expect(r.resultado).toBe("recomendado");
    expect(r.medio?.nombre).toBe("Galicia Visa crédito");
    expect(r.razon).toBe("20% en supermercados los miércoles");
    expect(r.reintegro).toBeNull();
    expect(r.teSale).toBeNull();
    expect(r.topeDisponible).toBe(6500);
    expect(r.base?.texto).toBe("según 3 compras de octubre");
  });

  it("Coto con $24.500: ≈$4.900, te sale ≈$19.600 y quedan ≈$1.600 (queda poco)", async () => {
    const r = await api.recomendar("coto", 24500);
    expect(r.reintegro).toBe(4900);
    expect(r.teSale).toBe(19600);
    expect(r.topeDespues).toEqual({ disponible: 1600, estado: "queda-poco" });
  });

  it("el reintegro nunca supera el tope disponible", async () => {
    const r = await api.recomendar("coto", 100000);
    expect(r.reintegro).toBe(6500);
    expect(r.topeDespues).toEqual({ disponible: 0, estado: "agotado" });
  });

  it("monto cero o vacío no produce '≈$0'", async () => {
    const r = await api.recomendar("coto", 0);
    expect(r.monto).toBeNull();
    expect(r.reintegro).toBeNull();
  });

  it("alternativas con motivo, sin preseleccionar nada", async () => {
    const r = await api.recomendar("coto", null);
    const motivos = Object.fromEntries(r.alternativas.map((a) => [a.medio.nombreCorto, a.motivo]));
    expect(motivos.Santander).toBe("sin promo en supermercados");
    expect(motivos.Provincia).toBe("sin promo en supermercados");
    expect(motivos.Macro).toBe("sin promo en supermercados");
  });

  it("YPF un miércoles: sin promo hoy y dice cuándo sí", async () => {
    const r = await api.recomendar("ypf", null);
    expect(r.resultado).toBe("sin-promo");
    expect(r.medio).toBeNull();
    expect(r.proximaPromo).toBe("Santander Mastercard crédito: 15% los jueves");
  });

  it("Farmacity: Macro tiene el tope agotado y no se recomienda", async () => {
    const r = await api.recomendar("farmacity", 8000);
    expect(r.resultado).toBe("sin-promo");
    const macro = r.alternativas.find((a) => a.medio.nombreCorto === "Macro");
    expect(macro?.estado).toBe("agotado");
    expect(macro?.motivo).toContain("vuelve el 1/11");
  });
});

describe("topes", () => {
  it("cuatro estados, todos con base y sin total agregado", async () => {
    const t = await api.getTopes();
    const estados = Object.fromEntries(t.medios.map((m) => [m.medio.nombreCorto, m.estado]));
    expect(estados).toEqual({
      Galicia: "disponible",
      Santander: "queda-poco",
      Provincia: "sin-base",
      Macro: "agotado",
    });
    for (const m of t.medios) {
      expect(tieneTexto(m.base)).toBe(true);
      if (m.estado === "sin-base") expect(m.disponible).toBeNull();
    }
    expect(Object.keys(t)).not.toContain("total");
    expect(t.mediosConTope).toBe(2);
    expect(t.reinicioMensualEnDias).toBe(18);
  });

  it("te devolvieron ≈$15.200 cierra con las compras de octubre", async () => {
    const t = await api.getTopes();
    const suma = comprasOctubre.reduce((s, c) => s + (c.reintegro ?? 0), 0);
    expect(t.devolvieron.monto).toBe(15200);
    expect(suma).toBe(15200);
    expect(t.devolvieron.base.texto).toBe("según 10 compras de octubre");
  });

  it("mes vacío: ninguna cifra de tope", async () => {
    api.setEscenario("mes-vacio");
    const t = await api.getTopes();
    expect(t.medios.every((m) => m.disponible === null && m.base.tipo === "sin-compras")).toBe(true);
  });
});

describe("compras y ticket", () => {
  it("todas las fechas son de octubre de 2026", async () => {
    const { compras } = await api.getCompras();
    expect(compras.length).toBe(10);
    for (const c of compras) expect(c.fecha.startsWith("2026-10-")).toBe(true);
  });

  it("el ticket no trae medio de pago (RF-10) ni imagen", async () => {
    const t = await api.leerTicket();
    expect(t.ok).toBe(true);
    if (t.ok) expect(t.medio).toBeNull();
    expect(JSON.stringify(t)).not.toMatch(/imagen|image|base64|uri/i);
  });

  it("guardar sin medio falla; con medio aparece primera en Mis compras", async () => {
    await expect(
      api.guardarCompra({ modo: "ticket", comercio: "Coto", fecha: "2026-10-14", monto: 24500, medioId: null }),
    ).rejects.toThrow();
    const c = await api.guardarCompra({
      modo: "excepcion",
      comercio: "Coto",
      fecha: "2026-10-14",
      monto: 24500,
      medioId: "galicia-visa-credito",
    });
    expect(c.reintegro).toBe(4900);
    const { compras } = await api.getCompras("excepcion");
    expect(compras[0]?.id).toBe(c.id);
  });
});

describe("contactos y grupo (ADR-008 §3)", () => {
  const PROHIBIDO = /tope|compras|medios|cantidad/i;

  it("un contacto no trae tope, compras ni medios", async () => {
    const cs = await api.getContactos();
    for (const c of cs) expect(Object.keys(c).filter((k) => PROHIBIDO.test(k))).toEqual([]);
  });

  it("cena del sábado: paga Mateo, ≈$5.000 y ≈$9.000 cada uno", async () => {
    const g = await api.recomendarGrupo({
      ...api.getGrupoDeEjemplo(),
      integrantes: [
        { tipo: "vos" },
        { tipo: "contacto", contactoId: "lucia" },
        { tipo: "contacto", contactoId: "mateo" },
        { tipo: "sin-cuenta", nombre: "Sofía" },
      ],
    });
    expect(g.quienPaga).toEqual({ nombre: "Mateo", esVos: false });
    expect(g.medio).toBe("su Provincia Visa débito");
    expect(g.reintegro).toBe(5000);
    expect(g.partePorPersona).toBe(9000);
    expect(g.base?.texto).toBe("según las compras que registró Mateo");
    const det = Object.fromEntries(g.integrantes.map((i) => [i.nombre, i.detalle]));
    expect(det["Sofía"]).toBe("Sin cuenta: no conocemos su tope");
    expect(det["Lucía"]).toContain("no tiene compras registradas: sin base");
    // De Lucía no se nombra ningún medio (no es quien paga).
    expect(det["Lucía"]).not.toMatch(/Galicia|Visa|Mastercard|débito|crédito/);
    expect(g.integrantes.find((i) => i.esVos)?.iniciales).toBeNull();
  });

  it("quitar un contacto lo saca de la lista", async () => {
    await api.quitarContacto("mateo");
    const cs = await api.getContactos();
    expect(cs.map((c) => c.id)).toEqual(["lucia"]);
  });

  it("invitaciones: válida, vencida y ya contacto", async () => {
    expect((await api.verInvitacion("demo-tomas")).estado).toBe("valida");
    expect((await api.verInvitacion("demo-vencida")).estado).toBe("vencida");
    expect((await api.verInvitacion("demo-contacto")).estado).toBe("ya-contacto");
    await api.aceptarInvitacion("demo-tomas");
    expect((await api.getContactos()).map((c) => c.nombre)).toContain("Tomás");
    expect((await api.verInvitacion("demo-tomas")).estado).toBe("ya-contacto");
  });
});
