import { beforeEach, describe, expect, it } from "vitest";
import * as api from "./api";

// Lo que la app todavía pide a la red (ticket, invitaciones, grupo). El cálculo de la
// recomendación y los topes se prueba en `calculo.test.ts` y `store/*.test.ts`.

beforeEach(() => {
  api.setDemora(0);
});

describe("ticket", () => {
  it("no trae medio de pago (RF-10) ni imagen", async () => {
    const t = await api.leerTicket({ hoy: "2026-11-07" });
    expect(t.ok).toBe(true);
    if (t.ok) expect(t.medio).toBeNull();
    expect(JSON.stringify(t)).not.toMatch(/imagen|image|base64|uri/i);
  });

  it("devuelve la fecha de hoy que le pasan, también en el texto extraído (spec 012 R12)", async () => {
    const t = await api.leerTicket({ hoy: "2026-11-07" });
    expect(t.ok).toBe(true);
    if (!t.ok) return;
    expect(t.fecha).toBe("2026-11-07");
    expect(t.textoExtraido).toContain("07/11/2026");
  });

  it("escenario de ticket ilegible: error para mostrar", async () => {
    const t = await api.leerTicket({ hoy: "2026-11-07", falla: "ilegible" });
    expect(t.ok).toBe(false);
  });

  it("escenario sin red: falla con el error de conexión (spec 012 R12)", async () => {
    const t = await api.leerTicket({ hoy: "2026-11-07", falla: "sin-red" });
    expect(t.ok).toBe(false);
    if (!t.ok) expect(t.error).toMatch(/conexión/i);
  });
});

describe("gasto en grupo (stand-in de la Edge Function, con el motor por integrante)", () => {
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
    expect(g.cuando).toBe("sábado 17/10");
    expect(g.base?.texto).toBe("según las compras que registró Mateo");
    const det = Object.fromEntries(g.integrantes.map((i) => [i.nombre, i.detalle]));
    expect(det["Sofía"]).toBe("Sin cuenta: no conocemos su tope");
    expect(det["Lucía"]).toContain("no tiene compras registradas: sin base");
    // ADR-008 §3: de Lucía no se nombra ningún medio (no es quien paga).
    expect(det["Lucía"]).not.toMatch(/Galicia|Visa|Mastercard|débito|crédito/);
    expect(g.integrantes.find((i) => i.esVos)?.iniciales).toBeNull();
  });

  it("cada reintegro estimado lleva su base: a igual reintegro gana el que tiene base", async () => {
    const g = await api.recomendarGrupo({
      nombre: null,
      comercioId: "coto",
      monto: 24500,
      fecha: "2026-10-14",
      integrantes: [{ tipo: "vos" }, { tipo: "contacto", contactoId: "lucia" }],
    });
    // Vos y Lucía empatan en ≈$4.900; gana Vos porque su estimado tiene base.
    expect(g.quienPaga).toEqual({ nombre: "Vos", esVos: true });
    expect(g.cuando).toBe("hoy miércoles");
    const lucia = g.integrantes.find((i) => i.nombre === "Lucía")?.detalle ?? "";
    expect(lucia).toBe("≈$4.900 si paga Lucía · Lucía no tiene compras registradas: sin base");
  });
});

describe("invitaciones (ADR-008)", () => {
  it("válida, vencida, ya contacto; aceptar devuelve solo lo que ADR-008 §3 deja ver", async () => {
    expect((await api.verInvitacion("demo-tomas", [])).estado).toBe("valida");
    expect((await api.verInvitacion("demo-vencida", [])).estado).toBe("vencida");
    expect((await api.verInvitacion("demo-contacto", [])).estado).toBe("ya-contacto");
    const { contacto } = await api.aceptarInvitacion("demo-tomas");
    expect(Object.keys(contacto).filter((k) => /tope|compras|medios|cantidad/i.test(k))).toEqual([]);
    expect((await api.verInvitacion("demo-tomas", [contacto.id])).estado).toBe("ya-contacto");
  });

  it("una invitación que no es válida no se acepta", async () => {
    await expect(api.aceptarInvitacion("demo-vencida")).rejects.toThrow("ya no es válida");
  });
});
