import { describe, expect, it } from "vitest";
import type { DatosPerfil, Resultado } from "../perfil/datos";
import type { MedioDePago, MedioNuevo } from "../perfil/modelo";
import { sesionCerrada } from "./acciones";
import { mediosConfirmados } from "./perfil";
import { agregarMedio, confirmarMedios, leerMedios, sacarMedio } from "./perfil-remoto";
import { memoria, storeDePrueba } from "./prueba";
import { usuarioCambio } from "./sesion";

// Issue #41, fases 2b y 3: el slice `perfil` guarda lo que devuelve Supabase (spec 001).

const GALICIA = "88d8705e-2dda-46f9-8411-bb4916af858e";
const nuevo: MedioNuevo = { bancoId: GALICIA, tipo: "credito", red: "visa" };
const guardado = (id: string, red: MedioDePago["red"] = "visa"): MedioDePago => ({
  id,
  bancoId: GALICIA,
  nombreBanco: "Banco Galicia",
  tipo: "credito",
  red,
});
const ok = <T>(datos: T): Resultado<T> => ({ ok: true, datos });

/** Un `DatosPerfil` que contesta lo que se le diga y anota lo que le piden. */
function remoto(respuestas: Partial<{ [K in keyof DatosPerfil]: Awaited<ReturnType<DatosPerfil[K]>> }> = {}) {
  const llamadas: string[] = [];
  const datos: DatosPerfil = {
    leerBancos: async () => (llamadas.push("leerBancos"), respuestas.leerBancos ?? ok([])),
    leerMisMedios: async () => (llamadas.push("leerMisMedios"), respuestas.leerMisMedios ?? ok([])),
    confirmarOnboarding: async (n) => (
      llamadas.push(`confirmar:${n.length}`), respuestas.confirmarOnboarding ?? ok([guardado("m1")])
    ),
    agregarMedio: async () => (llamadas.push("agregar"), respuestas.agregarMedio ?? ok(guardado("m2", "master"))),
    sacarMedio: async (id) => (llamadas.push(`sacar:${id}`), respuestas.sacarMedio ?? ok(null)),
  };
  return { datos, llamadas };
}

function armar(r = remoto(), conUsuario = true) {
  const s = storeDePrueba(null, memoria(), { perfilRemoto: r.datos });
  if (conUsuario) s.dispatch(usuarioCambio({ id: "u1", email: "ana@mail.com" }));
  return s;
}

describe("leerMedios (T009, T011)", () => {
  it("con medios en Supabase, reemplaza lo local y da el onboarding por hecho (entra desde otro celular)", async () => {
    const s = armar(remoto({ leerMisMedios: ok([guardado("m1")]) }));
    await s.dispatch(leerMedios());
    expect(s.getState().perfil.medios).toEqual([guardado("m1")]);
    expect(s.getState().perfil.onboardingCompleto).toBe(true);
    expect(s.getState().perfil.carga).toBe("lista");
  });

  it("sin medios en Supabase, el perfil queda vacío: las pestañas mandan al onboarding", async () => {
    const s = armar();
    await s.dispatch(leerMedios());
    expect(s.getState().perfil.medios).toEqual([]);
    expect(s.getState().perfil.onboardingCompleto).toBe(false);
  });

  it("sin conexión, se queda lo que había y lo avisa (FR-010)", async () => {
    const s = armar(remoto({ leerMisMedios: { ok: false, error: "sin_conexion" } }));
    s.dispatch(mediosConfirmados([guardado("m1")]));
    await s.dispatch(leerMedios());
    expect(s.getState().perfil.medios).toEqual([guardado("m1")]);
    expect(s.getState().perfil.carga).toBe("sin-conexion");
  });

  it("otro error deja la carga en error, sin tocar los medios", async () => {
    const s = armar(remoto({ leerMisMedios: { ok: false, error: "sesion_vencida" } }));
    await s.dispatch(leerMedios());
    expect(s.getState().perfil.carga).toBe("error");
  });

  it("una lectura que salió antes de una escritura no la pisa", async () => {
    let soltar!: () => void;
    const r = remoto();
    r.datos.leerMisMedios = () => new Promise((res) => (soltar = () => res(ok([guardado("m1")]))));
    const s = armar(r);
    s.dispatch(mediosConfirmados([guardado("m1")]));
    const lectura = s.dispatch(leerMedios());
    await s.dispatch(agregarMedio({ ...nuevo, red: "master" }));
    soltar();
    await lectura;
    expect(s.getState().perfil.medios.map((m) => m.id)).toEqual(["m1", "m2"]);
    expect(s.getState().perfil.carga).toBe("lista");
  });

  it("sin Supabase pasa a sin-conexion: las pestañas no esperan para siempre", async () => {
    const s = storeDePrueba(null, memoria(), {});
    s.dispatch(usuarioCambio({ id: "u1", email: "ana@mail.com" }));
    await s.dispatch(leerMedios());
    expect(s.getState().perfil.carga).toBe("sin-conexion");
  });

  it("sin usuario no pide nada", async () => {
    const r = remoto();
    const s = armar(r, false);
    await s.dispatch(leerMedios());
    expect(r.llamadas).toEqual([]);
    expect(s.getState().perfil.carga).toBe("sin-leer");
  });

  it("si la sesión se cerró mientras volaba el pedido, el resultado se descarta", async () => {
    const r = remoto({ leerMisMedios: ok([guardado("m1")]) });
    const s = armar(r);
    const pedido = s.dispatch(leerMedios());
    s.dispatch(sesionCerrada());
    await pedido;
    expect(s.getState().perfil.medios).toEqual([]);
  });
});

