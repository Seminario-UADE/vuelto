import { describe, expect, it, vi } from "vitest";
import { PerfilSinMediosError } from "@vuelto/motor";
import { AutenticacionNoDisponibleError, type Autenticador } from "../_shared/autenticar.ts";
import { CategoriaInexistenteError } from "../_shared/errores.ts";
import {
  CategoriasEnMemoria,
  ComprasEnMemoria,
  MediosDePagoEnMemoria,
  PromocionesEnMemoria,
} from "../_shared/memoria/repositorios.ts";
import { AHORA, compraPropuesta, GASTRONOMIA, medio, promo } from "../_shared/test/fabricas.ts";
import { crearHandlerRecomendar } from "./handler.ts";
import { ServicioRecomendacion } from "./servicio.ts";

const URL_FUNCION = "http://localhost/functions/v1/recomendar";

function servicioDePrueba(): ServicioRecomendacion {
  return new ServicioRecomendacion(
    new MediosDePagoEnMemoria([{ usuarioId: "u1", dato: medio() }]),
    new PromocionesEnMemoria([promo()]),
    new ComprasEnMemoria([]),
    new CategoriasEnMemoria([GASTRONOMIA]),
  );
}

function autenticadorFijo(usuario: string | null): Autenticador {
  return { usuarioDe: async () => usuario };
}

function pedido(body: unknown, init: RequestInit = {}): Request {
  return new Request(URL_FUNCION, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer token" },
    body: typeof body === "string" ? body : JSON.stringify(body),
    ...init,
  });
}

describe("handler recomendar: US1", () => {
  it("responde 200 con la recomendación del servicio, calculada con un solo ahora", async () => {
    const reloj = vi.fn(() => AHORA);
    const handler = crearHandlerRecomendar({
      autenticador: autenticadorFijo("u1"),
      crearServicio: servicioDePrueba,
      reloj,
    });

    const res = await handler(pedido(compraPropuesta()));

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/json; charset=utf-8");
    const esperado = await servicioDePrueba().recomendar("u1", compraPropuesta(), AHORA);
    expect(await res.json()).toEqual(JSON.parse(JSON.stringify(esperado)));
    expect(reloj).toHaveBeenCalledTimes(1);
  });

  it("responde 200 a un pedido sin comercio (comercio null)", async () => {
    const handler = crearHandlerRecomendar({
      autenticador: autenticadorFijo("u1"),
      crearServicio: servicioDePrueba,
      reloj: () => AHORA,
    });

    const res = await handler(pedido(compraPropuesta({ comercio: null })));

    expect(res.status).toBe(200);
    const esperado = await servicioDePrueba().recomendar("u1", compraPropuesta({ comercio: null }), AHORA);
    expect(await res.json()).toEqual(JSON.parse(JSON.stringify(esperado)));
  });
});

describe("handler recomendar: US3, contrato de errores (FR-022)", () => {
  function handlerCon(servicio: Partial<ServicioRecomendacion>, usuario: string | null = "u1") {
    const crearServicio = vi.fn(() => servicio as ServicioRecomendacion);
    const handler = crearHandlerRecomendar({
      autenticador: autenticadorFijo(usuario),
      crearServicio,
      reloj: () => AHORA,
    });
    return { handler, crearServicio };
  }

  function servicioQueLanza(error: unknown): Partial<ServicioRecomendacion> {
    return { recomendar: async () => Promise.reject(error) };
  }

  it("405 si el método no es POST", async () => {
    const { handler } = handlerCon(servicioDePrueba());
    const res = await handler(new Request(URL_FUNCION, { method: "GET" }));
    expect(res.status).toBe(405);
    expect(await res.json()).toEqual({ error: "metodo_no_permitido" });
  });

  it("401 sin usuario logueado, sin crear el servicio ni leer datos (FR-018)", async () => {
    const { handler, crearServicio } = handlerCon(servicioDePrueba(), null);
    const res = await handler(pedido(compraPropuesta()));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "no_autenticado" });
    expect(crearServicio).not.toHaveBeenCalled();
  });

  it("500 (no 401) si el servicio de autenticación no responde", async () => {
    const consola = vi.spyOn(console, "error").mockImplementation(() => {});
    const handler = crearHandlerRecomendar({
      autenticador: { usuarioDe: async () => Promise.reject(new AutenticacionNoDisponibleError()) },
      crearServicio: servicioDePrueba,
      reloj: () => AHORA,
    });
    const res = await handler(pedido(compraPropuesta()));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "interno" });
    consola.mockRestore();
  });

  it("400 con campo body si el body no es JSON", async () => {
    const { handler } = handlerCon(servicioDePrueba());
    const res = await handler(pedido("{no es json"));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalido", campo: "body" });
  });

  it("400 con el campo inválido, sin llamar al servicio", async () => {
    const { handler, crearServicio } = handlerCon(servicioDePrueba());
    const res = await handler(pedido({ ...compraPropuesta(), monto: 0 }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalido", campo: "monto" });
    expect(crearServicio).not.toHaveBeenCalled();
  });

  it("400 categoriaId si el rubro no existe en el catálogo", async () => {
    const { handler } = handlerCon(servicioQueLanza(new CategoriaInexistenteError()));
    const res = await handler(pedido(compraPropuesta()));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalido", campo: "categoriaId" });
  });

  it("422 si el usuario no tiene medios de pago", async () => {
    const { handler } = handlerCon(servicioQueLanza(new PerfilSinMediosError()));
    const res = await handler(pedido(compraPropuesta()));
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({ error: "perfil_sin_medios" });
  });

  it("500 genérico, sin detalles internos ni datos en los registros (FR-023)", async () => {
    const error = new Error('relation "compras": valor secreto de una fila');
    error.name = "PostgrestError";
    const { handler } = handlerCon(servicioQueLanza(error));
    const registros = [vi.spyOn(console, "error"), vi.spyOn(console, "log"), vi.spyOn(console, "warn")];
    registros.forEach((r) => r.mockImplementation(() => {}));

    const res = await handler(pedido({ ...compraPropuesta(), comercio: "ComercioPrivado" }));
    const texto = await res.text();

    expect(res.status).toBe(500);
    expect(JSON.parse(texto)).toEqual({ error: "interno" });
    expect(texto).not.toContain("secreto");
    const todoLoRegistrado = registros.flatMap((r) => r.mock.calls.flat()).map(String).join(" ");
    expect(todoLoRegistrado).toContain("PostgrestError");
    expect(todoLoRegistrado).not.toContain("secreto");
    expect(todoLoRegistrado).not.toContain("ComercioPrivado");
    registros.forEach((r) => r.mockRestore());
  });
});
