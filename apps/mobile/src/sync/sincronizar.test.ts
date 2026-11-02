import { estimarTopes, fechaArgentina } from "@vuelto/motor";
import { afterEach, describe, expect, it, vi } from "vitest";
import { comprasOctubre, promociones as promosDeEjemplo } from "../data/fixtures";
import { RELOJ_EJEMPLO } from "../data/fixtures";
import { guardadoEncolado } from "../store/cola";
import { compraAgregada } from "../store/compras";
import { sesionCerrada } from "../store/acciones";
import { mediosElegidos } from "../store/perfil";
import { storeDePrueba } from "../store/prueba";
import { selectRecomendacion } from "../store/selectores";
import { comercioElegido, montoCambiado } from "../store/simulacion";
import { filaACompra } from "./mapeo";
import { fila, filaCompra, ID } from "./prueba";
import { repositorioEnMemoria, type RepositorioMemoria } from "./repositorio-memoria";
import { ESPERA_MS, MARGEN_MS, sincronizar, TIMEOUT_MS } from "./sincronizar";

/** "Ahora" real de los tests: lunes 2 de noviembre de 2026, 12:00 en Argentina. */
const AHORA = new Date("2026-11-02T12:00:00-03:00");

function armar(repo: RepositorioMemoria | null, relojInicial = AHORA) {
  let t = relojInicial.getTime();
  const reloj = () => new Date(t);
  const store = storeDePrueba(null, undefined, { repositorio: repo, reloj });
  return { store, avanzar: (ms: number) => (t += ms), reloj };
}

const ids = (s: ReturnType<typeof armar>["store"]) => s.getState().corpus.promociones.map((p) => p.id).sort();

afterEach(() => {
  vi.useRealTimers();
});

describe("sincronizar: primera vez y reloj (US1, FR-004, FR-016)", () => {
  it("reemplaza el corpus de ejemplo, fija la marca, trae las compras y pasa al reloj real en la misma acción", async () => {
    const repo = repositorioEnMemoria({
      promociones: [fila(1), fila(2), fila(3)],
      compras: [filaCompra(1), filaCompra(2)],
    });
    const { store } = armar(repo);
    expect(store.getState().sesion.ahora).toBe(new Date(RELOJ_EJEMPLO).toISOString());

    await store.dispatch(sincronizar("apertura"));

    const s = store.getState();
    expect(ids(store)).toEqual([ID(1), ID(2), ID(3)]);
    expect(s.corpus.marca).toBe(fila(3).actualizada_en);
    expect(s.corpus.sincronizadoEn).toBe(AHORA.toISOString());
    expect(s.sesion.ahora).toBe(AHORA.toISOString());
    expect(s.compras.lista.map((c) => c.id)).toEqual([ID(1002), ID(1001)]);
  });

  it("pide las compras desde el inicio del PERÍODO con el reloj real, no el de ejemplo", async () => {
    const repo = repositorioEnMemoria({ promociones: [fila(1)] });
    const { store } = armar(repo);
    await store.dispatch(sincronizar("apertura"));
    const pedido = repo.pedidos.find((p) => p.tipo === "compras")!.filtro as { desde: string };
    // 2/11/2026 es lunes: el mes empieza el 1/11 y la semana el 2/11 ⇒ el 1/11.
    expect(pedido.desde).toBe("2026-11-01");
    expect(fechaArgentina(AHORA)).toBe("2026-11-02");
  });

  it("la primera sincronización sin promos no cambia nada: ni corpus, ni compras, ni reloj (FR-013)", async () => {
    const repo = repositorioEnMemoria({ promociones: [], compras: [filaCompra(1)] });
    const { store } = armar(repo);
    const antes = store.getState();
    await store.dispatch(sincronizar("apertura"));
    const despues = store.getState();
    expect(despues.corpus).toBe(antes.corpus);
    expect(despues.compras).toBe(antes.compras);
    expect(despues.sesion.ahora).toBe(antes.sesion.ahora);
    expect(despues.corpus.marca).toBeNull();
  });
});

