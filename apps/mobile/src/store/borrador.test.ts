import { describe, expect, it } from "vitest";
import type { MedioDelBorrador } from "../perfil/borrador";
import { borradorComercios, borradorMedios, borradorNombre } from "./perfil";
import { elegirMediosSinCuenta, guardarBorradorEnCuenta, leerMedios, TEXTO_FALLA_BORRADOR } from "./perfil-remoto";
import { memoria, storeDePrueba } from "./prueba";
import { GALICIA, guardado, ok, remoto } from "./prueba-perfil-remoto";
import { emailPorConfirmarCambio, usuarioCambio } from "./sesion";

// Spec 012, US5 (T044): lo elegido antes de tener cuenta se guarda en ella al crearla o al entrar.

const AHORA = "2026-11-16T12:00:00.000Z";
const elegido: MedioDelBorrador = { bancoId: GALICIA, nombreBanco: "Banco Galicia", tipo: "credito", red: "visa" };

/** Un store con lo elegido sin cuenta y, después, una sesión abierta. */
function conBorrador(r = remoto(), { comercios = ["Coto", "Farmacity"], nombre = "Ana" as string | null } = {}) {
  const s = storeDePrueba(null, memoria(), { perfilRemoto: r.datos });
  s.dispatch(borradorMedios({ medios: [elegido], creadoEn: AHORA }));
  s.dispatch(borradorComercios({ comercios, creadoEn: AHORA }));
  if (nombre !== null) s.dispatch(borradorNombre({ nombre, creadoEn: AHORA }));
  s.dispatch(usuarioCambio({ id: "u1", email: "ana@mail.com" }));
  return s;
}

