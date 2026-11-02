import { describe, expect, it } from "vitest";
import { compraDePrueba } from "../data/compras/prueba";
import { repositorioDeMemoria, type Guion } from "../data/compras/repositorio.memoria";
import type { Subida } from "../data/compras/repositorio";
import { comprasOctubre, mediosDeclarados } from "../data/fixtures";
import { adoptarOperaciones, eliminarCompra, guardarCompra, iniciarCompras, reintentarOperacion, vaciarCola } from "./thunks";
import { compraAgregada } from "./compras";
import { guardadoEncolado } from "./cola";
import { mediosElegidos } from "./perfil";
import { rehidratar } from "./persistencia";
import { esperar, memoria, storeDePrueba } from "./prueba";

// Spec 010, historia 2: la cola contra un repositorio que falla, se cuelga o responde (SC-002).

const MEDIO = "a1000000-0000-4000-8000-0000000000aa";
const PROMO = "d1000000-0000-4000-8000-0000000000aa";

const borrador = {
  modo: "manual" as const,
  comercio: "Coto",
  fecha: "2026-10-14",
  monto: 24500,
  medioId: "galicia-visa-credito",
  textoExtraido: null,
  usarPromo: true,
};

type Contexto = { userId: string | null; medioRemoto: (id: string) => string | null; promoRemota: (id: string) => string | null };

async function escenario(opciones: { guion?: Guion; contexto?: Partial<Contexto>; plazoMs?: number; conSubida?: boolean } = {}) {
  const repo = repositorioDeMemoria(opciones.guion);
  const ctx: Contexto = {
    userId: "u-ana",
    medioRemoto: () => MEDIO,
    promoRemota: () => PROMO,
    ...opciones.contexto,
  };
  const subida: Subida | null =
    opciones.conSubida === false ? null : { repositorio: repo, contexto: () => ctx, plazoMs: opciones.plazoMs ?? 1000 };
  const disco = memoria();
  const s = storeDePrueba(null, disco, undefined, subida);
  await s.dispatch(rehidratar());
  s.dispatch(mediosElegidos(mediosDeclarados.map((m) => m.id)));
  await s.dispatch(iniciarCompras());
  /** Espera a que termine el vaciado que dispararon guardar y borrar. */
  const reposo = async () => {
    for (let i = 0; i < 50 && s.getState().cola.vaciando; i++) await esperar();
    await esperar();
  };
  return { s, repo, ctx, disco, reposo };
}

describe("guardar y borrar encolan (FR-004, SC-004)", () => {
  it("guardar una compra deja una operación con su dueño", async () => {
    const { s, reposo } = await escenario({ conSubida: false });
    const compra = s.dispatch(guardarCompra(borrador));
    await reposo();
    expect(s.getState().cola.operaciones).toMatchObject([{ tipo: "guardar", compra: { id: compra.id }, dueno: null }]);
  });

  it("una compra sin confirmar (que falla al guardar) no entra a la cola ni a compras", async () => {
    const { s } = await escenario({ conSubida: false });
    const antes = s.getState().compras.lista.length;
    expect(() => s.dispatch(guardarCompra({ ...borrador, medioId: null }))).toThrow();
    expect(s.getState().cola.operaciones).toEqual([]);
    expect(s.getState().compras.lista).toHaveLength(antes);
  });

  it("borrar una de ejemplo no genera operación", async () => {
    const { s } = await escenario({ conSubida: false });
    s.dispatch(eliminarCompra(comprasOctubre[0]!.id));
    expect(s.getState().cola.operaciones).toEqual([]);
  });

  it("guardar y borrar antes de enviar no deja nada ni llama al servidor (SC-003)", async () => {
    const { s, repo, reposo } = await escenario({ contexto: { userId: null } });
    const compra = s.dispatch(guardarCompra(borrador));
    s.dispatch(eliminarCompra(compra.id));
    await reposo();
    expect(s.getState().cola.operaciones).toEqual([]);
    expect(repo.llamadas).toEqual([]);
  });

  it("doble toque con el mismo intento deja una sola compra (FR-005)", async () => {
    const { s } = await escenario({ conSubida: false });
    const a = s.dispatch(guardarCompra(borrador, "hoja-1"));
    const b = s.dispatch(guardarCompra(borrador, "hoja-1"));
    expect(b.id).toBe(a.id);
    expect(s.getState().compras.lista.filter((c) => c.id === a.id)).toHaveLength(1);
    expect(s.getState().cola.operaciones).toHaveLength(1);
  });

  it("dos compras idénticas con intentos distintos son dos compras", async () => {
    const { s } = await escenario({ conSubida: false });
    const a = s.dispatch(guardarCompra(borrador, "hoja-1"));
    const b = s.dispatch(guardarCompra(borrador, "hoja-2"));
    expect(b.id).not.toBe(a.id);
    expect(s.getState().cola.operaciones).toHaveLength(2);
  });
});