describe("sincronizar: incremental, margen y paginación (US1)", () => {
  it("la segunda sincronización pide solo lo posterior a la marca menos el margen, sin filtrar por vigencia", async () => {
    const repo = repositorioEnMemoria({ promociones: [fila(1), fila(2)] });
    const { store, avanzar } = armar(repo);
    await store.dispatch(sincronizar("apertura"));
    avanzar(ESPERA_MS);
    repo.pedidos.length = 0;

    await store.dispatch(sincronizar("primer-plano"));

    const pedido = repo.pedidos.find((p) => p.tipo === "promociones")!.filtro as {
      desde: string | null;
      vigenteDesde: string | null;
    };
    expect(pedido.vigenteDesde).toBeNull();
    expect(Date.parse(pedido.desde!)).toBe(Date.parse(fila(2).actualizada_en) - MARGEN_MS);
  });

  it("una fila confirmada tarde (anterior a la marca) llega por el margen de relectura", async () => {
    const repo = repositorioEnMemoria({ promociones: [fila(1, { actualizada_en: "2026-11-02T14:55:00+00:00" })] });
    const { store, avanzar } = armar(repo);
    await store.dispatch(sincronizar("apertura"));
    expect(store.getState().corpus.marca).toBe("2026-11-02T14:55:00+00:00");

    // Una transacción larga confirma ahora una fila escrita 3 minutos ANTES de la marca.
    repo.promocionesFilas.push(fila(2, { actualizada_en: "2026-11-02T14:52:00+00:00" }));
    avanzar(ESPERA_MS);
    await store.dispatch(sincronizar("primer-plano"));

    expect(ids(store)).toEqual([ID(1), ID(2)]);
    expect(store.getState().corpus.marca).toBe("2026-11-02T14:55:00+00:00");
  });

  it("más de una página: se leen todas y el store cambia una sola vez", async () => {
    const muchas = Array.from({ length: 1100 }, (_, i) => fila(i + 1));
    const repo = repositorioEnMemoria({ promociones: muchas });
    const { store } = armar(repo);
    let cambios = 0;
    store.subscribe(() => cambios++);

    await store.dispatch(sincronizar("apertura"));

    expect(store.getState().corpus.promociones).toHaveLength(1100);
    expect(cambios).toBe(1);
    expect(repo.pedidos.filter((p) => p.tipo === "promociones")).toHaveLength(3);
  });

  it("después de una re-siembra (ids nuevos) el teléfono no queda con duplicados (FR-009)", async () => {
    const repo = repositorioEnMemoria({ promociones: [fila(1), fila(2)] });
    const { store, avanzar } = armar(repo);
    await store.dispatch(sincronizar("apertura"));

    repo.promocionesFilas = [
      fila(11, { titulo: "promo 1", actualizada_en: "2026-11-02T16:00:00+00:00" }),
      fila(12, { titulo: "promo 2", actualizada_en: "2026-11-02T16:00:01+00:00" }),
    ];
    avanzar(ESPERA_MS);
    await store.dispatch(sincronizar("primer-plano"));

    expect(ids(store)).toEqual([ID(11), ID(12)]);
  });

  it("una promo vencida antes del período sale del store en la sincronización (FR-011)", async () => {
    const repo = repositorioEnMemoria({ promociones: [fila(1), fila(2)] });
    const { store, avanzar } = armar(repo);
    await store.dispatch(sincronizar("apertura"));

    repo.promocionesFilas[0] = fila(1, { vigencia_hasta: "2026-10-20", actualizada_en: "2026-11-02T16:00:00+00:00" });
    avanzar(ESPERA_MS);
    await store.dispatch(sincronizar("primer-plano"));

    expect(ids(store)).toEqual([ID(2)]);
  });
});

describe("sincronizar: disparo, espera y exclusión (FR-001 a FR-003)", () => {
  it("un disparo durante otro se ignora", async () => {
    const repo = repositorioEnMemoria({ promociones: [fila(1)] });
    const { store } = armar(repo);
    await Promise.all([store.dispatch(sincronizar("apertura")), store.dispatch(sincronizar("apertura"))]);
    expect(repo.pedidos.filter((p) => p.tipo === "compras")).toHaveLength(1);
  });

  it("al volver a primer plano no sincroniza antes de 5 minutos; la apertura sí", async () => {
    const repo = repositorioEnMemoria({ promociones: [fila(1)] });
    const { store, avanzar } = armar(repo);
    await store.dispatch(sincronizar("apertura"));
    const intentos = () => repo.pedidos.filter((p) => p.tipo === "compras").length;
    expect(intentos()).toBe(1);

    avanzar(ESPERA_MS - 1);
    await store.dispatch(sincronizar("primer-plano"));
    expect(intentos()).toBe(1);

    await store.dispatch(sincronizar("apertura"));
    expect(intentos()).toBe(2);

    avanzar(ESPERA_MS);
    await store.dispatch(sincronizar("primer-plano"));
    expect(intentos()).toBe(3);
  });

  it("sin repositorio no hace nada", async () => {
    const { store } = armar(null);
    const antes = store.getState();
    await store.dispatch(sincronizar("apertura"));
    expect(store.getState()).toBe(antes);
  });

  it("sin sesión no hace nada ni pide más", async () => {
    const repo = repositorioEnMemoria({ promociones: [fila(1)], usuario: null });
    const { store } = armar(repo);
    const antes = store.getState();
    await store.dispatch(sincronizar("apertura"));
    expect(store.getState()).toBe(antes);
    expect(repo.pedidos.map((p) => p.tipo)).toEqual(["usuario"]);
  });
});

