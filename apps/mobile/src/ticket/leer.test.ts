import { describe, expect, it, vi } from "vitest";
import type { LecturaApp } from "../data/contracts";
import { MAXIMO_BYTES, leerFoto, type DependenciasLectura } from "./leer";
import type { ResultadoLectura } from "./resultados";

// Spec 014, US2 y research R4: en todos los caminos, las copias de la foto se borran antes de
// devolver el resultado (SC-002). Un test por camino.

const FOTO = "file:///cache/ImagePicker/foto.heic";
const ACHICADA = "file:///cache/ImageManipulator/achicada.jpg";

const LEIDA: LecturaApp = {
  ok: true,
  comercio: "COTO",
  fecha: "2026-11-14",
  monto: 24500,
  medio: { banco: null, tipo: "debito", red: "visa", ultimos4: "1234" },
  textoExtraido: "COTO",
};

/** Un base64 que decodifica a `bytes` bytes. */
const base64De = (bytes: number) => "A".repeat(Math.ceil(bytes / 3) * 4);

function deps(cambios: Partial<DependenciasLectura> = {}) {
  const borradas: string[] = [];
  const orden: string[] = [];
  const d: DependenciasLectura = {
    preparar: vi.fn(async () => ({ base64: base64De(1000), temporales: [ACHICADA] })),
    pedir: vi.fn(async () => LEIDA),
    borrar: vi.fn(async (rutas: string[]) => {
      orden.push("borrar");
      borradas.push(...rutas);
    }),
    ...cambios,
  };
  return { d, borradas, orden };
}

describe("leerFoto", () => {
  it("éxito: devuelve la lectura y borra la foto y la achicada antes de devolver", async () => {
    const { d, borradas, orden } = deps();
    const lectura = await leerFoto(FOTO, d).then((r) => {
      orden.push("devuelve");
      return r;
    });
    expect(lectura).toEqual(LEIDA);
    expect(borradas.sort()).toEqual([ACHICADA, FOTO].sort());
    expect(orden).toEqual(["borrar", "devuelve"]);
    expect(d.preparar).toHaveBeenCalledWith(FOTO);
    expect(d.pedir).toHaveBeenCalledWith(base64De(1000));
  });

  it.each<ResultadoLectura>([
    "no_autenticado",
    "foto_no_valida",
    "imagen_demasiado_grande",
    "ticket_ilegible",
    "no_disponible",
    "tardo_demasiado",
    "sin_conexion",
    "interno",
  ])("el servicio devuelve %s: el mismo resultado y las copias borradas", async (resultado) => {
    const { d, borradas } = deps({ pedir: vi.fn(async () => ({ ok: false as const, resultado })) });
    expect(await leerFoto(FOTO, d)).toEqual({ ok: false, resultado });
    expect(borradas.sort()).toEqual([ACHICADA, FOTO].sort());
  });

  it("pedir que tira: interno y las copias borradas", async () => {
    const { d, borradas } = deps({
      pedir: vi.fn(async () => {
        throw new Error("inesperado");
      }),
    });
    expect(await leerFoto(FOTO, d)).toEqual({ ok: false, resultado: "interno" });
    expect(borradas.sort()).toEqual([ACHICADA, FOTO].sort());
  });

  it("preparar que falla: imagen_demasiado_grande, sin pedir, y la foto borrada", async () => {
    const { d, borradas } = deps({
      preparar: vi.fn(async () => {
        throw new Error("no se pudo achicar");
      }),
    });
    expect(await leerFoto(FOTO, d)).toEqual({ ok: false, resultado: "imagen_demasiado_grande" });
    expect(d.pedir).not.toHaveBeenCalled();
    expect(borradas).toEqual([FOTO]);
  });

  it("una foto que no baja de 2,5 MB: imagen_demasiado_grande, sin pedir, y las copias borradas", async () => {
    const { d, borradas } = deps({
      preparar: vi.fn(async () => ({ base64: base64De(MAXIMO_BYTES + 3), temporales: [ACHICADA] })),
    });
    expect(await leerFoto(FOTO, d)).toEqual({ ok: false, resultado: "imagen_demasiado_grande" });
    expect(d.pedir).not.toHaveBeenCalled();
    expect(borradas.sort()).toEqual([ACHICADA, FOTO].sort());
  });

  it("justo 2.500.000 bytes se manda", async () => {
    const base64 = `${"A".repeat((MAXIMO_BYTES - 1) / 3 * 4)}AA==`;
    const { d } = deps({ preparar: vi.fn(async () => ({ base64, temporales: [] })) });
    expect(MAXIMO_BYTES).toBe(2_500_000);
    expect(await leerFoto(FOTO, d)).toEqual(LEIDA);
  });

  it("un borrar que falla no cambia el resultado", async () => {
    const { d } = deps({
      borrar: vi.fn(async () => {
        throw new Error("no se pudo borrar");
      }),
    });
    expect(await leerFoto(FOTO, d)).toEqual(LEIDA);
  });

  it.each(["blob:https://vuelto.expo.app/123", "data:image/jpeg;base64,QUJD"])(
    "en web (%s) no hay archivo: no se borra la foto",
    async (uri) => {
      const { d, borradas } = deps({
        preparar: vi.fn(async () => ({ base64: base64De(1000), temporales: ["data:image/jpeg;base64,QUJD"] })),
      });
      expect(await leerFoto(uri, d)).toEqual(LEIDA);
      expect(borradas).toEqual([]);
    },
  );
});
