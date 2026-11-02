import { describe, expect, it } from "vitest";
import { compraDePrueba } from "../data/compras/prueba";
import { CLAVE_COLA, colaCargada, guardadoEncolado, leerCola, operacionEnviando } from "./cola";
import { sesionCerrada } from "./acciones";
import { compraAgregada } from "./compras";
import { CLAVE, rehidratar } from "./persistencia";
import { esperar, memoria, storeDePrueba } from "./prueba";
import { eliminarCompra, guardarCompra, iniciarCompras } from "./thunks";

// Spec 010, FR-004, FR-013, FR-015, FR-016: la cola es un slice aparte con su propio almacenamiento.

const encolar = (n = 1) =>
  guardadoEncolado({
    idOp: `g${n}`,
    compra: compraDePrueba({ id: `a2000000-0000-4000-8000-${n.toString().padStart(12, "0")}` }),
    dueno: null,
    ahora: "2026-10-14T15:00:00.000Z",
    intento: null,
  });

async function abrir(disco = memoria()) {
  const s = storeDePrueba(null, disco);
  await s.dispatch(rehidratar());
  await s.dispatch(iniciarCompras());
  return s;
}

const borrador = {
  modo: "manual" as const,
  comercio: "Coto",
  fecha: "2026-10-14",
  monto: 24500,
  medioId: "galicia-visa-credito",
  textoExtraido: null,
  usarPromo: true,
};

describe("slice cola", () => {
  it("encola y la cola es independiente de compras", () => {
    const s = storeDePrueba();
    const antes = s.getState().compras;
    s.dispatch(encolar());
    expect(s.getState().cola.operaciones).toHaveLength(1);
    expect(s.getState().compras).toBe(antes);
  });

  it("cerrar sesión la vacía (FR-016)", () => {
    const s = storeDePrueba();
    s.dispatch(encolar());
    s.dispatch(sesionCerrada());
    expect(s.getState().cola.operaciones).toEqual([]);
  });

  it("leer lo guardado se mezcla por id con lo que ya se encoló", () => {
    const s = storeDePrueba();
    s.dispatch(encolar(2));
    const guardada = storeDePrueba();
    guardada.dispatch(encolar(1));
    s.dispatch(colaCargada(guardada.getState().cola.operaciones));
    expect(s.getState().cola.hidratada).toBe(true);
    expect(s.getState().cola.operaciones.map((o) => o.id)).toEqual(["g1", "g2"]);
  });
});

describe("persistencia de la cola (vuelto.cola.v1)", () => {
  it("no escribe antes de leer lo guardado: no pisa", async () => {
    const disco = memoria({ [CLAVE_COLA]: JSON.stringify({ version: 1, operaciones: [] }) });
    const s = storeDePrueba(null, disco);
    s.dispatch(encolar());
    await esperar();
    expect(JSON.parse(disco.datos.get(CLAVE_COLA) ?? "").operaciones).toEqual([]);
  });

  it("una vez leída, escribe cada cambio y sobrevive a cerrar y abrir", async () => {
    const disco = memoria();
    const a = await abrir(disco);
    a.dispatch(encolar());
    await esperar();
    const b = await abrir(disco);
    expect(b.getState().cola.operaciones.map((o) => o.id)).toEqual(["g1"]);
  });

  it("una cola inválida se descarta entera", () => {
    expect(leerCola("{")).toBeNull();
    expect(leerCola(JSON.stringify({ version: 2, operaciones: [] }))).toBeNull();
    expect(leerCola(JSON.stringify({ version: 1, operaciones: [{ id: 1 }] }))).toBeNull();
  });

  it("un envío interrumpido por un cierre se lee como pendiente", async () => {
    const disco = memoria();
    const a = await abrir(disco);
    a.dispatch(encolar());
    a.dispatch(operacionEnviando("g1"));
    await esperar();
    const b = await abrir(disco);
    expect(b.getState().cola.operaciones[0]?.estado).toEqual({ tipo: "pendiente" });
  });

  it("guarda la compra completa pero nada de lo derivado", async () => {
    const disco = memoria();
    const a = await abrir(disco);
    a.dispatch(guardarCompra(borrador));
    await esperar();
    const guardado = disco.datos.get(CLAVE_COLA) ?? "";
    expect(guardado).toContain("Coto");
    expect(guardado).not.toMatch(/imagen|image|base64|topeDisponible|recomendacion/i);
  });
});

describe("cierre entre las dos escrituras (FR-013, SC-002)", () => {
  /**
   * Un disco que deja de escribir tras N escrituras, como si la app se cerrara en ese punto:
   * lo que sigue después ya no llega (el almacenamiento atiende en orden).
   */
  function discoQueSeCorta() {
    const disco = memoria();
    const orden: string[] = [];
    const real = disco.setItem;
    let quedan = Infinity;
    disco.setItem = async (k, v) => {
      if (quedan <= 0) return;
      quedan -= 1;
      orden.push(k);
      await real(k, v);
    };
    return { disco, orden, cortarTras: (n: number) => (quedan = n) };
  }

  it("la cola se escribe antes que compras", async () => {
    const { disco, orden } = discoQueSeCorta();
    const s = await abrir(disco);
    await esperar();
    orden.length = 0;
    s.dispatch(guardarCompra(borrador));
    await esperar();
    expect(orden.indexOf(CLAVE_COLA)).toBeGreaterThanOrEqual(0);
    expect(orden.indexOf(CLAVE_COLA)).toBeLessThan(orden.indexOf(CLAVE));
  });

  it("si se corta antes de escribir compras, al abrir la compra se restaura desde su operación", async () => {
    const { disco, cortarTras } = discoQueSeCorta();
    const a = await abrir(disco);
    await esperar();
    cortarTras(1); // llega la cola; no llega compras
    const compra = a.dispatch(guardarCompra(borrador));
    await esperar();

    const b = await abrir(disco);
    expect(b.getState().compras.lista.some((c) => c.id === compra.id)).toBe(true);
    expect(b.getState().cola.operaciones).toHaveLength(1);
  });

  it("si se corta antes de escribir compras tras un borrado, al abrir la compra sigue borrada", async () => {
    const { disco, cortarTras } = discoQueSeCorta();
    const a = await abrir(disco);
    const compra = a.dispatch(guardarCompra(borrador));
    await esperar();
    cortarTras(1); // llega el borrado en la cola; no llegan compras ni la anulación
    a.dispatch(eliminarCompra(compra.id));
    await esperar();

    const b = await abrir(disco);
    expect(b.getState().compras.lista.some((c) => c.id === compra.id)).toBe(false);
  });

  it("una compra con id nN anterior a la feature se migra una sola vez", async () => {
    const disco = memoria();
    const a = storeDePrueba(null, disco);
    await a.dispatch(rehidratar());
    a.dispatch(compraAgregada(compraDePrueba({ id: "n11" })));
    await a.dispatch(iniciarCompras());
    const ids = a.getState().compras.lista.map((c) => c.id);
    expect(ids).not.toContain("n11");
    expect(a.getState().cola.operaciones).toHaveLength(1);

    await a.dispatch(iniciarCompras());
    expect(a.getState().cola.operaciones).toHaveLength(1);
    expect(a.getState().compras.lista.map((c) => c.id)).toEqual(ids);
  });
});