describe("sincronizar: atomicidad y fallas (FR-005, SC-005)", () => {
  it.each([
    ["la primera página de compras", 1],
    ["la primera página de promos", 2],
    ["el pedido de ids", 3],
  ])("si falla %s, el store queda idéntico", async (_n, pedido) => {
    const repo = repositorioEnMemoria({ promociones: [fila(1)], compras: [filaCompra(1)] });
    repo.falloEnPedido = pedido;
    const { store } = armar(repo);
    const antes = store.getState();
    await expect(store.dispatch(sincronizar("apertura"))).resolves.toBeUndefined();
    expect(store.getState()).toBe(antes);
  });

  it("una falla a mitad de las páginas de promos deja corpus, compras, marca y reloj como estaban", async () => {
    const muchas = Array.from({ length: 700 }, (_, i) => fila(i + 1));
    const repo = repositorioEnMemoria({ promociones: muchas, compras: [filaCompra(1)] });
    repo.falloEnPedido = 3; // compras = 1.º, promos pág. 1 = 2.º, promos pág. 2 = 3.º
    const { store } = armar(repo);
    const antes = store.getState();
    await store.dispatch(sincronizar("apertura"));
    expect(store.getState()).toBe(antes);
  });

  it("después de una falla se puede volver a intentar", async () => {
    const repo = repositorioEnMemoria({ promociones: [fila(1)] });
    repo.falloEnPedido = 1;
    const { store, avanzar } = armar(repo);
    await store.dispatch(sincronizar("apertura"));
    expect(store.getState().corpus.marca).toBeNull();
    repo.falloEnPedido = null;
    avanzar(ESPERA_MS);
    await store.dispatch(sincronizar("primer-plano"));
    expect(store.getState().corpus.marca).not.toBeNull();
  });

  it("un pedido que no responde se aborta a los 15 s y cuenta como falla", async () => {
    vi.useFakeTimers();
    const repo = repositorioEnMemoria({ promociones: [fila(1)] });
    repo.colgado = true;
    const { store } = armar(repo);
    const antes = store.getState();
    const p = store.dispatch(sincronizar("apertura"));
    await vi.advanceTimersByTimeAsync(TIMEOUT_MS + 1);
    await p;
    expect(store.getState()).toBe(antes);
    // Y no deja la puerta cerrada: la próxima apertura puede intentar de nuevo.
    repo.colgado = false;
    await store.dispatch(sincronizar("apertura"));
    expect(store.getState().corpus.marca).not.toBeNull();
  });
});

