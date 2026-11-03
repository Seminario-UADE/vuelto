/** Un MODO falso para los tests del listado y de la ingesta. No es código de producción. */
import { readFileSync } from "node:fs";
import { vi } from "vitest";
import type { Crudo } from "../mapear.ts";
import type { ClienteMODO } from "../modo.ts";
import { catalogoReal } from "./fabricas.ts";

export type Libre = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export function fixture(nombre: string): Crudo {
  return JSON.parse(readFileSync(new URL(`./detalles/${nombre}.json`, import.meta.url), "utf8")) as Crudo;
}

export interface OpcionesTarjeta {
  estado?: string;
  tipo?: string;
  categorias?: string[];
  promoId?: string;
}

/** Tarjeta de `/v2/slots` mínima, con lo que usa el listado: slug, id, estado, tipo, categorías y banco. */
export function tarjeta(slug: string, o: OpcionesTarjeta = {}): Libre {
  return {
    card: { validity_place: "Comercio", participating_bank: "ICBC" },
    benefit: { id: o.promoId ?? `promo-${slug}`, type: o.tipo ?? "cashback", publication: { slug } },
    offer: { categories: o.categorias ?? ["1"] },
    calculated_status: o.estado ?? "RUNNING",
  };
}

/** Tarjeta del listado anterior (`/slots`), que trae el slug, el id y el banco (fila 5) en otra forma. */
export function tarjetaAnterior(slug: string, extra: Libre = {}): Libre {
  return {
    slug,
    promo_id: `promo-${slug}`,
    calculated_status: "RUNNING",
    trigger_type: "payment_promotion",
    content: { row: [{ text: "Comercio" }, {}, {}, {}, {}, { text: "BNA" }] },
    ...extra,
  };
}

/** Detalle de Petrelli (ICBC, categoría 1, tope semanal) con otro slug. */
export function detalleDe(slug: string, cambio: (d: Libre) => void = () => {}): Libre {
  const d = structuredClone(fixture("petrelli").detalle) as Libre;
  d.slug = slug;
  cambio(d);
  return d;
}

/** Un cliente que sirve estas secciones, en este orden, el listado anterior por categoría y el catálogo real de bancos. */
export function clienteCon(
  listados: Record<string, Libre[]>,
  detalle: ClienteMODO["detalle"] = vi.fn(async (slug: string) => detalleDe(slug)),
  porCategoria: Record<number, Libre[]> = {},
): ClienteMODO {
  return {
    secciones: vi.fn(async () => Object.keys(listados)),
    listarPagina: vi.fn(),
    listarSeccion: vi.fn(async (s: string) => listados[s] ?? []),
    listarCategoria: vi.fn(async (c: number) => porCategoria[c] ?? []),
    detalle,
    bancos: vi.fn(async () => catalogoReal()),
  };
}
