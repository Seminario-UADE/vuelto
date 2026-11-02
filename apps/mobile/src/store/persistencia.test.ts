import { describe, expect, it } from "vitest";
import { comprasOctubre, promociones } from "../data/fixtures";
import { compraAgregada } from "./compras";
import { contactoQuitado } from "./contactos";
import { sesionCerrada, sincronizado } from "./acciones";
import { CLAVE, CLAVE_CORPUS, CLAVE_VIEJA, CORPUS_VACIO, rehidratar } from "./persistencia";
import { mediosElegidos, onboardingTerminado } from "./perfil";
import { selectRecomendacion, selectTopes } from "./selectores";
import { ahoraCambio, usuarioCambio } from "./sesion";
import { comercioElegido, montoCambiado } from "./simulacion";
import { esperar, memoria, storeDePrueba } from "./prueba";
import { eliminarCompra } from "./thunks";

const nueva = { ...comprasOctubre[0]!, id: "n11", fecha: "2026-10-14" };

async function abrir(almacenamiento = memoria()) {
  const s = storeDePrueba(null, almacenamiento);
  await s.dispatch(rehidratar());
  return s;
}

describe("persistencia (US4)", () => {
  it("perfil y compras sobreviven a cerrar y abrir (el corpus de ejemplo no se guarda)", async () => {
    const disco = memoria();
    const a = await abrir(disco);
    a.dispatch(mediosElegidos(["galicia-visa-credito"]));
    a.dispatch(onboardingTerminado());
    a.dispatch(compraAgregada(nueva));
    await esperar();

    const b = await abrir(disco);
    expect(b.getState().perfil).toEqual(a.getState().perfil);
    expect(b.getState().corpus.marca).toBeNull();
    expect(disco.datos.has(CLAVE_CORPUS)).toBe(false);
    expect(b.getState().compras.lista[0]?.id).toBe("n11");
  });

  it("una compra eliminada tampoco queda en el disco (spec 010, FR-002)", async () => {
    const disco = memoria();
    const a = await abrir(disco);
    a.dispatch(compraAgregada(nueva));
    await esperar();
    expect(disco.datos.get(CLAVE)).toContain('"n11"');

    a.dispatch(eliminarCompra("n11"));
    await esperar();
    expect(disco.datos.get(CLAVE)).not.toContain('"n11"');
    const b = await abrir(disco);
    expect(b.getState().compras.lista.some((c) => c.id === "n11")).toBe(false);
  });

  it("el usuario autenticado no se guarda: la sesión la guarda el cliente de Supabase", async () => {
    const disco = memoria();
    const a = await abrir(disco);
    a.dispatch(usuarioCambio({ id: "u1", email: "ana@mail.com" }));
    a.dispatch(mediosElegidos(["galicia-visa-credito"]));
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
    a.dispatch(mediosElegidos(["galicia-visa-credito"]));
    a.dispatch(comercioElegido("coto"));
    a.dispatch(montoCambiado(10000));
    expect(selectRecomendacion(a.getState())).not.toBeNull();
    expect(selectTopes(a.getState()).medios.length).toBeGreaterThan(0);
    await esperar();
    const guardado = disco.datos.get(CLAVE) ?? "";
    expect(Object.keys(JSON.parse(guardado))).toEqual(["version", "perfil", "compras"]);
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
      medios: ["galicia-visa-credito"],
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

describe("persistencia del corpus en su propia clave (spec 009 FR-017)", () => {
  const corpusGuardado = (marca: string | null) =>
    JSON.stringify({ version: 1, promociones: [], marca, sincronizadoEn: marca === null ? null : "2026-11-02T15:00:00.000Z" });

  it("si la escritura del corpus falla, perfil y compras igual se guardan", async () => {
    const disco = memoria();
    const falla = { ...disco, setItem: async (k: string, v: string) => (k === CLAVE_CORPUS ? Promise.reject(new Error("lleno")) : disco.setItem(k, v)) };
    const s = storeDePrueba(null, falla);
    await s.dispatch(rehidratar());
    s.dispatch(onboardingTerminado());
    s.dispatch(sincronizado({ corpus: { promociones: [], marca: "2026-11-02T12:00:00+00:00", sincronizadoEn: "2026-11-02T15:00:00.000Z", descartadas: 0 }, compras: [], ahora: "2026-11-02T15:00:00.000Z" }));
    await esperar();
    expect(JSON.parse(disco.datos.get(CLAVE) ?? "{}").perfil.onboardingCompleto).toBe(true);
    expect(disco.datos.has(CLAVE_CORPUS)).toBe(false);
  });

  it("un guardado v1 anterior a la spec 009 (con corpus de ejemplo adentro y sin los campos nuevos) se lee como nunca sincronizado", async () => {
    const viejo = JSON.stringify({
      version: 1,
      perfil: { nombre: "Martín", onboardingCompleto: true, medios: ["galicia-visa-credito"], comercios: [], invitacionPendiente: null },
      // El corpus de ejemplo que guardaban las versiones anteriores (con `cargadoEn`): ahora se ignora.
      corpus: { promociones: [{ id: "promo-galicia-super-mie", tope: {}, vigencia: {} }], cargadoEn: "2026-10-14T15:00:00.000Z" },
      compras: { lista: [{ id: "c1", fecha: "2026-10-09", monto: 1 }] },
    });
    const s = await abrir(memoria({ [CLAVE]: viejo }));
    const e = s.getState();
    expect(e.perfil.onboardingCompleto).toBe(true);
    expect(e.perfil.medios).toEqual(["galicia-visa-credito"]);
    expect(e.corpus.marca).toBeNull();
    expect(e.corpus.promociones).toHaveLength(promociones.length); // el de ejemplo, no el del guardado
    expect(e.compras.lista.map((c) => c.id)).toEqual(["c1"]);
  });

  it("un corpus guardado con promos a las que les faltan campos del motor queda vacío, no roto", async () => {
    const roto = JSON.stringify({
      version: 1,
      promociones: [{ id: "p1", tope: {}, vigencia: {} }],
      marca: "2026-11-02T12:00:00+00:00",
      sincronizadoEn: "2026-11-02T15:00:00.000Z",
    });
    const s = await abrir(memoria({ [CLAVE_CORPUS]: roto }));
    expect(s.getState().corpus).toEqual(CORPUS_VACIO);
  });

  it("un corpus guardado y válido se carga con su marca", async () => {
    const s = await abrir(memoria({ [CLAVE_CORPUS]: corpusGuardado("2026-11-02T12:00:00+00:00") }));
    expect(s.getState().corpus.marca).toBe("2026-11-02T12:00:00+00:00");
    expect(s.getState().corpus.sincronizadoEn).toBe("2026-11-02T15:00:00.000Z");
  });

  it.each([["JSON inválido", "{no es json"], ["otra versión", JSON.stringify({ version: 2 })], ["promociones que no son lista", JSON.stringify({ version: 1, promociones: "x", marca: null, sincronizadoEn: null })]])(
    "un corpus guardado inválido (%s) deja el corpus vacío con la marca en null, no el de ejemplo",
    async (_n, raw) => {
      const s = await abrir(memoria({ [CLAVE_CORPUS]: raw }));
      expect(s.getState().corpus).toEqual(CORPUS_VACIO);
    },
  );

  it("cerrar sesión borra el corpus guardado: al reabrir no vuelve el real junto a compras de ejemplo", async () => {
    const disco = memoria({ [CLAVE_CORPUS]: corpusGuardado("2026-11-02T12:00:00+00:00") });
    const a = await abrir(disco);
    expect(a.getState().corpus.marca).not.toBeNull();
    a.dispatch(sesionCerrada());
    await esperar();
    expect(disco.datos.has(CLAVE_CORPUS)).toBe(false);
    const b = await abrir(disco);
    expect(b.getState().corpus.marca).toBeNull();
  });
});
