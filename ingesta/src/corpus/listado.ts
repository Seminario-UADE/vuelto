/**
 * Listado de las promos vigentes de MODO: recorre todas las secciones que muestra
 * la web de promos y se queda con los reintegros vigentes (o por empezar) de las categorías
 * pedidas. Después suma el listado por categoría del endpoint anterior, que trae
 * algunas promos vigentes que la web ya no muestra. Una misma promo aparece en
 * varias secciones y en los dos listados (por ejemplo, Coto en «carrusel»,
 * «destacadas» y «supermercados»): cuenta una vez, con la tarjeta de la web si la tiene.
 *
 * También entran las promos publicadas que todavía no empezaron (`ESTADO_POR_EMPEZAR`).
 *
 * Lo que el listado deja afuera queda desglosado en el resumen (por estado, tipo y categoría), junto
 * con un control de las cadenas grandes: así «¿por qué no está Carrefour?» se responde leyendo el
 * registro de la corrida, sin volver a consultar a MODO.
 *
 * Valida los slugs de todo el listado antes de devolver nada: un listado con un
 * slug inválido frena la corrida entera, antes de pedir ningún detalle.
 */
import { normalizar } from "@vuelto/motor";
import { ESTADO_POR_EMPEZAR, ESTADO_VIGENTE, SLUG_SEGURO, bancoDeLaTarjeta, comercioDeLaTarjeta, esObjeto } from "./crudo.ts";
import type { Objeto } from "./crudo.ts";
import type { ClienteMODO } from "./modo.ts";

export interface Candidata {
  slug: string;
  tarjeta: Objeto;
}

/**
 * Cadenas de supermercados que se controlan en cada corrida. Es solo para el registro: no decide
 * qué se publica. Se busca el nombre como palabra entera en el comercio de la tarjeta.
 */
export const CADENAS_VIGILADAS: readonly string[] = ["Carrefour", "Coto", "Jumbo", "Disco", "Vea", "Día", "ChangoMás", "La Anónima"];

/** Cuántas promos de una cadena vio el listado y qué pasó con ellas. */
export interface ControlDeCadena {
  /** Las que siguen a pedir el detalle (vigentes o por empezar). */
  candidatas: number;
  /** Las que MODO sigue listando pero ya terminaron (o están en un estado que no se publica). */
  noVigentes: number;
  /** Vigentes que no son reintegro (cuotas, sorteos) o son de una categoría que no se publica. */
  otrasDescartadas: number;
}

/** El detalle de lo que el listado deja afuera: cada promo descartada cuenta una vez en su motivo. */
export interface DesgloseDeDescartadas {
  /** Las no vigentes, por `calculated_status`. */
  porEstado: Record<string, number>;
  /** Las que no son reintegro, por tipo de beneficio (`financing`, `payment_scratch`…). */
  porTipo: Record<string, number>;
  /** Las de otra categoría, por id de categoría de MODO (una promo con dos categorías cuenta en las dos). */
  porCategoria: Record<string, number>;
}

export interface ResumenListado {
  candidatas: number;
  /** Cuántas de las candidatas todavía no empezaron. */
  porEmpezar: number;
  porCategoria: Record<number, number>;
  porBanco: Record<string, number>;
  /** Las secciones de la web que se recorrieron. */
  secciones: string[];
  /** Promos vigentes que solo trae el listado anterior por categoría: la web no las muestra en ninguna sección. */
  soloEnElListadoAnterior: string[];
  descartadas: { noVigente: number; noEsReintegro: number; otraCategoria: number };
  desglose: DesgloseDeDescartadas;
  /** Una entrada por cada cadena de `CADENAS_VIGILADAS`, aunque no tenga ninguna promo. */
  cadenas: Record<string, ControlDeCadena>;
}

/** Lo que el listado lee de una tarjeta, venga de `/v2/slots` o del listado anterior. */
interface LecturaDeTarjeta {
  slug: unknown;
  id: string | null;
  /** `calculated_status`, o `(sin estado)`. */
  estado: string;
  /** Tipo de beneficio (`benefit.type` en la web, `trigger_type` en el listado anterior), o `(sin tipo)`. */
  tipo: string;
  esReintegro: boolean;
  categorias: number[];
}

const textoO = (x: unknown, siFalta: string): string => (typeof x === "string" && x.trim() !== "" ? x : siFalta);

const sumar = (cuenta: Record<string, number>, clave: string): void => {
  cuenta[clave] = (cuenta[clave] ?? 0) + 1;
};

/** Las cadenas vigiladas que nombra el comercio de la tarjeta («Carrefour Hiper, Market y Express» → Carrefour). */
function cadenasDe(comercio: string | null): string[] {
  if (comercio === null) return [];
  const palabras = ` ${normalizar(comercio).replace(/[^a-z0-9]+/g, " ")} `;
  return CADENAS_VIGILADAS.filter((cadena) => palabras.includes(` ${normalizar(cadena)} `));
}