describe("subida desconectada (FR-020)", () => {
  it("la cola solo acumula y no se muestran marcas", async () => {
    const { s, reposo } = await escenario({ conSubida: false });
    s.dispatch(guardarCompra(borrador));
    await reposo();
    await s.dispatch(vaciarCola());
    expect(s.getState().cola.operaciones).toHaveLength(1);
    expect(s.getState().cola.subidaConectada).toBe(false);
  });

  it("sin sesión no se envía nada, aunque haya repositorio", async () => {
    const { s, repo, reposo } = await escenario({ contexto: { userId: null } });
    s.dispatch(guardarCompra(borrador));
    await reposo();
    expect(repo.llamadas).toEqual([]);
    expect(s.getState().cola.operaciones).toHaveLength(1);
  });
});

describe("tabla de SC-002", () => {
  it("con red: se sube una vez y la cola queda vacía", async () => {
    const { s, repo, reposo } = await escenario();
    const compra = s.dispatch(guardarCompra(borrador));
    await reposo();
    expect([...repo.filas.keys()]).toEqual([compra.id]);
    expect(s.getState().cola.operaciones).toEqual([]);
    expect(s.getState().cola.subidaConectada).toBe(true);
  });

  it("sin red: queda pendiente y sube cuando vuelve", async () => {
    let hayRed = false;
    const { s, repo, reposo } = await escenario({ guion: () => (hayRed ? "ok" : "transitorio") });
    s.dispatch(guardarCompra(borrador));
    await reposo();
    expect(s.getState().cola.operaciones[0]?.estado).toEqual({ tipo: "pendiente" });
    expect(repo.filas.size).toBe(0);

    hayRed = true;
    await s.dispatch(vaciarCola());
    expect(repo.filas.size).toBe(1);
    expect(s.getState().cola.operaciones).toEqual([]);
  });

  it("un envío que llegó pero cuya respuesta se perdió no se duplica al reintentar", async () => {
    const { s, repo, reposo } = await escenario({ guion: (l) => (l.n === 1 ? "llega-sin-respuesta" : "ok") });
    s.dispatch(guardarCompra(borrador));
    await reposo();
    expect(repo.filas.size).toBe(1);
    expect(s.getState().cola.operaciones).toHaveLength(1);

    await s.dispatch(vaciarCola());
    expect(repo.filas.size).toBe(1);
    expect(repo.llamadas.filter((l) => l.tipo === "guardar")).toHaveLength(2);
    expect(s.getState().cola.operaciones).toEqual([]);
  });

  it("tres reintentos seguidos terminan en una sola fila", async () => {
    const { s, repo, reposo } = await escenario({ guion: (l) => (l.n <= 3 ? "llega-sin-respuesta" : "ok") });
    s.dispatch(guardarCompra(borrador));
    await reposo();
    await s.dispatch(vaciarCola());
    await s.dispatch(vaciarCola());
    await s.dispatch(vaciarCola());
    expect(repo.filas.size).toBe(1);
    expect(s.getState().cola.operaciones).toEqual([]);
  });

  it("un envío colgado se abandona al plazo y no bloquea la interfaz", async () => {
    const { s, reposo } = await escenario({ guion: () => "colgar", plazoMs: 20 });
    s.dispatch(guardarCompra(borrador));
    await reposo();
    expect(s.getState().cola.vaciando).toBe(false);
    expect(s.getState().cola.operaciones[0]?.estado).toEqual({ tipo: "pendiente" });
  });

  it("borrar mientras el guardado está colgado: el borrado queda detrás y la compra no reaparece", async () => {
    let cuelga = true;
    const { s, repo, reposo } = await escenario({ guion: (l) => (cuelga && l.tipo === "guardar" ? "colgar" : "ok"), plazoMs: 40 });
    const compra = s.dispatch(guardarCompra(borrador));
    for (let i = 0; i < 20 && s.getState().cola.operaciones[0]?.estado.tipo !== "enviando"; i++) await esperar();
    expect(s.getState().cola.operaciones[0]?.estado.tipo).toBe("enviando");

    s.dispatch(eliminarCompra(compra.id));
    expect(s.getState().cola.operaciones.map((o) => `${o.tipo}:${o.estado.tipo}`)).toEqual([
      "guardar:enviando",
      "borrar:pendiente",
    ]);

    cuelga = false;
    await reposo();
    await s.dispatch(vaciarCola());
    expect(repo.filas.size).toBe(0);
    expect(s.getState().cola.operaciones).toEqual([]);
  });

  it("un solo vaciado a la vez: pedidos simultáneos no duplican envíos (FR-010)", async () => {
    const { s, repo } = await escenario({ conSubida: true });
    s.dispatch(compraAgregada(compraDePrueba()));
    await Promise.all([s.dispatch(vaciarCola()), s.dispatch(vaciarCola()), s.dispatch(vaciarCola())]);
    expect(repo.llamadas).toEqual([]);

    s.dispatch(guardarCompra(borrador));
    await Promise.all([s.dispatch(vaciarCola()), s.dispatch(vaciarCola()), s.dispatch(vaciarCola())]);
    expect(repo.llamadas.filter((l) => l.tipo === "guardar")).toHaveLength(1);
  });

  it("subir una compra ya subida y borrarla manda el borrado; borrar algo inexistente es éxito", async () => {
    const { s, repo, reposo } = await escenario();
    const compra = s.dispatch(guardarCompra(borrador));
    await reposo();
    expect(repo.filas.size).toBe(1);

    s.dispatch(eliminarCompra(compra.id));
    await reposo();
    expect(repo.filas.size).toBe(0);
    expect(s.getState().cola.operaciones).toEqual([]);
  });
});

