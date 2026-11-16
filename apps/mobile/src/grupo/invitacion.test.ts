import { describe, expect, it } from "vitest";
import { textoVencimiento, vistaDeInvitacion } from "./invitacion";

describe("vistaDeInvitacion (US2-6, D9)", () => {
  it("dice quién invita, qué se comparte y que repetir consultas deja deducir más", () => {
    const v = vistaDeInvitacion({ estado: "valida", quienInvita: "Martín", venceEn: "2026-11-16T15:00:00Z" });
    expect(v.quienInvita).toBe("Martín");
    expect(v.venceEn).toBe("2026-11-16T15:00:00Z");
    expect(v.sePuedeDeducir).toMatch(/Martín podría deducir/);
    expect(v.sePuedeDeducir).toMatch(/repite consultas/);
    expect(v.noComparte).toContain("Cuánto tope te queda");
  });

  it("una inexistente no nombra a nadie ni trae vencimiento", () => {
    const v = vistaDeInvitacion({ estado: "inexistente", quienInvita: null, venceEn: null });
    expect(v.quienInvita).toBeNull();
    expect(v.venceEn).toBeNull();
    expect(v.sePuedeDeducir).toMatch(/la otra persona/);
  });
});

describe("textoVencimiento", () => {
  const ahora = new Date("2026-11-15T15:00:00Z");
  it("usa el vencimiento real", () => {
    expect(textoVencimiento("2026-11-16T15:00:00Z", ahora)).toBe("Vence en 24 h · sirve una sola vez");
    expect(textoVencimiento("2026-11-16T14:59:00Z", ahora)).toBe("Vence en 23 h · sirve una sola vez");
    expect(textoVencimiento("2026-11-15T15:30:00Z", ahora)).toBe("Vence en menos de 1 h · sirve una sola vez");
    expect(textoVencimiento(null, ahora)).toBe("Sirve una sola vez");
  });
});
