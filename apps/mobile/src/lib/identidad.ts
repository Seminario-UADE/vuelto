const ids = new WeakMap<object, number>();
let siguiente = 0;

/**
 * Un número estable por referencia: sirve de clave para `useAsync` cuando lo que cambia es un
 * valor memoizado por un selector (ADR-010). Dos objetos distintos nunca comparten id, aunque
 * tengan el mismo contenido; la referencia se suelta cuando nadie más la usa.
 */
export function idDeReferencia(o: object): number {
  let id = ids.get(o);
  if (id === undefined) {
    id = ++siguiente;
    ids.set(o, id);
  }
  return id;
}
