/**
 * Qué muestra Armar grupo según quién hay (issue #139, hallazgo G-11). Funciones puras: la pantalla
 * solo las llama. Sin contactos vinculados el grupo no puede tener a nadie con tope conocido, así
 * que en vez de un botón apagado la pantalla lleva a Invitar.
 */

/** Sin contactos vinculados no hay a quién sumar con su tope: es el estado vacío de Armar. */
export function armarSinContactos(vinculados: number): boolean {
  return vinculados === 0;
}

/**
 * La línea de estado del pie. Sin contactos, «sumá a alguien más» no lleva a ningún lado (la gente
 * sin cuenta no tiene tope conocido): lo que falta es invitar a alguien.
 */
export function textoDelPie(p: { cantidad: number; monto: number | null; vinculados: number; maximo: number }): string {
  const personas = `${p.cantidad} ${p.cantidad === 1 ? "persona" : "personas"}`;
  if (p.monto === null) return `${personas} · falta el monto`;
  if (p.cantidad < 2) return `${personas} · ${armarSinContactos(p.vinculados) ? "invitá a alguien para armar el grupo" : "sumá a alguien más"}`;
  if (p.cantidad > p.maximo) return `${personas} · son más de ${p.maximo}`;
  return personas;
}
