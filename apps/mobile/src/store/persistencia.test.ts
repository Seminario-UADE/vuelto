import { describe, expect, it } from "vitest";
import { mediosDeEjemplo } from "../data/fixtures";
import { comprasOctubre } from "../data/fixtures";
import { compraAgregada } from "./compras";
import { contactoQuitado } from "./contactos";
import { CLAVE, CLAVE_VIEJA, rehidratar } from "./persistencia";
import { cargaCambio, mediosConfirmados, onboardingTerminado } from "./perfil";
import { selectRecomendacion, selectTopes } from "./selectores";
import { ahoraCambio, usuarioCambio } from "./sesion";
import { comercioElegido, montoCambiado } from "./simulacion";
import { esperar, memoria, storeDePrueba } from "./prueba";

const nueva = { ...comprasOctubre[0]!, id: "n11", fecha: "2026-10-14" };

async function abrir(almacenamiento = memoria()) {
  const s = storeDePrueba(null, almacenamiento);
  await s.dispatch(rehidratar());
  return s;
}

describe("persistencia (US4)", () => {
  it("perfil, corpus y compras sobreviven a cerrar y abrir", async () => {
    const disco = memoria();
    const a = await abrir(disco);
    a.dispatch(mediosConfirmados(mediosDeEjemplo(["galicia-visa-credito"])));
    a.dispatch(onboardingTerminado());
    a.dispatch(compraAgregada(nueva));
    await esperar();

    const b = await abrir(disco);
    expect(b.getState().perfil).toEqual(a.getState().perfil);
    expect(b.getState().corpus).toEqual(a.getState().corpus);
    expect(b.getState().compras.lista[0]?.id).toBe("n11");
  });

  it("el usuario autenticado no se guarda: la sesión la guarda el cliente de Supabase", async () => {
    const disco = memoria();
    const a = await abrir(disco);
    a.dispatch(usuarioCambio({ id: "u1", email: "ana@mail.com" }));
    a.dispatch(mediosConfirmados(mediosDeEjemplo(["galicia-visa-credito"])));
    await esperar();
    expect(disco.datos.get(CLAVE)).not.toContain("ana@mail.com");
    const b = await abrir(disco);
    expect(b.getState().sesion.usuario).toBeNull();
  });

  it("simulación, reloj y contactos no se guardan", async () => {
    const disco = memoria();
    const a = await abrir(disco);
    a.dispatch(comercioElegido("coto"));
    a.dispatch(montoCambiado(10000));
    a.dispatch(ahoraCambio("2026-10-20T15:00:00.000Z"));
    a.dispatch(contactoQuitado("mateo"));
    a.dispatch(onboardingTerminado());
    await esperar();

    const b = await abrir(disco);
    expect(b.getState().simulacion).toEqual({ comercioId: null, monto: null });
    expect(b.getState().sesion.ahora).not.toBe("2026-10-20T15:00:00.000Z");
    expect(b.getState().contactos.lista.map((c) => c.id)).toContain("mateo");
  });

  it("lo guardado no tiene nada derivado (FR-010)", async () => {
    const disco = memoria();
    const a = await abrir(disco);
    a.dispatch(mediosConfirmados(mediosDeEjemplo(["galicia-visa-credito"])));
    a.dispatch(comercioElegido("coto"));
    a.dispatch(montoCambiado(10000));
    expect(selectRecomendacion(a.getState())).not.toBeNull();
    expect(selectTopes(a.getState()).medios.length).toBeGreaterThan(0);
    await esperar();
    const guardado = disco.datos.get(CLAVE) ?? "";
    expect(Object.keys(JSON.parse(guardado))).toEqual(["version", "perfil", "corpus", "compras"]);
    for (const derivado of [
      '"mejor"',
      '"alternativas"',
      '"restante"',
      '"cifra"',
      '"reintegro"',
      '"topeDespues"',
      '"simulacion"',
    ]) {
      expect(guardado).not.toContain(derivado);
    }
  });

  it("al disco llegan solo las compras del período en curso (privacidad.md)", async () => {
    const disco = memoria();
    const a = await abrir(disco);
    a.dispatch(compraAgregada({ ...nueva, id: "sept", fecha: "2026-09-20" }));
    await esperar();
    const lista = JSON.parse(disco.datos.get(CLAVE) ?? "{}").compras.lista as { id: string }[];
    expect(lista.map((c) => c.id)).not.toContain("sept");
    expect(lista).toHaveLength(10);
  });

  it("no escribe antes de rehidratar (no pisa lo guardado)", async () => {
    const disco = memoria({ [CLAVE]: "guardado" });
    const s = storeDePrueba(null, disco);
    s.dispatch(onboardingTerminado());
    await esperar();
    expect(disco.datos.get(CLAVE)).toBe("guardado");
  });

  it("una parte corrupta vuelve solo esa al inicio", async () => {
    const disco = memoria();
    const a = await abrir(disco);
    a.dispatch(onboardingTerminado());
    a.dispatch(compraAgregada(nueva));
    await esperar();
    const roto = { ...JSON.parse(disco.datos.get(CLAVE) ?? "{}"), compras: { lista: "no es una lista" } };
    disco.datos.set(CLAVE, JSON.stringify(roto));

    const b = await abrir(disco);
    expect(b.getState().perfil.onboardingCompleto).toBe(true);
    expect(b.getState().compras.lista).toEqual(comprasOctubre);
  });

  it("JSON inválido u otra versión: arranca de cero sin romperse", async () => {
    for (const raw of ["{no es json", JSON.stringify({ version: 2, perfil: { onboardingCompleto: true } })]) {
      const b = await abrir(memoria({ [CLAVE]: raw }));
      expect(b.getState().perfil.onboardingCompleto).toBe(false);
      expect(b.getState().sesion.hidratado).toBe(true);
    }
  });

  it("los medios se guardan completos y el estado de la lectura en Supabase no (issue #41)", async () => {
    const disco = memoria();
    const a = await abrir(disco);
    a.dispatch(mediosConfirmados(mediosDeEjemplo(["galicia-visa-credito"])));
    a.dispatch(cargaCambio("sin-conexion"));
    await esperar();
    const guardado = JSON.parse(disco.datos.get(CLAVE)!);
    expect(guardado.perfil.medios).toEqual(mediosDeEjemplo(["galicia-visa-credito"]));
    expect(guardado.perfil).not.toHaveProperty("carga");
    const b = await abrir(disco);
    expect(b.getState().perfil.medios).toEqual(mediosDeEjemplo(["galicia-visa-credito"]));
    expect(b.getState().perfil.carga).toBe("sin-leer");
  });

  it("un perfil guardado con ids del catálogo viejo se migra; un medio con forma rota invalida el perfil", async () => {
    const perfil = { nombre: null, onboardingCompleto: true, comercios: [], invitacionPendiente: null };
    const viejo = JSON.stringify({ version: 1, perfil: { ...perfil, medios: ["macro-visa-debito", "no-existe"] } });
    expect((await abrir(memoria({ [CLAVE]: viejo }))).getState().perfil.medios).toEqual(
      mediosDeEjemplo(["macro-visa-debito"]),
    );
    const roto = JSON.stringify({ version: 1, perfil: { ...perfil, medios: [{ id: "m1", red: "visa" }] } });
    expect((await abrir(memoria({ [CLAVE]: roto }))).getState().perfil.medios).toEqual([]);
  });

  it("migra el perfil de perfil-local.ts y borra la clave vieja", async () => {
    const viejo = {
      onboardingCompleto: true,
      medios: ["galicia-visa-credito"],
      comercios: ["coto"],
      cuenta: { email: "martin@ejemplo.com", proveedor: "email" },
      invitacionPendiente: null,
    };
    const disco = memoria({ [CLAVE_VIEJA]: JSON.stringify(viejo) });
    const b = await abrir(disco);
    expect(b.getState().perfil).toMatchObject({
      onboardingCompleto: true,
      medios: mediosDeEjemplo(["galicia-visa-credito"]),
      nombre: "Martín",
    });
    expect(b.getState().sesion.usuario).toBeNull();
    await esperar();
    expect(disco.datos.has(CLAVE_VIEJA)).toBe(false);
    expect(disco.datos.has(CLAVE)).toBe(true);
  });

  it("sin almacenamiento la app sigue en memoria", async () => {
    const roto = {
      getItem: () => Promise.reject(new Error("x")),
      setItem: () => Promise.reject(new Error("x")),
      removeItem: () => Promise.reject(new Error("x")),
    };
    const s = storeDePrueba(null, roto);
    await s.dispatch(rehidratar());
    s.dispatch(onboardingTerminado());
    await esperar();
    expect(s.getState().perfil.onboardingCompleto).toBe(true);
  });
});
