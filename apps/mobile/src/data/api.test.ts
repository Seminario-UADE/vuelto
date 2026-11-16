import { beforeEach, describe, expect, it } from "vitest";
import * as api from "./api";

// Lo que la app todavía simula de la red (el ticket). Contactos, invitaciones y grupo:
// `src/grupo/*.test.ts` y `store/contactos.test.ts`. El cálculo de la
// recomendación y los topes se prueba en `calculo.test.ts` y `store/*.test.ts`.

beforeEach(() => {
  api.setDemora(0);
});

describe("ticket: los escenarios de desarrollo (spec 014, FR-012)", () => {
  it("ticket de ejemplo: la lectura de hoy, con el medio tal cual lo dice el ticket y sin imagen", async () => {
    const t = await api.leerTicket({ hoy: "2026-11-07", escenario: "ejemplo" });
    expect(t).toMatchObject({
      ok: true,
      comercio: "Coto",
      monto: 24500,
      medio: { banco: null, tipo: "debito", red: "visa", ultimos4: null },
    });
    expect(JSON.stringify(t)).not.toMatch(/imagen|image|base64|uri/i);
  });

  it("devuelve la fecha de hoy que le pasan, también en el texto extraído (spec 012 R12)", async () => {
    const t = await api.leerTicket({ hoy: "2026-11-07", escenario: "ejemplo" });
    expect(t.ok).toBe(true);
    if (!t.ok) return;
    expect(t.fecha).toBe("2026-11-07");
    expect(t.textoExtraido).toContain("07/11/2026");
    expect(t.textoExtraido).toContain("VISA DEBITO");
  });

  it("ticket ilegible → ticket_ilegible", async () => {
    expect(await api.leerTicket({ hoy: "2026-11-07", escenario: "ilegible" })).toEqual({ ok: false, resultado: "ticket_ilegible" });
  });

  it("sin red → sin_conexion", async () => {
    expect(await api.leerTicket({ hoy: "2026-11-07", escenario: "sin-red" })).toEqual({ ok: false, resultado: "sin_conexion" });
  });
});
