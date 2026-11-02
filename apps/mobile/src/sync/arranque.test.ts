import { describe, expect, it } from "vitest";
import { mediosDeEjemplo } from "../data/fixtures";
import { RELOJ_EJEMPLO } from "../data/fixtures";
import { CLAVE, CLAVE_CORPUS, rehidratar } from "../store/persistencia";
import { mediosConfirmados } from "../store/perfil";
import { esperar, memoria, storeDePrueba } from "../store/prueba";
import { selectFrescura, selectRecomendacion } from "../store/selectores";
import { comercioElegido, montoCambiado } from "../store/simulacion";
import { fila, filaCompra } from "./prueba";
import { repositorioEnMemoria } from "./repositorio-memoria";
import { sincronizar } from "./sincronizar";

const AHORA = new Date("2026-11-02T12:00:00-03:00");
const reloj = () => AHORA;

/** Una promo de supermercado de Galicia (con el slug de los datos de ejemplo en `banco_id`). */
const promo = (n: number) =>
  fila(n, { banco_id: "galicia", categoria_id: 1, credito_redes: ["visa"], canal: "ambos" });

async function abrir(disco = memoria(), repositorio = repositorioEnMemoria({ promociones: [promo(1)] })) {
  const s = storeDePrueba(null, disco, { repositorio, reloj });
  await s.dispatch(rehidratar());
  return { s, repositorio };
}

describe("arranque con lo sincronizado guardado (US2)", () => {
  it("reabrir SIN red da la misma recomendación, con el reloj real y sin error (SC-001)", async () => {
    const disco = memoria();
    const { s: a } = await abrir(disco);
    a.dispatch(mediosConfirmados(mediosDeEjemplo(["galicia-visa-credito"])));
    await a.dispatch(sincronizar("apertura"));
    a.dispatch(comercioElegido("coto"));
    a.dispatch(montoCambiado(10000));
    const conSenal = selectRecomendacion(a.getState());
    expect(conSenal?.resultado).toBe("recomendado");
    await esperar();
    expect(disco.datos.has(CLAVE_CORPUS)).toBe(true);

    // Se cierra la app, se activa el modo avión y se vuelve a abrir.
    const sinRed = repositorioEnMemoria({ promociones: [promo(1)] });
    sinRed.falloEnPedido = 1;
    const { s: b } = await abrir(disco, sinRed);
    await b.dispatch(sincronizar("apertura"));

    expect(b.getState().sesion.ahora).toBe(AHORA.toISOString());
    b.dispatch(comercioElegido("coto"));
    b.dispatch(montoCambiado(10000));
    const sinSenal = selectRecomendacion(b.getState());
    expect(sinSenal?.resultado).toBe("recomendado");
    expect(sinSenal?.medio?.id).toBe(conSenal?.medio?.id);
    expect(sinSenal?.reintegro).toBe(conSenal?.reintegro);
    expect(selectFrescura(b.getState())).toBe("Promos actualizadas hace unos minutos");
  });

  it("el reloj pasa al real en el mismo rehidratado, sin un estado intermedio con el de ejemplo", async () => {
    const disco = memoria();
    const { s: a } = await abrir(disco);
    await a.dispatch(sincronizar("apertura"));
    await esperar();

    const b = storeDePrueba(null, disco, { repositorio: null, reloj });
    expect(b.getState().sesion.ahora).toBe(new Date(RELOJ_EJEMPLO).toISOString());
    const vistos: string[] = [];
    b.subscribe(() => vistos.push(b.getState().sesion.ahora));
    await b.dispatch(rehidratar());
    // La única notificación ya trae el reloj real: ningún render intermedio con el de ejemplo.
    expect(vistos).toEqual([AHORA.toISOString()]);
  });

  it("si nunca sincronizó, sigue con los datos y el reloj de ejemplo (US2-3)", async () => {
    const { s } = await abrir(memoria(), repositorioEnMemoria({ promociones: [] }));
    await s.dispatch(sincronizar("apertura"));
    expect(s.getState().corpus.marca).toBeNull();
    expect(s.getState().sesion.ahora).toBe(new Date(RELOJ_EJEMPLO).toISOString());
    expect(selectFrescura(s.getState())).toBeNull();
  });

  it("sin repositorio (variables de Supabase faltantes) abre sin error", async () => {
    const s = storeDePrueba(null, memoria(), { repositorio: null, reloj });
    await s.dispatch(rehidratar());
    await expect(s.dispatch(sincronizar("apertura"))).resolves.toBeUndefined();
    expect(s.getState().sesion.hidratado).toBe(true);
  });

  it("tipear el monto no hace ningún pedido al repositorio (SC-004)", async () => {
    const { s, repositorio } = await abrir();
    await s.dispatch(sincronizar("apertura"));
    const pedidos = repositorio.pedidos.length;
    s.dispatch(comercioElegido("coto"));
    for (const m of [1, 12, 125, 1250, 12500]) s.dispatch(montoCambiado(m));
    expect(repositorio.pedidos).toHaveLength(pedidos);
  });

  it("lo guardado del corpus no se mezcla con el store: perfil y compras siguen en su clave", async () => {
    const disco = memoria();
    const { s: a } = await abrir(disco, repositorioEnMemoria({ promociones: [promo(1)], compras: [filaCompra(1)] }));
    await a.dispatch(sincronizar("apertura"));
    await esperar();
    expect(JSON.parse(disco.datos.get(CLAVE) ?? "{}")).not.toHaveProperty("corpus");
    const corpus = JSON.parse(disco.datos.get(CLAVE_CORPUS) ?? "{}");
    expect(corpus.marca).toBe(promo(1).actualizada_en);
    expect(corpus.sincronizadoEn).toBe(AHORA.toISOString());
    expect(Object.keys(corpus).sort()).toEqual(["marca", "promociones", "sincronizadoEn", "version"]);
  });
});
