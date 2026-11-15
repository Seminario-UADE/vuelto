import { beforeEach, describe, expect, it } from "vitest";
import * as api from "./api";
import { catalogoComercios, mediosDeEjemplo, mediosDeclarados } from "./fixtures";
import { mediosConfirmados } from "../store/perfil";
import { storeDePrueba } from "../store/prueba";
import { selectEntradasMotor } from "../store/selectores";
import { ahoraCambio } from "../store/sesion";

// Lo que la app todavía pide a la red (ticket, invitaciones, grupo). El cálculo de la
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

/** Las entradas del motor de una cuenta, como las arma el store (`selectEntradasMotor`). */
function entradasDe(opciones: { medios?: string[]; ahora?: string } = {}) {
  const s = storeDePrueba();
  s.dispatch(mediosConfirmados(mediosDeEjemplo(opciones.medios ?? [])));
  if (opciones.ahora) s.dispatch(ahoraCambio(opciones.ahora));
  return selectEntradasMotor(s.getState());
}

/** La demo: los medios y las compras de Martín, con las promos de ejemplo. */
const demo = () => entradasDe({ medios: mediosDeclarados.map((m) => m.id) });
const coto = catalogoComercios.find((c) => c.id === "coto")!;

/** Coto, $24.500, el miércoles 14/10: Vos y Lucía. */
const conLucia = (comercio = coto) => ({
  nombre: null,
  comercio,
  monto: 24500,
  fecha: "2026-10-14",
  integrantes: [{ tipo: "vos" as const }, { tipo: "contacto" as const, contactoId: "lucia" }],
});

describe("gasto en grupo (stand-in de la Edge Function, con el motor por integrante)", () => {
  it("cena del sábado: paga Mateo, ≈$5.000 y ≈$9.000 cada uno", async () => {
    const g = await api.recomendarGrupo(
      {
        ...api.getGrupoDeEjemplo(),
        integrantes: [
          { tipo: "vos" },
          { tipo: "contacto", contactoId: "lucia" },
          { tipo: "contacto", contactoId: "mateo" },
          { tipo: "sin-cuenta", nombre: "Sofía" },
        ],
      },
      demo(),
    );
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
    const g = await api.recomendarGrupo(conLucia(), demo());
    // Vos y Lucía empatan en ≈$4.900; gana Vos porque su estimado tiene base.
    expect(g.quienPaga).toEqual({ nombre: "Vos", esVos: true });
    expect(g.cuando).toBe("hoy miércoles");
    const lucia = g.integrantes.find((i) => i.nombre === "Lucía")?.detalle ?? "";
    expect(lucia).toBe("≈$4.900 si paga Lucía · Lucía no tiene compras registradas: sin base");
  });

  it("«Vos» se evalúa con los medios de la cuenta, no con los de Martín (G-01)", async () => {
    // Una cuenta sin medios cargados no puede pagar con promo: paga Lucía.
    const g = await api.recomendarGrupo(conLucia(), { ...entradasDe({ medios: [] }), compras: [] });
    expect(g.quienPaga).toEqual({ nombre: "Lucía", esVos: false });
    const vos = g.integrantes.find((i) => i.esVos)?.detalle ?? "";
    expect(vos).not.toMatch(/Galicia|BBVA|Provincia|Santander|Macro|Naranja/);
  });

  it("«Vos» se evalúa con las compras de la cuenta: sin compras, el estimado no tiene base (G-01)", async () => {
    const conCompras = await api.recomendarGrupo(conLucia(), demo());
    const sinCompras = await api.recomendarGrupo(conLucia(), { ...demo(), compras: [] });
    // Paga Vos en los dos casos; cambia la base del estimado.
    expect(conCompras.quienPaga?.esVos).toBe(true);
    expect(conCompras.base).toMatchObject({ tipo: "compras", texto: expect.stringMatching(/^según \d+ compras? de octubre$/) });
    expect(sinCompras.quienPaga?.esVos).toBe(true);
    expect(sinCompras.base?.tipo).toBe("sin-compras");
  });

  it("todos se evalúan con el corpus del store, no con las promos de ejemplo (G-01)", async () => {
    const g = await api.recomendarGrupo(conLucia(), { ...demo(), promociones: [] });
    expect(g.quienPaga).toBeNull();
    expect(g.reintegro).toBeNull();
  });

  it("«hoy» sale del reloj del store (ADR-010)", async () => {
    const g = await api.recomendarGrupo(conLucia(), entradasDe({ medios: [], ahora: "2026-11-10T15:00:00.000Z" }));
    expect(g.cuando).toBe("miércoles 14/10");
    const hoy = await api.recomendarGrupo(
      { ...conLucia(), fecha: "2026-11-10" },
      entradasDe({ medios: [], ahora: "2026-11-10T15:00:00.000Z" }),
    );
    expect(hoy.cuando).toBe("hoy martes");
  });

  it("un comercio fuera del catálogo (sin rubro) responde sin reintegro, no se cuelga (G-04)", async () => {
    const libre = { id: "libre-panaderia-juan", nombre: "Panadería Juan", inicial: "P", rubro: "otro" as const, categoriaId: null, frecuente: false };
    const g = await api.recomendarGrupo(conLucia(libre), demo());
    expect(g.comercio.nombre).toBe("Panadería Juan");
    expect(g.quienPaga).toBeNull();
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
