import type { Rubro } from "../data/contracts";

/**
 * Un solo catálogo de rubros para toda la app: cómo se titula, la etiqueta corta de un
 * chip, cómo se nombra dentro de una frase y su categoría de MODO
 * (packages/motor/src/categorias.ts).
 */
export const RUBROS: Record<Rubro, { titulo: string; corto: string; enFrase: string; categoriaId: number | null }> = {
  supermercado: { titulo: "Supermercado", corto: "Súper", enFrase: "supermercados", categoriaId: 1 },
  gastronomia: { titulo: "Gastronomía", corto: "Gastronomía", enFrase: "gastronomía", categoriaId: 2 },
  indumentaria: { titulo: "Indumentaria", corto: "Ropa", enFrase: "indumentaria", categoriaId: 3 },
  farmacia: { titulo: "Farmacia", corto: "Farmacia", enFrase: "farmacias", categoriaId: 4 },
  combustible: { titulo: "Combustible", corto: "Nafta", enFrase: "combustibles", categoriaId: 5 },
  hogar: { titulo: "Hogar", corto: "Hogar", enFrase: "hogar", categoriaId: 7 },
  otro: { titulo: "Comercio", corto: "Otros", enFrase: "este comercio", categoriaId: null },
};
