/**
 * Buscador de bancos en el dispositivo (decisión 7 del plan, FR-001, FR-002).
 * Sin `localeCompare`: el orden no depende del idioma del teléfono.
 */
import type { Banco } from "./modelo";

export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function porCodigo(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Primero los `on_hub_list`, después por nombre normalizado y por `id`. Texto vacío → `[]`. */
export function buscarBancos(catalogo: readonly Banco[], texto: string): Banco[] {
  const buscado = normalizar(texto);
  if (buscado === "") return [];
  return catalogo
    .map((banco) => ({ banco, nombre: normalizar(banco.nombre) }))
    .filter(({ nombre }) => nombre.includes(buscado))
    .sort(
      (a, b) =>
        Number(b.banco.onHubList === true) - Number(a.banco.onHubList === true) ||
        porCodigo(a.nombre, b.nombre) ||
        porCodigo(a.banco.id, b.banco.id),
    )
    .map(({ banco }) => banco);
}