/** `categoriaDelListado` es la categoría pedida al listado anterior, que no la repite en la tarjeta. */
function leerTarjeta(t: Objeto, categoriaDelListado: number | null): LecturaDeTarjeta {
  const estado = textoO(t.calculated_status, "(sin estado)");
  if (esObjeto(t.benefit)) {
    const publicacion = esObjeto(t.benefit.publication) ? t.benefit.publication : {};
    const oferta = esObjeto(t.offer) ? t.offer : {};
    return {
      slug: publicacion.slug,
      id: typeof t.benefit.id === "string" ? t.benefit.id : null,
      estado,
      tipo: textoO(t.benefit.type, "(sin tipo)"),
      esReintegro: t.benefit.type === "cashback",
      categorias: Array.isArray(oferta.categories) ? oferta.categories.map(Number) : [],
    };
  }
  return {
    slug: t.slug,
    id: typeof t.promo_id === "string" ? t.promo_id : null,
    estado,
    tipo: textoO(t.trigger_type, "(sin tipo)"),
    esReintegro: t.trigger_type === "payment_promotion",
    categorias: categoriaDelListado === null ? [] : [categoriaDelListado],
  };
}

export async function listarCandidatas(
  cliente: ClienteMODO,
  categorias: readonly number[],
): Promise<{ candidatas: Candidata[]; resumen: ResumenListado }> {
  const resumen: ResumenListado = {
    candidatas: 0,
    porEmpezar: 0,
    porCategoria: Object.fromEntries(categorias.map((c) => [c, 0])),
    porBanco: {},
    secciones: [],
    soloEnElListadoAnterior: [],
    descartadas: { noVigente: 0, noEsReintegro: 0, otraCategoria: 0 },
    desglose: { porEstado: {}, porTipo: {}, porCategoria: {} },
    cadenas: Object.fromEntries(CADENAS_VIGILADAS.map((c) => [c, { candidatas: 0, noVigentes: 0, otrasDescartadas: 0 }])),
  };

  const vistos = new Set<string>();
  const candidatas: Candidata[] = [];
  const considerar = (t: unknown, origen: string, categoriaDelListado: number | null): void => {
    if (!esObjeto(t)) throw new Error(`Una tarjeta de ${origen} no es un objeto`);
    const { slug, id, estado, tipo, esReintegro, categorias: deLaTarjeta } = leerTarjeta(t, categoriaDelListado);
    if (typeof slug !== "string" || !SLUG_SEGURO.test(slug)) {
      throw new Error(`Una tarjeta de ${origen} trae un slug inválido: ${JSON.stringify(slug)}`);
    }
    const clavePromo = id === null ? null : `promo:${id}`;
    if (vistos.has(`slug:${slug}`) || (clavePromo !== null && vistos.has(clavePromo))) return;
    vistos.add(`slug:${slug}`);
    if (clavePromo !== null) vistos.add(clavePromo);
    const cadenas = cadenasDe(comercioDeLaTarjeta(t)).map((c) => resumen.cadenas[c]!);
    if (estado !== ESTADO_VIGENTE && estado !== ESTADO_POR_EMPEZAR) {
      resumen.descartadas.noVigente++;
      sumar(resumen.desglose.porEstado, estado);
      for (const c of cadenas) c.noVigentes++;
      return;
    }
    // Cuotas, sorteos y otros beneficios no son reintegros.
    if (!esReintegro) {
      resumen.descartadas.noEsReintegro++;
      sumar(resumen.desglose.porTipo, tipo);
      for (const c of cadenas) c.otrasDescartadas++;
      return;
    }
    const pedidas = categorias.filter((c) => deLaTarjeta.includes(c));
    if (pedidas.length === 0) {
      resumen.descartadas.otraCategoria++;
      if (deLaTarjeta.length === 0) sumar(resumen.desglose.porCategoria, "(sin categoría)");
      for (const c of deLaTarjeta) sumar(resumen.desglose.porCategoria, String(c));
      for (const c of cadenas) c.otrasDescartadas++;
      return;
    }
    candidatas.push({ slug, tarjeta: t });
    if (estado === ESTADO_POR_EMPEZAR) resumen.porEmpezar++;
    for (const c of cadenas) c.candidatas++;
    for (const c of pedidas) resumen.porCategoria[c] = (resumen.porCategoria[c] ?? 0) + 1;
    const banco = bancoDeLaTarjeta(t) ?? "(sin banco)";
    resumen.porBanco[banco] = (resumen.porBanco[banco] ?? 0) + 1;
  };

  resumen.secciones = await cliente.secciones();
  for (const seccion of resumen.secciones) {
    for (const t of await cliente.listarSeccion(seccion)) considerar(t, `la sección ${seccion}`, null);
  }
  const antes = candidatas.length;
  for (const categoria of categorias) {
    for (const t of await cliente.listarCategoria(categoria)) considerar(t, `la categoría ${categoria}`, categoria);
  }
  resumen.soloEnElListadoAnterior = candidatas.slice(antes).map((c) => c.slug);
  resumen.candidatas = candidatas.length;
  return { candidatas, resumen };
}