describe("confirmarMedios (T008)", () => {
  it("guarda todo en un pedido y el slice queda con lo que devolvió Supabase (FR-011)", async () => {
    const r = remoto();
    const s = armar(r);
    const res = await s.dispatch(confirmarMedios([nuevo, { ...nuevo, red: "master" }]));
    expect(res.ok).toBe(true);
    expect(r.llamadas).toEqual(["confirmar:2"]);
    expect(s.getState().perfil.medios).toEqual([guardado("m1")]);
    // Faltan los pasos siguientes del onboarding.
    expect(s.getState().perfil.onboardingCompleto).toBe(false);
  });

  it("sin medios no pide nada (FR-007)", async () => {
    const r = remoto();
    const s = armar(r);
    expect((await s.dispatch(confirmarMedios([]))).ok).toBe(false);
    expect(r.llamadas).toEqual([]);
  });

  it("si falla, el slice no cambia y devuelve el error clasificado (FR-006)", async () => {
    const s = armar(remoto({ confirmarOnboarding: { ok: false, error: "sin_conexion" } }));
    expect(await s.dispatch(confirmarMedios([nuevo]))).toEqual({ ok: false, error: "sin_conexion" });
    expect(s.getState().perfil.medios).toEqual([]);
  });

  it("sin cliente de Supabase avisa que no hay conexión", async () => {
    const s = storeDePrueba(null, memoria());
    expect(await s.dispatch(confirmarMedios([nuevo]))).toEqual({ ok: false, error: "sin_conexion" });
  });
});

describe("agregarMedio y sacarMedio (T010)", () => {
  it("agregar suma lo que devolvió Supabase", async () => {
    const s = armar();
    s.dispatch(mediosConfirmados([guardado("m1")]));
    await s.dispatch(agregarMedio({ ...nuevo, red: "master" }));
    expect(s.getState().perfil.medios.map((m) => m.id)).toEqual(["m1", "m2"]);
  });

  it("un duplicado no llega a Supabase (FR-004)", async () => {
    const r = remoto();
    const s = armar(r);
    s.dispatch(mediosConfirmados([guardado("m1")]));
    expect(await s.dispatch(agregarMedio(nuevo))).toEqual({ ok: false, error: "duplicado" });
    expect(r.llamadas).toEqual([]);
  });

  it("sacar saca el medio; el último no se puede sacar (FR-009)", async () => {
    const r = remoto();
    const s = armar(r);
    s.dispatch(mediosConfirmados([guardado("m1"), guardado("m2", "master")]));
    expect((await s.dispatch(sacarMedio("m1"))).ok).toBe(true);
    expect(s.getState().perfil.medios.map((m) => m.id)).toEqual(["m2"]);
    expect((await s.dispatch(sacarMedio("m2"))).ok).toBe(false);
    expect(r.llamadas).toEqual(["sacar:m1"]);
  });

  it("si Supabase falla, el slice no cambia", async () => {
    const s = armar(remoto({ sacarMedio: { ok: false, error: "sin_conexion" } }));
    s.dispatch(mediosConfirmados([guardado("m1"), guardado("m2", "master")]));
    expect(await s.dispatch(sacarMedio("m1"))).toEqual({ ok: false, error: "sin_conexion" });
    expect(s.getState().perfil.medios).toHaveLength(2);
    expect(s.getState().perfil.carga).toBe("sin-conexion");
  });

  it("si cambió la cuenta mientras volaba el pedido, no se guarda en el slice nuevo", async () => {
    const r = remoto();
    const s = armar(r);
    r.datos.confirmarOnboarding = async () => {
      s.dispatch(usuarioCambio({ id: "u2", email: "otra@mail.com" }));
      return ok([guardado("m1")]);
    };
    expect((await s.dispatch(confirmarMedios([nuevo]))).ok).toBe(false);
    expect(s.getState().perfil.medios).toEqual([]);
  });
});
