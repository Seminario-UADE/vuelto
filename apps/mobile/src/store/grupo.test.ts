import { describe, expect, it } from "vitest";
import type { PedidoGrupo } from "../data/contracts";
import type { RespuestaGrupo } from "../grupo/repositorio";
import { repositorioContactosMemoria } from "../grupo/repositorio-memoria";
import { grupoArmado, pedirRecomendacionGrupo } from "./grupo";
import { memoria, storeDePrueba } from "./prueba";
import { usuarioCambio } from "./sesion";

const pedido: PedidoGrupo = {
  comercio: { id: "la-parolaccia", nombre: "La Parolaccia", inicial: "L", rubro: "gastronomia", categoriaId: 2, frecuente: false },
  canal: "presencial",
  monto: 41000,
  contactos: ["u-lucia"],
  sinCuenta: [{ posicion: 0, nombre: "Sofía" }],
};
const respuesta: RespuestaGrupo = {
  fecha: "2026-11-14",
  quienPaga: null,
  reintegro: null,
  total: 41000,
  vos: { opcion: null, sinOpcion: null, parte: 13667 },
  contactos: [{ id: "u-lucia", nombre: "Lucía", opcion: null, parte: 13667 }],
  sinCuenta: [{ posicion: 0, parte: 13666 }],
};

function armar(opciones: Parameters<typeof repositorioContactosMemoria>[0]) {
  const repo = repositorioContactosMemoria(opciones);
  const s = storeDePrueba(null, memoria(), { contactosRemoto: repo });
  s.dispatch(usuarioCambio({ id: "u1", email: "yo@mail.com" }));
  return { s, repo };
}

describe("pedirRecomendacionGrupo (spec 016 US3, FR-027)", () => {
  it("sin grupo armado no pide nada", async () => {
    const { s, repo } = armar({ respuestaGrupo: respuesta });
    expect(await s.dispatch(pedirRecomendacionGrupo())).toBeNull();
    expect(repo.pedidosGrupo).toEqual([]);
  });

  it("manda el pedido sin fecha ni nombres de los sin cuenta y devuelve la respuesta", async () => {
    const { s, repo } = armar({ respuestaGrupo: respuesta });
    s.dispatch(grupoArmado(pedido));
    expect(await s.dispatch(pedirRecomendacionGrupo())).toEqual({ ok: true, respuesta });
    expect(repo.pedidosGrupo).toEqual([
      { compra: { comercio: "La Parolaccia", categoriaId: 2, canal: "presencial", monto: 41000 }, contactos: ["u-lucia"], sinCuenta: 1 },
    ]);
  });

  it("una falla llega como dato, con su campo, sin lanzar", async () => {
    const { s } = armar({ fallaGrupo: "invalido", campoFalla: "compra.monto" });
    s.dispatch(grupoArmado(pedido));
    expect(await s.dispatch(pedirRecomendacionGrupo())).toEqual({ ok: false, falla: "invalido", campo: "compra.monto" });
  });

  it("US3-12: si alguien ya no es contacto, recarga la lista en el momento", async () => {
    const { s, repo } = armar({ fallaGrupo: "contacto-no-vinculado", contactos: [] });
    s.dispatch(grupoArmado(pedido));
    const r = await s.dispatch(pedirRecomendacionGrupo());
    expect(r).toEqual({ ok: false, falla: "contacto-no-vinculado", campo: null });
    await new Promise((ok) => setTimeout(ok, 0));
    expect(s.getState().contactos.estado).toBe("listo");
    expect(repo.contactos).toEqual([]);
  });

  it("un error de red cualquiera es «servidor»", async () => {
    const { s, repo } = armar({ respuestaGrupo: respuesta });
    s.dispatch(grupoArmado(pedido));
    repo.fallarLaProxima();
    expect(await s.dispatch(pedirRecomendacionGrupo())).toEqual({ ok: false, falla: "servidor", campo: null });
  });
});
