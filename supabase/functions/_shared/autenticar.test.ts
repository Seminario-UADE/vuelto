import { describe, expect, it, vi } from "vitest";
import { AutenticacionNoDisponibleError, AutenticadorSupabase, type ClienteAuth } from "./autenticar.ts";

function clienteQue(getUser: ClienteAuth["auth"]["getUser"]) {
  const espia = vi.fn(getUser);
  return { cliente: { auth: { getUser: espia } } satisfies ClienteAuth, getUser: espia };
}

function pedidoCon(authorization: string | null): Request {
  const headers = new Headers();
  if (authorization !== null) headers.set("Authorization", authorization);
  return new Request("http://localhost/functions/v1/recomendar", { method: "POST", headers });
}

describe("AutenticadorSupabase (FR-018)", () => {
  it("sin header Authorization: null, sin llamar a Supabase Auth", async () => {
    const { cliente, getUser } = clienteQue(async () => ({ data: { user: { id: "u1" } }, error: null }));
    expect(await new AutenticadorSupabase(cliente).usuarioDe(pedidoCon(null))).toBeNull();
    expect(getUser).not.toHaveBeenCalled();
  });

  it("header que no es Bearer: null", async () => {
    const { cliente, getUser } = clienteQue(async () => ({ data: { user: { id: "u1" } }, error: null }));
    expect(await new AutenticadorSupabase(cliente).usuarioDe(pedidoCon("Basic abc"))).toBeNull();
    expect(getUser).not.toHaveBeenCalled();
  });

  it("anon key o token rechazado por Auth (4xx): null", async () => {
    for (const status of [401, 403]) {
      const { cliente } = clienteQue(async () => ({ data: { user: null }, error: { status } }));
      expect(await new AutenticadorSupabase(cliente).usuarioDe(pedidoCon("Bearer anon-key"))).toBeNull();
    }
  });

  it("si Supabase Auth falla o no responde: lanza, para que el handler responda 500 y no 401", async () => {
    const casos: ClienteAuth["auth"]["getUser"][] = [
      async () => Promise.reject(new Error("red")),
      async () => ({ data: { user: null }, error: { status: 500 } }),
      async () => ({ data: { user: null }, error: { status: 0 } }),
      async () => ({ data: { user: null }, error: { status: undefined } }),
    ];
    for (const getUser of casos) {
      const { cliente } = clienteQue(getUser);
      await expect(new AutenticadorSupabase(cliente).usuarioDe(pedidoCon("Bearer token"))).rejects.toBeInstanceOf(
        AutenticacionNoDisponibleError,
      );
    }
  });

  it("token de un usuario: su id, pasando el token sin el prefijo Bearer", async () => {
    const { cliente, getUser } = clienteQue(async () => ({ data: { user: { id: "u1" } }, error: null }));
    expect(await new AutenticadorSupabase(cliente).usuarioDe(pedidoCon("Bearer token-de-u1"))).toBe("u1");
    expect(getUser).toHaveBeenCalledWith("token-de-u1");
  });
});
