/**
 * Listado de las promos vigentes de MODO: recorre todas las secciones que muestra
 * la web de promos y se queda con los reintegros vigentes de las categorías
 * pedidas. Después suma el listado por categoría del endpoint anterior, que trae
 * algunas promos vigentes que la web ya no muestra. Una misma promo aparece en
 * varias secciones y en los dos listados (por ejemplo, Coto en «carrusel»,
 * «destacadas» y «supermercados»): cuenta una vez, con la tarjeta de la web si la tiene.
 *
 * Valida los slugs de todo el listado antes de devolver nada: un listado con un
 * slug inválido frena la corrida entera, antes de pedir ningún detalle.
 */
import { SLUG_SEGURO, bancoDeLaTarjeta, esObjeto } from "./crudo.ts";
import type { Objeto } from "./crudo.ts";
import type { ClienteMODO } from "./modo.ts";

export interface Candidata {
  slug: string;
  tarjeta: Objeto;
}

export interface ResumenListado {
  candidatas: number;
  porCategoria: Record<number, number>;
  porBanco: Record<string, number>;
  /** Las secciones de la web que se recorrieron. */
  secciones: string[];
  /** Promos vigentes que solo trae el listado anterior por categoría: la web no las muestra en ninguna sección. */
  soloEnElListadoAnterior: string[];
  descartadas: { noVigente: number; noEsReintegro: number; otraCategoria: number };
}

/** Lo que el listado lee de una tarjeta, venga de `/v2/slots` o del listado anterior. */
interface LecturaDeTarjeta {
  slug: unknown;
  id: string | null;
  vigente: boolean;
  esReintegro: boolean;
  categorias: number[];
}

/** `categoriaDelListado` es la categoría pedida al listado anterior, que no la repite en la tarjeta. */
function leerTarjeta(t: Objeto, categoriaDelListado: number | null): LecturaDeTarjeta {
  const vigente = t.calculated_status === "RUNNING";
  if (esObjeto(t.benefit)) {
    const publicacion = esObjeto(t.benefit.publication) ? t.benefit.publication : {};
    const oferta = esObjeto(t.offer) ? t.offer : {};
    return {
      slug: publicacion.slug,
      id: typeof t.benefit.id === "string" ? t.benefit.id : null,
      vigente,
      esReintegro: t.benefit.type === "cashback",
      categorias: Array.isArray(oferta.categories) ? oferta.categories.map(Number) : [],
    };
  }
  return {
    slug: t.slug,
    id: typeof t.promo_id === "string" ? t.promo_id : null,
    vigente,
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
    porCategoria: Object.fromEntries(categorias.map((c) => [c, 0])),
    porBanco: {},
    secciones: [],
    soloEnElListadoAnterior: [],
    descartadas: { noVigente: 0, noEsReintegro: 0, otraCategoria: 0 },
  };

  const vistos = new Set<string>();
  const candidatas: Candidata[] = [];
  const considerar = (t: unknown, origen: string, categoriaDelListado: number | null): void => {
    if (!esObjeto(t)) throw new Error(`Una tarjeta de ${origen} no es un objeto`);
    const { slug, id, vigente, esReintegro, categorias: deLaTarjeta } = leerTarjeta(t, categoriaDelListado);
    if (typeof slug !== "string" || !SLUG_SEGURO.test(slug)) {
      throw new Error(`Una tarjeta de ${origen} trae un slug inválido: ${JSON.stringify(slug)}`);
    }
    const clavePromo = id === null ? null : `promo:${id}`;
    if (vistos.has(`slug:${slug}`) || (clavePromo !== null && vistos.has(clavePromo))) return;
    vistos.add(`slug:${slug}`);
    if (clavePromo !== null) vistos.add(clavePromo);
    if (!vigente) {
      resumen.descartadas.noVigente++;
      return;
    }
    // Cuotas, sorteos y otros beneficios no son reintegros.
    if (!esReintegro) {
      resumen.descartadas.noEsReintegro++;
      return;
    }
    const pedidas = categorias.filter((c) => deLaTarjeta.includes(c));
    if (pedidas.length === 0) {
      resumen.descartadas.otraCategoria++;
      return;
    }
    candidatas.push({ slug, tarjeta: t });
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
