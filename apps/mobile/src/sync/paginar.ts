/**
 * Lectura paginada por cursor (spec 009 FR-006, research R1). Pide páginas de `tamano` filas hasta
 * que una viene incompleta; el cursor es el valor exacto de la columna de orden y el `id` de la
 * última fila, nunca una fecha convertida. OFFSET pierde filas si la ingesta toca una de las
 * anteriores entre dos páginas; `>` sin desempate pierde las que empatan en el borde.
 */
import type { Cursor } from "./contratos";

export const TAMANO_PAGINA = 500;

export async function leerTodo<Fila>(
  pedir: (cursor: Cursor) => Promise<Fila[]>,
  cursorDe: (fila: Fila) => NonNullable<Cursor>,
  tamano: number = TAMANO_PAGINA,
): Promise<Fila[]> {
  const todas: Fila[] = [];
  let cursor: Cursor = null;
  for (;;) {
    const pagina = await pedir(cursor);
    todas.push(...pagina);
    const ultima = pagina[pagina.length - 1];
    if (pagina.length < tamano || ultima === undefined) return todas;
    const siguiente = cursorDe(ultima);
    // Si el servidor repite la misma página, el cursor no avanza: cortar antes de pedir para siempre.
    if (cursor !== null && siguiente.valor === cursor.valor && siguiente.id === cursor.id) {
      throw new Error("el cursor no avanza");
    }
    cursor = siguiente;
  }
}