describe("dueño y bloqueos (FR-008, FR-009, FR-017)", () => {
  it("una operación de otro dueño no se envía con esta sesión", async () => {
    const { s, repo, reposo } = await escenario({ contexto: { userId: "u-ana" } });
    s.dispatch(
      guardadoEncolado({
        idOp: "de-beto",
        compra: compraDePrueba(),
        dueno: "u-beto",
        ahora: s.getState().sesion.ahora,
        intento: null,
      }),
    );
    await reposo();
    await s.dispatch(vaciarCola());
    expect(repo.llamadas).toEqual([]);
    expect(s.getState().cola.operaciones).toHaveLength(1);
  });

  it("adoptar las de la cuenta que inicia sesión las sube; declinar las deja solo en el teléfono", async () => {
    const adoptar = await escenario({ contexto: { userId: null } });
    adoptar.s.dispatch(guardarCompra(borrador));
    adoptar.ctx.userId = "u-ana";
    adoptar.s.dispatch(adoptarOperaciones("u-ana", true));
    await adoptar.reposo();
    await adoptar.s.dispatch(vaciarCola());
    expect(adoptar.repo.filas.size).toBe(1);

    const declinar = await escenario({ contexto: { userId: null } });
    declinar.s.dispatch(guardarCompra(borrador));
    declinar.ctx.userId = "u-ana";
    declinar.s.dispatch(adoptarOperaciones("u-ana", false));
    await declinar.reposo();
    await declinar.s.dispatch(vaciarCola());
    expect(declinar.repo.llamadas).toEqual([]);
    expect(declinar.s.getState().cola.operaciones[0]?.estado).toEqual({ tipo: "bloqueada", motivo: "decision" });
  });

  it("un medio sin correspondencia queda bloqueado y no traba a las demás (SC-008)", async () => {
    const { s, repo, reposo } = await escenario({
      contexto: { medioRemoto: (id) => (id === "mercado-pago" ? null : MEDIO) },
    });
    s.dispatch(guardarCompra({ ...borrador, medioId: "mercado-pago" }));
    s.dispatch(guardarCompra({ ...borrador, monto: 1000 }));
    await reposo();
    await s.dispatch(vaciarCola());
    expect(repo.filas.size).toBe(1);
    expect(s.getState().cola.operaciones).toMatchObject([{ estado: { tipo: "bloqueada", motivo: "medio" } }]);
  });

  it("una promo que no está en el corpus del servidor bloquea; cuando llega el mapeo, sube", async () => {
    const { s, repo, ctx, reposo } = await escenario({ contexto: { promoRemota: () => null } });
    s.dispatch(guardarCompra(borrador));
    await reposo();
    expect(s.getState().cola.operaciones[0]?.estado).toEqual({ tipo: "bloqueada", motivo: "promo" });
    expect(repo.llamadas).toEqual([]);

    ctx.promoRemota = () => PROMO;
    await s.dispatch(vaciarCola());
    expect(repo.filas.size).toBe(1);
  });

  it("una rechazada no se reintenta sola; «Reintentar» la vuelve a mandar", async () => {
    let rechazar = true;
    const { s, repo, reposo } = await escenario({ guion: () => (rechazar ? { rechazada: "23514" } : "ok") });
    s.dispatch(guardarCompra(borrador));
    await reposo();
    const op = s.getState().cola.operaciones[0]!;
    expect(op.estado).toEqual({ tipo: "rechazada", causa: "23514" });

    await s.dispatch(vaciarCola());
    expect(repo.llamadas).toHaveLength(1);

    rechazar = false;
    await s.dispatch(reintentarOperacion(op.id));
    expect(repo.filas.size).toBe(1);
    expect(s.getState().cola.operaciones).toEqual([]);
  });

  it("«Quitar compra» en una rechazada la saca de compras y de la cola sin llamar al servidor", async () => {
    const { s, repo, reposo } = await escenario({ guion: () => ({ rechazada: "23514" }) });
    const compra = s.dispatch(guardarCompra(borrador));
    await reposo();
    const llamadas = repo.llamadas.length;

    s.dispatch(eliminarCompra(compra.id));
    await reposo();
    expect(s.getState().cola.operaciones).toEqual([]);
    expect(s.getState().compras.lista.some((c) => c.id === compra.id)).toBe(false);
    expect(repo.llamadas).toHaveLength(llamadas);
  });
});
