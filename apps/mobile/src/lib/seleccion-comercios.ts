/**
 * La selección de comercios de la primera respuesta (spec 012, US4, FR-025 y FR-026): estado local
 * de la pantalla, que se guarda como habituales recién al tocar «Seguir».
 *
 * Tocar marca y muestra la respuesta; tocar uno ya marcado solo muestra su respuesta. Desmarcar es
 * un control aparte (×). Los ids son los del catálogo de comercios, en el orden en que se marcaron.
 */
export type SeleccionComercios = {
  marcados: readonly string[];
  /** El comercio cuya respuesta se muestra: el último tocado. `null` = ninguna respuesta. */
  activo: string | null;
};

export const SELECCION_VACIA: SeleccionComercios = { marcados: [], activo: null };

export function tocarComercio(s: SeleccionComercios, id: string): SeleccionComercios {
  return { marcados: s.marcados.includes(id) ? s.marcados : [...s.marcados, id], activo: id };
}

/** Si era el de la respuesta, la respuesta pasa al último marcado que queda, o desaparece. */
export function quitarComercio(s: SeleccionComercios, id: string): SeleccionComercios {
  if (!s.marcados.includes(id)) return s;
  const marcados = s.marcados.filter((m) => m !== id);
  return { marcados, activo: s.activo === id ? (marcados.at(-1) ?? null) : s.activo };
}
