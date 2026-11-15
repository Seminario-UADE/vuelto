/**
 * El medio de pago que dice el ticket, contra las tarjetas del perfil (spec 014, FR-008).
 * Es solo una sugerencia: nunca se marca sola (constitución §III).
 */

import { ETIQUETAS_RED, ETIQUETAS_TIPO, type MedioDePago, type Red, type TipoTarjeta } from "../perfil/modelo";

/** El `medio` que devuelve el servicio (spec 013), tal cual lo dice el ticket. */
export type MedioLeido = {
  banco: string | null;
  tipo: TipoTarjeta | null;
  red: Red | null;
  ultimos4: string | null;
};

export type Sugerencia =
  | { tipo: "sugerida"; medioId: string }
  | { tipo: "sin_coincidencia"; leido: string }
  | { tipo: "sin_medio" };

/** Sin mayúsculas, tildes ni puntuación, y sin «banco» ni «bco». */
function palabrasDelBanco(nombre: string): string[] {
  return nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((p) => p !== "" && p !== "banco" && p !== "bco");
}

/** El banco de la tarjeta aparece, como palabras seguidas, dentro del que dice el ticket. */
function mismoBanco(delTicket: string[], deLaTarjeta: string[]): boolean {
  if (deLaTarjeta.length === 0) return true;
  for (let i = 0; i + deLaTarjeta.length <= delTicket.length; i++) {
    if (deLaTarjeta.every((p, j) => delTicket[i + j] === p)) return true;
  }
  return false;
}

export function sugerirMedio(leido: MedioLeido, tarjetas: readonly MedioDePago[]): Sugerencia {
  if (leido.red === null && leido.tipo === null) return { tipo: "sin_medio" };

  const bancoTicket = leido.banco === null ? [] : palabrasDelBanco(leido.banco);
  const candidatas = tarjetas.filter(
    (t) =>
      (leido.red === null || t.red === leido.red) &&
      (leido.tipo === null || t.tipo === leido.tipo) &&
      (bancoTicket.length === 0 || t.nombreBanco === null || mismoBanco(bancoTicket, palabrasDelBanco(t.nombreBanco))),
  );

  const [unica] = candidatas;
  if (candidatas.length === 1 && unica) return { tipo: "sugerida", medioId: unica.id };
  return { tipo: "sin_coincidencia", leido: textoLeido(leido) };
}

/** La red y el tipo con su nombre para mostrar: «Visa débito», «Visa», «crédito». */
export function textoLeido(leido: MedioLeido): string {
  const partes: string[] = [];
  if (leido.red !== null) partes.push(ETIQUETAS_RED[leido.red]);
  if (leido.tipo !== null) partes.push(ETIQUETAS_TIPO[leido.tipo].toLowerCase());
  return partes.join(" ");
}
