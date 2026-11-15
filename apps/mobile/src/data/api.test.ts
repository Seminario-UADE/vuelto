import { beforeEach, describe, expect, it } from "vitest";
import * as api from "./api";

// Lo que la app todavía pide a la red con datos de ejemplo (el ticket). Contactos, invitaciones y grupo:
// `src/grupo/*.test.ts` y `store/contactos.test.ts`. El cálculo de la
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
