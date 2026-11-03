/**
 * Traducción de un banco al id del catálogo de MODO (research D11).
 *
 * El detalle de cada promo ya trae el banco por id; esta función sirve para
 * contrastar ese id con el `name_bank` del listado y para #51, que traduce
 * nombres. La comparación es normalizada (la misma `normalizar` del motor) más
 * una tabla de alias explícita; nunca por coincidencia parcial. Si hay
 * ambigüedad, o el nombre no resuelve, devuelve `null`: la promo se excluye y
 * no se asigna un banco por aproximación.
 */
import { normalizar } from "@vuelto/motor";
import { ALIAS_BANCOS } from "./bancos-alias.ts";
import type { BancoCatalogo } from "./tipos.ts";

export type IndiceCatalogo = ReadonlyMap<string, BancoCatalogo>;

/** Nombre normalizado → banco. Lanza si dos entradas del catálogo normalizan igual. */
export function indexarCatalogo(catalogo: readonly BancoCatalogo[]): IndiceCatalogo {
  const indice = new Map<string, BancoCatalogo>();
  for (const banco of catalogo) {
    const clave = normalizar(banco.name);
    const previo = indice.get(clave);
    if (previo !== undefined) {
      throw new Error(
        `Catálogo de bancos ambiguo: "${previo.name}" (${previo.id}) y "${banco.name}" (${banco.id}) normalizan igual.`,
      );
    }
    indice.set(clave, banco);
  }
  return indice;
}

/** Banco del catálogo para un nombre del listado, o `null` si no se puede resolver. */
export function resolverBanco(
  nombre: string,
  catalogo: readonly BancoCatalogo[],
  alias: Readonly<Record<string, string>> = ALIAS_BANCOS,
): BancoCatalogo | null {
  const indice = indexarCatalogo(catalogo);
  const tablaAlias = new Map<string, BancoCatalogo>();
  for (const [desde, hacia] of Object.entries(alias)) {
    const claveAlias = normalizar(desde);
    if (indice.has(claveAlias)) {
      throw new Error(`Alias inválido: "${desde}" ya es un nombre del catálogo, no necesita alias.`);
    }
    const destino = indice.get(normalizar(hacia));
    if (destino === undefined) {
      throw new Error(`Alias roto: "${desde}" apunta a "${hacia}", que no está en el catálogo.`);
    }
    tablaAlias.set(claveAlias, destino);
  }
  const clave = normalizar(nombre);
  if (clave === "") return null;
  return indice.get(clave) ?? tablaAlias.get(clave) ?? null;
}

export interface Contraste {
  coincide: boolean;
  /** `null` si coincide; si no, qué no cuadra. */
  mensaje: string | null;
}

/** ¿El `name_bank` del listado resuelve al mismo banco que el id del detalle? */
export function contrastar(
  nameBank: string,
  bancoIdDelDetalle: string,
  catalogo: readonly BancoCatalogo[],
): Contraste {
  const delDetalle = catalogo.find((b) => b.id === bancoIdDelDetalle);
  if (delDetalle === undefined) {
    return { coincide: false, mensaje: `El id del detalle (${bancoIdDelDetalle}) no está en el catálogo de bancos.` };
  }
  const delListado = resolverBanco(nameBank, catalogo);
  if (delListado === null) {
    return { coincide: false, mensaje: `El nombre del listado "${nameBank}" no se resuelve a ningún banco del catálogo.` };
  }
  if (delListado.id !== delDetalle.id) {
    return {
      coincide: false,
      mensaje: `El listado dice "${nameBank}" (${delListado.name}) pero el detalle trae ${delDetalle.name}.`,
    };
  }
  return { coincide: true, mensaje: null };
}
