import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { crearDatosPerfil } from "./datos";
import type { MedioNuevo } from "./modelo";

type Respuesta = { data: unknown; error: { code?: string; message: string } | null; status: number };
type Llamada = [metodo: string, ...args: unknown[]];

/** Cliente falso: registra la cadena de llamadas y responde lo que se le pida. */
function clienteFalso(respuesta: Respuesta | Error) {
  const llamadas: Llamada[] = [];
  const pedido: Record<string, unknown> = {};
  for (const metodo of ["select", "order", "insert", "delete", "eq", "single"]) {
    pedido[metodo] = (...args: unknown[]) => {
      llamadas.push([metodo, ...args]);
      return pedido;
    };
  }
  pedido.then = (ok: (r: Respuesta) => unknown, falla: (e: unknown) => unknown) =>
    respuesta instanceof Error ? Promise.reject(respuesta).then(ok, falla) : Promise.resolve(respuesta).then(ok, falla);
  const cliente = {
    from: (tabla: string) => {
      llamadas.push(["from", tabla]);
      return pedido;
    },
  };
  return { cliente: cliente as unknown as SupabaseClient, llamadas };
}

const GALICIA = "88d8705e-2dda-46f9-8411-bb4916af858e";
const fila = { id: "m1", banco_id: GALICIA, tipo: "credito", red: "visa", bancos: { nombre: "Banco Galicia" } };
const medio = { id: "m1", bancoId: GALICIA, nombreBanco: "Banco Galicia", tipo: "credito", red: "visa" };
const nuevo: MedioNuevo = { bancoId: GALICIA, tipo: "credito", red: "visa" };
const COLUMNAS = "id, banco_id, tipo, red, bancos(nombre)";

describe("datos del perfil", () => {
  it("leerBancos: solo id y nombre; on_hub_list queda null porque la base no lo tiene", async () => {
    const { cliente, llamadas } = clienteFalso({ data: [{ id: GALICIA, nombre: "Banco Galicia" }], error: null, status: 200 });
    expect(await crearDatosPerfil(cliente).leerBancos()).toEqual({
      ok: true,
      datos: [{ id: GALICIA, nombre: "Banco Galicia", onHubList: null }],
    });
    expect(llamadas).toEqual([["from", "bancos"], ["select", "id, nombre"]]);
  });

  it("leerMisMedios: trae el nombre del banco en el mismo pedido, en orden de alta", async () => {
    const { cliente, llamadas } = clienteFalso({ data: [fila], error: null, status: 200 });
    expect(await crearDatosPerfil(cliente).leerMisMedios()).toEqual({ ok: true, datos: [medio] });
    expect(llamadas).toEqual([["from", "medios_de_pago"], ["select", COLUMNAS], ["order", "creado_en"]]);
  });

  it("un medio sin banco embebido queda con nombreBanco null, sin inventarlo", async () => {
    const { cliente } = clienteFalso({ data: [{ ...fila, bancos: null }], error: null, status: 200 });
    const r = await crearDatosPerfil(cliente).leerMisMedios();
    expect(r.ok && r.datos[0]?.nombreBanco).toBeNull();
  });

  it("confirmarOnboarding: un solo insert con todas las filas y sin user_id (FR-011)", async () => {
    const otro: MedioNuevo = { ...nuevo, red: "american_express" };
    const { cliente, llamadas } = clienteFalso({ data: [fila], error: null, status: 201 });
    await crearDatosPerfil(cliente).confirmarOnboarding([nuevo, otro]);
    expect(llamadas).toEqual([
      ["from", "medios_de_pago"],
      [
        "insert",
        [
          { banco_id: GALICIA, tipo: "credito", red: "visa" },
          { banco_id: GALICIA, tipo: "credito", red: "american_express" },
        ],
      ],
      ["select", COLUMNAS],
    ]);
  });

  it("agregarMedio: inserta uno y devuelve el medio guardado", async () => {
    const { cliente, llamadas } = clienteFalso({ data: fila, error: null, status: 201 });
    expect(await crearDatosPerfil(cliente).agregarMedio(nuevo)).toEqual({ ok: true, datos: medio });
    expect(llamadas).toEqual([
      ["from", "medios_de_pago"],
      ["insert", { banco_id: GALICIA, tipo: "credito", red: "visa" }],
      ["select", COLUMNAS],
      ["single"],
    ]);
  });

  it("sacarMedio: borra por id y pide la fila borrada", async () => {
    const { cliente, llamadas } = clienteFalso({ data: [{ id: "m1" }], error: null, status: 200 });
    expect(await crearDatosPerfil(cliente).sacarMedio("m1")).toEqual({ ok: true, datos: null });
    expect(llamadas).toEqual([["from", "medios_de_pago"], ["delete"], ["eq", "id", "m1"], ["select", "id"]]);
  });

  it("sacarMedio: si el RLS no borró ninguna fila, no es un éxito", async () => {
    const { cliente } = clienteFalso({ data: [], error: null, status: 200 });
    expect(await crearDatosPerfil(cliente).sacarMedio("m1")).toEqual({ ok: false, error: "otro" });
  });

  it("nunca manda user_id: lo pone la base con auth.uid()", async () => {
    const { cliente, llamadas } = clienteFalso({ data: [fila], error: null, status: 201 });
    const datos = crearDatosPerfil(cliente);
    await datos.confirmarOnboarding([nuevo]);
    await datos.agregarMedio(nuevo);
    expect(JSON.stringify(llamadas)).not.toContain("user_id");
  });

  it("un error de la base se clasifica y no lanza", async () => {
    const { cliente } = clienteFalso({ data: null, error: { code: "23505", message: "duplicate key" }, status: 409 });
    expect(await crearDatosPerfil(cliente).agregarMedio(nuevo)).toEqual({ ok: false, error: "duplicado" });
  });

  it("si el pedido no llega (fetch falla), es sin conexión y no lanza", async () => {
    const { cliente } = clienteFalso(new TypeError("Network request failed"));
    expect(await crearDatosPerfil(cliente).leerMisMedios()).toEqual({ ok: false, error: "sin_conexion" });
  });

  it("supabase-js con status 0 también es sin conexión", async () => {
    const { cliente } = clienteFalso({ data: null, error: { message: "FetchError" }, status: 0 });
    expect(await crearDatosPerfil(cliente).leerBancos()).toEqual({ ok: false, error: "sin_conexion" });
  });

  it("una respuesta mal formada no se disfraza de sin conexión", async () => {
    const { cliente } = clienteFalso({ data: null, error: null, status: 200 });
    await expect(crearDatosPerfil(cliente).leerMisMedios()).rejects.toThrow();
  });
});