describe("sincronizar: compras locales y cuentas (US5)", () => {
  const compraLocal = { ...comprasOctubre[0]!, id: "n11", fecha: "2026-11-02" };
  /** Como `guardarCompra`: la operación entra a la cola de #44 y la compra a la lista. */
  const guardarLocal = (store: ReturnType<typeof armar>["store"], compra: typeof compraLocal) => {
    store.dispatch(
      guardadoEncolado({ idOp: `op-${compra.id}`, compra, dueno: null, ahora: AHORA.toISOString(), intento: null }),
    );
    store.dispatch(compraAgregada(compra));
  };

  it("una compra local que el servidor no devolvió sobrevive a la sincronización", async () => {
    const repo = repositorioEnMemoria({ promociones: [fila(1)], compras: [filaCompra(1)] });
    const { store } = armar(repo);
    guardarLocal(store, compraLocal);
    await store.dispatch(sincronizar("apertura"));
    expect(store.getState().compras.lista.map((c) => c.id)).toEqual(expect.arrayContaining(["n11", ID(1001)]));
  });

  it("una compra guardada mientras hay una sincronización en vuelo no se pierde", async () => {
    const repo = repositorioEnMemoria({ promociones: [fila(1)], compras: [filaCompra(1)] });
    const { store } = armar(repo);
    repo.alPedirPromociones = () => {
      guardarLocal(store, compraLocal);
    };
    await store.dispatch(sincronizar("apertura"));
    expect(store.getState().compras.lista.map((c) => c.id)).toContain("n11");
  });

  it("si el servidor ya devuelve la compra con el mismo id, queda una sola", async () => {
    const repo = repositorioEnMemoria({ promociones: [fila(1)], compras: [filaCompra(1)] });
    const { store } = armar(repo);
    guardarLocal(store, { ...compraLocal, id: ID(1001) });
    await store.dispatch(sincronizar("apertura"));
    expect(store.getState().compras.lista.filter((c) => c.id === ID(1001))).toHaveLength(1);
  });

  it("las compras de ejemplo no sobreviven a la primera sincronización", async () => {
    const repo = repositorioEnMemoria({ promociones: [fila(1)], compras: [] });
    const { store } = armar(repo);
    await store.dispatch(sincronizar("apertura"));
    expect(store.getState().compras.lista).toEqual([]);
  });

  it("si se cierra la sesión mientras hay una sincronización en vuelo, el resultado se descarta", async () => {
    const repo = repositorioEnMemoria({ promociones: [fila(1)], compras: [filaCompra(1)] });
    const { store } = armar(repo);
    repo.alPedirPromociones = () => {
      store.dispatch(sesionCerrada());
    };
    await store.dispatch(sincronizar("apertura"));
    expect(store.getState().corpus.marca).toBeNull();
    expect(store.getState().compras.lista).toEqual(comprasOctubre);
  });

  it("si el usuario cambió mientras volaba el pedido, el resultado se descarta", async () => {
    const repo = repositorioEnMemoria({ promociones: [fila(1)], compras: [filaCompra(1)] });
    const { store } = armar(repo);
    repo.alPedirPromociones = () => {
      repo.usuario = "usuario-2";
    };
    await store.dispatch(sincronizar("apertura"));
    expect(store.getState().corpus.marca).toBeNull();
  });

  it("cerrar sesión después de sincronizar vuelve TODO al modo de ejemplo: corpus, compras y reloj", async () => {
    const repo = repositorioEnMemoria({ promociones: [fila(1)], compras: [filaCompra(1)] });
    const { store } = armar(repo);
    await store.dispatch(sincronizar("apertura"));
    expect(store.getState().corpus.marca).not.toBeNull();

    store.dispatch(sesionCerrada());

    const s = store.getState();
    expect(s.corpus.marca).toBeNull();
    expect(s.corpus.sincronizadoEn).toBeNull();
    expect(s.corpus.promociones).toEqual(promosDeEjemplo);
    expect(s.compras.lista).toEqual(comprasOctubre);
    expect(s.sesion.ahora).toBe(new Date(RELOJ_EJEMPLO).toISOString());
  });
});