describe("guardarBorradorEnCuenta (spec 012, US5, FR-031 y FR-034)", () => {
  it("cuenta vacía: guarda los medios, los comercios y el nombre, y borra el borrador (SC-009)", async () => {
    const r = remoto({ confirmarOnboarding: ok([guardado("m1")]) });
    const s = conBorrador(r);
    const res = await s.dispatch(guardarBorradorEnCuenta());
    expect(res).toEqual({ ok: true, datos: [] });
    expect(r.llamadas).toContain("confirmar:1");
    expect(r.llamadas).toContain("confirmarComercios:Coto|Farmacity");
    expect(r.llamadas).toContain("guardarNombre:u1:Ana");
    const p = s.getState().perfil;
    expect(p.medios).toEqual([guardado("m1")]);
    expect(p.comercios.map((c) => c.nombre)).toEqual(["Coto", "Farmacity"]);
    expect(p.nombre).toBe("Ana");
    expect(p.onboardingCompleto).toBe(true);
    expect(p.carga).toBe("lista");
    expect(p.borrador).toBeNull();
  });

  it("los medios se mandan sin el nombre del banco, que no es una columna", async () => {
    const r = remoto();
    let enviados: unknown = null;
    const datos = { ...r.datos, confirmarOnboarding: async (n: unknown) => ((enviados = n), ok([guardado("m1")])) };
    const s = conBorrador({ ...r, datos });
    await s.dispatch(guardarBorradorEnCuenta());
    expect(enviados).toEqual([{ bancoId: GALICIA, tipo: "credito", red: "visa" }]);
  });

  it("cuenta con medios: prevalecen los de la cuenta, el borrador los descarta y avisa", async () => {
    const r = remoto({ leerMisMedios: ok([guardado("cuenta-1", "master")]) });
    const s = conBorrador(r);
    const res = await s.dispatch(guardarBorradorEnCuenta());
    expect(res).toEqual({ ok: true, datos: ["medios-de-la-cuenta"] });
    expect(r.llamadas.some((l) => l.startsWith("confirmar:"))).toBe(false);
    expect(s.getState().perfil.medios).toEqual([guardado("cuenta-1", "master")]);
    // Los comercios, aparte: la cuenta no tenía, así que se guardan los elegidos.
    expect(r.llamadas).toContain("confirmarComercios:Coto|Farmacity");
    expect(s.getState().sesion.aviso).toBe("Tu cuenta ya tenía tarjetas: quedaron esas");
  });

  it("cuenta con habituales: igual, por separado de los medios", async () => {
    const r = remoto({ leerMisComercios: ok([{ id: "c-cuenta", nombre: "Jumbo" }]) });
    const s = conBorrador(r);
    const res = await s.dispatch(guardarBorradorEnCuenta());
    expect(res).toEqual({ ok: true, datos: ["comercios-de-la-cuenta"] });
    expect(r.llamadas).toContain("confirmar:1");
    expect(r.llamadas.some((l) => l.startsWith("confirmarComercios"))).toBe(false);
    expect(s.getState().perfil.comercios).toEqual([{ id: "c-cuenta", nombre: "Jumbo" }]);
    expect(s.getState().perfil.borrador).toBeNull();
  });

  it("la cuenta ya tiene nombre: queda el de la cuenta", async () => {
    const r = remoto({ leerNombre: ok("Ana María") });
    const s = conBorrador(r);
    await s.dispatch(guardarBorradorEnCuenta());
    expect(r.llamadas.some((l) => l.startsWith("guardarNombre"))).toBe(false);
    expect(s.getState().perfil.nombre).toBe("Ana María");
  });

  it("una falla a mitad conserva el borrador de lo que falta, y la próxima lectura lo reintenta", async () => {
    const falla = remoto({ confirmarComercios: { ok: false, error: "sin_conexion" } });
    const s = storeDePrueba(null, memoria(), { perfilRemoto: falla.datos });
    s.dispatch(borradorMedios({ medios: [elegido], creadoEn: AHORA }));
    s.dispatch(borradorComercios({ comercios: ["Coto"], creadoEn: AHORA }));
    s.dispatch(usuarioCambio({ id: "u1", email: "ana@mail.com" }));

    const res = await s.dispatch(guardarBorradorEnCuenta());
    expect(res).toEqual({ ok: false, error: "sin_conexion" });
    // Los medios ya están en la cuenta: salen del borrador. Los comercios, no.
    expect(s.getState().perfil.medios).toEqual([guardado("m1")]);
    expect(s.getState().perfil.borrador).toEqual({ medios: [], comercios: ["Coto"], nombre: null, creadoEn: AHORA });
  });

  it("sin poder leer la cuenta no guarda nada y conserva todo el borrador", async () => {
    const r = remoto({ leerMisMedios: { ok: false, error: "sin_conexion" } });
    const s = conBorrador(r);
    const antes = s.getState().perfil.borrador;
    const res = await s.dispatch(guardarBorradorEnCuenta());
    expect(res).toEqual({ ok: false, error: "sin_conexion" });
    expect(r.llamadas.some((l) => l.startsWith("confirmar"))).toBe(false);
    expect(s.getState().perfil.borrador).toEqual(antes);
    expect(s.getState().perfil.carga).toBe("sin-conexion");
  });

  it("al entrar, leerMedios guarda primero el borrador (FR-031: al crearla o en el primer ingreso)", async () => {
    const r = remoto({ confirmarOnboarding: ok([guardado("m1")]) });
    const s = conBorrador(r, { comercios: [], nombre: null });
    await s.dispatch(leerMedios());
    expect(r.llamadas).toContain("confirmar:1");
    expect(s.getState().perfil.borrador).toBeNull();
  });

  it("el registro y la lectura de la sesión nueva a la vez comparten una sola pasada: nada se guarda dos veces", async () => {
    const r = remoto({ confirmarOnboarding: ok([guardado("m1")]) });
    const s = conBorrador(r);
    const [a, b] = await Promise.all([s.dispatch(guardarBorradorEnCuenta()), s.dispatch(leerMedios())]);
    expect(a.ok).toBe(true);
    expect(b).toBeUndefined();
    expect(r.llamadas.filter((l) => l.startsWith("confirmar:"))).toHaveLength(1);
    expect(r.llamadas.filter((l) => l.startsWith("confirmarComercios"))).toHaveLength(1);
  });

  it("sin sesión no hace nada: el borrador espera a la cuenta", async () => {
    const r = remoto();
    const s = storeDePrueba(null, memoria(), { perfilRemoto: r.datos });
    s.dispatch(borradorMedios({ medios: [elegido], creadoEn: AHORA }));
    expect(await s.dispatch(guardarBorradorEnCuenta())).toEqual({ ok: true, datos: [] });
    expect(r.llamadas).toEqual([]);
    expect(s.getState().perfil.borrador?.medios).toEqual([elegido]);
  });

  it("con confirmación de email: el borrador espera sin sesión y se guarda en el primer ingreso (FR-033, SC-009)", async () => {
    const r = remoto({ confirmarOnboarding: ok([guardado("m1")]) });
    const s = storeDePrueba(null, memoria(), { perfilRemoto: r.datos });
    s.dispatch(borradorMedios({ medios: [elegido], creadoEn: AHORA }));
    s.dispatch(borradorNombre({ nombre: "Ana", creadoEn: AHORA }));
    // El registro no devolvió sesión: «Revisá tu email» muestra la dirección.
    s.dispatch(emailPorConfirmarCambio("ana@mail.com"));
    await s.dispatch(leerMedios());
    expect(r.llamadas).toEqual([]);
    expect(s.getState().sesion.emailPorConfirmar).toBe("ana@mail.com");

    // Confirmó y entró: la dirección ya no hace falta y el borrador pasa entero a la cuenta.
    s.dispatch(usuarioCambio({ id: "u1", email: "ana@mail.com" }));
    expect(s.getState().sesion.emailPorConfirmar).toBeNull();
    await s.dispatch(leerMedios());
    expect(r.llamadas).toContain("confirmar:1");
    expect(r.llamadas).toContain("guardarNombre:u1:Ana");
    expect(s.getState().perfil.borrador).toBeNull();
  });

  it("el comienzo del borrador es el reloj real, no el de ejemplo: no se vence por error (FR-031)", () => {
    const s = storeDePrueba(null, memoria(), { reloj: () => new Date("2026-11-16T15:00:00.000Z") });
    // Sin corpus sincronizado, `sesion.ahora` sigue en el reloj de ejemplo (octubre).
    expect(s.getState().sesion.ahora.startsWith("2026-10")).toBe(true);
    s.dispatch(elegirMediosSinCuenta([elegido]));
    expect(s.getState().perfil.borrador?.creadoEn).toBe("2026-11-16T15:00:00.000Z");
  });

  it("si fallan los comercios, se avisa en vez de quedar trabado en silencio (escenario 8)", async () => {
    const r = remoto({ confirmarComercios: { ok: false, error: "sin_conexion" } });
    const s = conBorrador(r);
    await s.dispatch(guardarBorradorEnCuenta());
    expect(s.getState().sesion.aviso).toBe(TEXTO_FALLA_BORRADOR.comercios);
    expect(s.getState().perfil.borrador?.comercios).toEqual(["Coto", "Farmacity"]);
  });

  it("si falla el nombre, se avisa y el nombre queda en el borrador para reintentar", async () => {
    const r = remoto({ guardarNombre: { ok: false, error: "sin_conexion" } });
    const s = conBorrador(r);
    await s.dispatch(guardarBorradorEnCuenta());
    expect(s.getState().sesion.aviso).toBe(TEXTO_FALLA_BORRADOR.nombre);
    expect(s.getState().perfil.borrador).toEqual({ medios: [], comercios: [], nombre: "Ana", creadoEn: AHORA });
  });
});
