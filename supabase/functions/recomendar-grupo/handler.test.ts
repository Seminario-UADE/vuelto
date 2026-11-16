import { afterEach, describe, expect, it, vi } from "vitest";
import { GrupoInvalidoError } from "@vuelto/motor";
import { AutenticacionNoDisponibleError, type Autenticador } from "../_shared/autenticar.ts";
import { ContactoNoVinculadoError } from "../_shared/errores.ts";
import {
  CategoriasEnMemoria,
  ComprasEnMemoria,
  ContactosEnMemoria,
  MediosDePagoEnMemoria,
  PromocionesEnMemoria,
} from "../_shared/memoria/repositorios.ts";
import { AHORA, GASTRONOMIA, medio, promo } from "../_shared/test/fabricas.ts";
import { crearHandlerRecomendarGrupo } from "./handler.ts";
import { ServicioGrupo } from "./servicio.ts";

const URL_FUNCION = "http://localhost/functions/v1/recomendar-grupo";
const YO = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const LUCIA = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const body = { compra: { comercio: "Kansas", categoriaId: GASTRONOMIA, canal: "presencial", monto: 41000 }, contactos: [LUCIA], sinCuenta: 1 };

function servicioDePrueba(): ServicioGrupo {
  return new ServicioGrupo(
    new MediosDePagoEnMemoria([{ usuarioId: YO, dato: medio({ id: "mio" }) }]),
    new PromocionesEnMemoria([promo()]),
    new ComprasEnMemoria([]),
    new CategoriasEnMemoria([GASTRONOMIA]),
    new ContactosEnMemoria([{ id: LUCIA, nombre: "Lucía", medios: [], consumos: [] }]),
  );
}

function servicioQueLanza(error: Error): () => ServicioGrupo {
  return () => ({ recomendar: async () => Promise.reject(error) }) as unknown as ServicioGrupo;
}

const autenticador = (usuario: string | null): Autenticador => ({ usuarioDe: async () => usuario });

function pedido(datos: unknown, init: RequestInit = {}): Request {
  return new Request(URL_FUNCION, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer token" },
    body: typeof datos === "string" ? datos : JSON.stringify(datos),
    ...init,
  });
}

function handler(opciones: { usuario?: string | null; servicio?: () => ServicioGrupo; auth?: Autenticador } = {}) {
  return crearHandlerRecomendarGrupo({
    autenticador: opciones.auth ?? autenticador(opciones.usuario === undefined ? YO : opciones.usuario),
    crearServicio: opciones.servicio ?? servicioDePrueba,
    reloj: () => AHORA,
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("handler recomendar-grupo (contracts/recomendar-grupo.md)", () => {
  it("200 con la respuesta del servicio", async () => {
    const res = await handler()(pedido(body));
    expect(res.status).toBe(200);
    const esperado = await servicioDePrueba().recomendar(YO, { compra: { ...body.compra, canal: "presencial" }, contactos: [LUCIA], sinCuenta: 1 }, AHORA);
    expect(await res.json()).toEqual(JSON.parse(JSON.stringify(esperado)));
  });

  it("405 si no es POST", async () => {
    const res = await handler()(new Request(URL_FUNCION, { method: "GET" }));
    expect(res.status).toBe(405);
  });

  it("401 sin sesión", async () => {
    const res = await handler({ usuario: null })(pedido(body));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "no_autenticado" });
  });

  it("500 si Auth no responde (no es «sesión vencida»)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const auth: Autenticador = { usuarioDe: async () => Promise.reject(new AutenticacionNoDisponibleError()) };
    const res = await handler({ auth })(pedido(body));
    expect(res.status).toBe(500);
  });

  it("400 con el campo que falló", async () => {
    const r1 = await handler()(pedido("no es json"));
    expect(r1.status).toBe(400);
    expect(await r1.json()).toEqual({ error: "invalido", campo: "body" });
    const r2 = await handler()(pedido({ ...body, sinCuenta: 20 }));
    expect(await r2.json()).toEqual({ error: "invalido", campo: "grupo" });
    const r3 = await handler()(pedido({ ...body, contactos: [YO] }));
    expect(await r3.json()).toEqual({ error: "invalido", campo: "contactos" });
  });

  it("400 si el rubro no existe o el motor rechaza el grupo", async () => {
    const r1 = await handler()(pedido({ ...body, compra: { ...body.compra, categoriaId: 999 } }));
    expect(await r1.json()).toEqual({ error: "invalido", campo: "compra.categoriaId" });
    const r2 = await handler({ servicio: servicioQueLanza(new GrupoInvalidoError("demasiados")) })(pedido(body));
    expect(r2.status).toBe(400);
    expect(await r2.json()).toEqual({ error: "invalido", campo: "grupo" });
  });

  it("409 si alguien del grupo no es contacto vinculado (igual si no existe)", async () => {
    const res = await handler({ servicio: servicioQueLanza(new ContactoNoVinculadoError()) })(pedido(body));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "contacto_no_vinculado" });
  });

  it("500 ante cualquier otra falla, y el registro lleva solo el nombre del error (FR-034)", async () => {
    const espia = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("fila con medios y compras de Lucía");
    error.name = "PostgrestError";
    const res = await handler({ servicio: servicioQueLanza(error) })(pedido(body));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "interno" });
    expect(espia).toHaveBeenCalledWith("recomendar-grupo:", "PostgrestError");
    expect(JSON.stringify(espia.mock.calls)).not.toMatch(/Lucía|medios|compras/);
  });
});