describe("sincronizar con el motor real (US4, SC-002)", () => {
  /** Una promo de supermercado de Galicia con tope mensual compartido. `banco_id` usa el slug de los datos de ejemplo. */
  const compartida = (n: number, resto = {}) =>
    fila(n, {
      banco_id: "galicia",
      categoria_id: 1,
      credito_redes: ["visa"],
      tope_monto: 10000,
      tope_periodo: "mensual",
      tope_alcance: "compartido",
      grupo_tope_id: "galicia-super",
      canal: "ambos",
      ...resto,
    });
  const compraDe = (n: number, promo: number, descuento: number) =>
    filaCompra(n, { promocion_id: ID(promo), descuento_obtenido: descuento, monto: 30000, fecha: "2026-11-02" });

  function restante(store: ReturnType<typeof armar>["store"]) {
    const s = store.getState();
    const e = estimarTopes(s.corpus.promociones, s.compras.lista, null, new Date(s.sesion.ahora));
    return e.find((x) => x.grupoTopeId === "galicia-super")?.restante;
  }

  it("una promo dada de baja con compras del período NO sube el restante del tope compartido y no se recomienda", async () => {
    const repo = repositorioEnMemoria({
      promociones: [compartida(1), compartida(2)],
      compras: [compraDe(1, 1, 6000)],
    });
    const { store, avanzar } = armar(repo);
    store.dispatch(mediosElegidos(["galicia-visa-credito"]));
    await store.dispatch(sincronizar("apertura"));
    expect(restante(store)).toBe(4000);

    // Se da de baja P1 (la que tiene las compras). P2 sigue vigente.
    repo.promocionesFilas[0] = compartida(1, {
      dada_de_baja_en: "2026-11-02T15:00:00+00:00",
      actualizada_en: "2026-11-02T16:00:00+00:00",
    });
    avanzar(ESPERA_MS);
    await store.dispatch(sincronizar("primer-plano"));

    const p1 = store.getState().corpus.promociones.find((p) => p.id === ID(1))!;
    expect(p1.vigencia.hasta).toBe("2026-11-01"); // sigue en el corpus, vencida
    expect(restante(store)).toBe(4000); // el consumo de P1 sigue contando
  });

  it("una promo vencida (o dada de baja) no se recomienda, aunque siga en el corpus", async () => {
    const repo = repositorioEnMemoria({ promociones: [compartida(1)], compras: [] });
    const { store, avanzar } = armar(repo);
    store.dispatch(mediosElegidos(["galicia-visa-credito"]));
    store.dispatch(comercioElegido("coto"));
    store.dispatch(montoCambiado(10000));
    await store.dispatch(sincronizar("apertura"));
    expect(selectRecomendacion(store.getState())?.resultado).toBe("recomendado");

    repo.promocionesFilas[0] = compartida(1, {
      dada_de_baja_en: "2026-11-02T15:00:00+00:00",
      actualizada_en: "2026-11-02T16:00:00+00:00",
    });
    avanzar(ESPERA_MS);
    await store.dispatch(sincronizar("primer-plano"));
    expect(selectRecomendacion(store.getState())?.resultado).toBe("sin-promo");
  });

  it("a una promo del corpus se le acorta la vigencia a ayer: deja de recomendarse", async () => {
    const repo = repositorioEnMemoria({ promociones: [compartida(1)] });
    const { store, avanzar } = armar(repo);
    store.dispatch(mediosElegidos(["galicia-visa-credito"]));
    store.dispatch(comercioElegido("coto"));
    store.dispatch(montoCambiado(10000));
    await store.dispatch(sincronizar("apertura"));
    expect(selectRecomendacion(store.getState())?.resultado).toBe("recomendado");

    repo.promocionesFilas[0] = compartida(1, { vigencia_hasta: "2026-11-01", actualizada_en: "2026-11-02T16:00:00+00:00" });
    avanzar(ESPERA_MS);
    await store.dispatch(sincronizar("primer-plano"));
    expect(selectRecomendacion(store.getState())?.resultado).toBe("sin-promo");
  });

  it("una actualización inválida saca la versión anterior y cuenta la descartada", async () => {
    const repo = repositorioEnMemoria({ promociones: [compartida(1), compartida(2)] });
    const { store, avanzar } = armar(repo);
    await store.dispatch(sincronizar("apertura"));
    repo.promocionesFilas[1] = compartida(2, { canal: "telepatia", actualizada_en: "2026-11-02T16:00:00+00:00" });
    avanzar(ESPERA_MS);
    await store.dispatch(sincronizar("primer-plano"));
    expect(ids(store)).toEqual([ID(1)]);
    expect(store.getState().corpus.descartadas).toBe(1);
  });

  it("las promos de ejemplo no se mezclan con las del servidor", async () => {
    const repo = repositorioEnMemoria({ promociones: [fila(1)] });
    const { store } = armar(repo);
    expect(promosDeEjemplo.length).toBeGreaterThan(0);
    await store.dispatch(sincronizar("apertura"));
    for (const p of promosDeEjemplo) {
      expect(store.getState().corpus.promociones.some((x) => x.id === p.id)).toBe(false);
    }
  });
});

describe("la ventana de compras es [inicio del período, hoy] (FR-014)", () => {
  it("una compra con fecha futura no entra", async () => {
    const repo = repositorioEnMemoria({
      promociones: [fila(1)],
      compras: [filaCompra(1, { fecha: "2026-11-02" }), filaCompra(2, { fecha: "2026-11-03" })],
    });
    const { store } = armar(repo);
    await store.dispatch(sincronizar("apertura"));
    expect(store.getState().compras.lista.map((c) => c.id)).toEqual([ID(1001)]);
  });
});

describe("filaACompra en la sincronización", () => {
  it("una compra con una fila inválida se omite sin romper la sincronización", async () => {
    const repo = repositorioEnMemoria({
      promociones: [fila(1)],
      compras: [filaCompra(1), filaCompra(2, { origen: "magia" })],
    });
    const { store } = armar(repo);
    await store.dispatch(sincronizar("apertura"));
    expect(store.getState().compras.lista.map((c) => c.id)).toEqual([ID(1001)]);
    expect(filaACompra(filaCompra(2, { origen: "magia" }))).toBeNull();
  });
});
