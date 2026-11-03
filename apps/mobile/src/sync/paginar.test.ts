import { describe, expect, it } from "vitest";
import type { Cursor, FilaPromocion } from "./contratos";
import { leerTodo } from "./paginar";
import { fila, ID } from "./prueba";
import { repositorioEnMemoria } from "./repositorio-memoria";

const leer = (repo: ReturnType<typeof repositorioEnMemoria>, tamano: number) =>
  leerTodo<FilaPromocion>(
    (cursor: Cursor) =>
      repo.promociones({ desde: null, vigenteDesde: null, cursor, limite: tamano, signal: new AbortController().signal }),
    (f) => ({ valor: f.actualizada_en, id: f.id }),
    tamano,
  );

describe("leerTodo (SC-006, FR-006)", () => {
  it("lee todas las páginas y termina cuando una viene incompleta", async () => {
    const repo = repositorioEnMemoria({ promociones: [1, 2, 3, 4, 5].map((n) => fila(n)) });
    const r = await leer(repo, 2);
    expect(r.map((f) => f.id)).toEqual([1, 2, 3, 4, 5].map(ID));
    expect(repo.pedidos.filter((p) => p.tipo === "promociones")).toHaveLength(3);
  });

  it("una cantidad exacta de páginas pide una más (vacía) para saber que terminó", async () => {
    const repo = repositorioEnMemoria({ promociones: [1, 2, 3, 4].map((n) => fila(n)) });
    const r = await leer(repo, 2);
    expect(r).toHaveLength(4);
    expect(repo.pedidos.filter((p) => p.tipo === "promociones")).toHaveLength(3);
  });

  it("los empates de actualizada_en en el borde de página no se pierden ni se repiten", async () => {
    const mismo = "2026-11-02T12:00:00.123456+00:00";
    const repo = repositorioEnMemoria({
      promociones: [1, 2, 3, 4, 5].map((n) => fila(n, { actualizada_en: mismo })),
    });
    const r = await leer(repo, 2);
    expect(r.map((f) => f.id)).toEqual([1, 2, 3, 4, 5].map(ID));
  });

  it("una fila modificada entre dos páginas no se pierde: llega por el margen de la próxima sincronización", async () => {
    // La fila 1 está en la página 1; mientras se lee la página 2 se modifica y pasa al final.
    const repo = repositorioEnMemoria({ promociones: [1, 2, 3, 4].map((n) => fila(n)) });
    let pedidos = 0;
    repo.alPedirPromociones = () => {
      pedidos++;
      if (pedidos === 2) repo.promocionesFilas[0]!.actualizada_en = "2026-11-02T12:30:00+00:00";
    };
    const r = await leer(repo, 2);
    // Con OFFSET se habría salteado la 3; con cursor llegan 1, 2, 3, 4 (y la 1, ya modificada, vuelve en la última página).
    const ids = r.map((f) => f.id);
    expect(ids).toContain(ID(3));
    expect(ids).toContain(ID(4));
    expect(new Set(ids).size).toBeGreaterThanOrEqual(4);
  });

  it("si el servidor repite la misma página, falla en vez de pedir para siempre", async () => {
    const f1 = fila(1);
    const f2 = fila(2);
    const pedir = async () => [f1, f2];
    await expect(leerTodo(pedir, (f) => ({ valor: f.actualizada_en, id: f.id }), 2)).rejects.toThrow("cursor");
  });

  it("propaga el error de una página sin devolver resultados parciales", async () => {
    const repo = repositorioEnMemoria({ promociones: [1, 2, 3, 4].map((n) => fila(n)) });
    repo.falloEnPedido = 2;
    await expect(leer(repo, 2)).rejects.toThrow("falla simulada");
  });
});
