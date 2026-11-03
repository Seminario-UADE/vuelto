/**
 * Cliente de la API pública de MODO (`docs/product/fuentes-promos.md`).
 *
 * El listado es el mismo que arma www.modo.com.ar/promos: el contenedor activo
 * de la web dice qué secciones muestra (carrusel, destacadas, supermercados,
 * más promos…) y cada sección se pide entera a `/v2/slots`. Leer una sola
 * sección deja afuera promos que la página sí muestra: las de Coto, Jumbo, Día
 * y otras cadenas grandes no están en «más promos». A la vez, el listado por
 * categoría del endpoint anterior (`/slots`) trae algunas promos vigentes que la
 * web ya no muestra en ninguna sección (por ejemplo, las de jubilados del BNA):
 * el relevamiento usa los dos.
 *
 * Scraping respetuoso (RNF-13): User-Agent identificado y una pausa mínima de
 * 1 s entre pedidos. `fetch` y la espera se inyectan para que los tests no
 * usen la red ni esperen de verdad.
 */

const BASE = "https://www.modo.com.ar/promos/api/rewards";
const USER_AGENT = "VueltoBot (UADE)";
const PAUSA_MINIMA_MS = 1000;
const POR_PAGINA = 100;
const RUTA_DETALLE = "/v2/benefit";
/** Los parámetros con los que la web pide el contenedor y las secciones. */
const ORIGEN_WEB = "source=web_modo";

/** La URL pública del detalle de una promo. */
export const urlDetalle = (slug: string): string => `${BASE}${RUTA_DETALLE}/${encodeURIComponent(slug)}`;

export interface OpcionesMODO {
  fetch: typeof fetch;
  /** Pausa entre pedidos, en ms. Mínimo 1000. */
  pausaMs: number;
  esperar: (ms: number) => Promise<void>;
  /** Tope de páginas por sección, por si el listado nunca termina. */
  maxPaginas?: number;
  /** Reintentos ante un error de servidor (5xx) o un corte de red. Por defecto 2. */
  reintentos?: number;
}

export interface PaginaDeSeccion {
  tarjetas: unknown[];
  totalPaginas: number;
}

export interface ClienteMODO {
  /** Los ids de las secciones que muestra hoy la web de promos, en su orden. */
  secciones(): Promise<string[]>;
  /** Una página de una sección (`/v2/slots`), con el total de páginas que informa MODO. */
  listarPagina(seccion: string, pagina: number): Promise<PaginaDeSeccion>;
  /** Todas las tarjetas de una sección, página por página. */
  listarSeccion(seccion: string): Promise<unknown[]>;
  /** Todas las tarjetas de una categoría en el listado anterior (`/slots`, id numérico: el slug devuelve 0). */
  listarCategoria(categoria: number): Promise<unknown[]>;
  /** Detalle de una promo (legales, tope estructurado, bancos por id). `null` si no existe o MODO no lo sirve (404 o 400). */
  detalle(slug: string): Promise<unknown | null>;
  /** Catálogo de bancos de MODO. */
  bancos(): Promise<unknown[]>;
}

export function crearClienteMODO(opciones: OpcionesMODO): ClienteMODO {
  if (opciones.pausaMs < PAUSA_MINIMA_MS) {
    throw new Error(`La pausa entre pedidos tiene que ser de al menos ${PAUSA_MINIMA_MS} ms (RNF-13).`);
  }
  const maxPaginas = opciones.maxPaginas ?? 200;
  const reintentos = opciones.reintentos ?? 2;
  let hizoPedidos = false;

  /**
   * Un pedido. Un 5xx o un corte de red se reintentan (con la misma pausa); un 4xx no.
   * Los estados de `inexistente` devuelven `cuerpo: null` en vez de lanzar.
   */
  async function pedir(ruta: string, inexistente: readonly number[] = [404]): Promise<{ estado: number; cuerpo: unknown }> {
    const url = `${BASE}${ruta}`;
    let ultimoError = "";
    for (let intento = 0; intento <= reintentos; intento++) {
      if (hizoPedidos) await opciones.esperar(opciones.pausaMs);
      hizoPedidos = true;
      let respuesta: Response;
      try {
        respuesta = await opciones.fetch(url, {
          headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
        });
      } catch (error) {
        ultimoError = `Falló la conexión con ${url}: ${error instanceof Error ? error.message : String(error)}`;
        continue;
      }
      const texto = await respuesta.text();
      if (inexistente.includes(respuesta.status)) return { estado: respuesta.status, cuerpo: null };
      if (respuesta.status >= 500) {
        ultimoError = `MODO respondió ${respuesta.status} en ${url}`;
        continue;
      }
      if (!respuesta.ok) throw new Error(`MODO respondió ${respuesta.status} en ${url}`);
      try {
        return { estado: respuesta.status, cuerpo: JSON.parse(texto) as unknown };
      } catch {
        throw new Error(`La respuesta de ${url} no es JSON`);
      }
    }
    throw new Error(`${ultimoError} (después de ${reintentos + 1} intentos)`);
  }

  async function listarPagina(seccion: string, pagina: number): Promise<PaginaDeSeccion> {
    const ruta =
      `/v2/slots?ids=${encodeURIComponent(seccion)}&limit=${POR_PAGINA}&page=${pagina}` +
      `&${ORIGEN_WEB}&origin=WEB_MODO&slot_info=true`;
    const { cuerpo } = await pedir(ruta);
    const slot = (cuerpo as { slots?: unknown } | null)?.slots;
    const datos = Array.isArray(slot) ? (slot[0] as { cards?: unknown; pagination?: { total_pages?: unknown } } | undefined) : undefined;
    if (datos === undefined || !Array.isArray(datos.cards)) {
      throw new Error(`La respuesta de /v2/slots (sección ${seccion}, página ${pagina}) no trae slots[0].cards`);
    }
    const totalPaginas = datos.pagination?.total_pages;
    if (typeof totalPaginas !== "number" || !Number.isInteger(totalPaginas) || totalPaginas < 0) {
      throw new Error(`La respuesta de /v2/slots (sección ${seccion}, página ${pagina}) no trae pagination.total_pages`);
    }
    return { tarjetas: datos.cards, totalPaginas };
  }

  return {
    async secciones() {
      const { cuerpo: activo } = await pedir(`/slots-container/active?${ORIGEN_WEB}`);
      const contenedor = (activo as { slug?: unknown } | null)?.slug;
      if (typeof contenedor !== "string" || contenedor.trim() === "") {
        throw new Error("MODO no informa el contenedor activo de la web de promos");
      }
      const { cuerpo } = await pedir(`/slots-container/${encodeURIComponent(contenedor)}?${ORIGEN_WEB}`);
      const slots = (cuerpo as { slots?: unknown } | null)?.slots;
      if (!Array.isArray(slots)) throw new Error(`El contenedor ${contenedor} no trae la lista de secciones`);
      const ids = slots
        .filter(
          (s): s is { id: string; status?: unknown } =>
            typeof s === "object" && s !== null && typeof (s as { id?: unknown }).id === "string",
        )
        .filter((s) => s.status === undefined || s.status === "active")
        .map((s) => s.id);
      if (ids.length === 0) throw new Error(`El contenedor ${contenedor} no tiene ninguna sección activa`);
      return ids;
    },

    listarPagina,

    async listarSeccion(seccion) {
      const todas: unknown[] = [];
      for (let pagina = 1; pagina <= maxPaginas; pagina++) {
        const { tarjetas, totalPaginas } = await listarPagina(seccion, pagina);
        todas.push(...tarjetas);
        if (pagina >= totalPaginas || tarjetas.length === 0) return todas;
      }
      throw new Error(`La sección ${seccion} pasó las ${maxPaginas} páginas sin terminar`);
    },

    async listarCategoria(categoria) {
      const todas: unknown[] = [];
      for (let pagina = 1; pagina <= maxPaginas; pagina++) {
        const ruta = `/slots?slots=web-modo-hub-mas-promos&categories=${categoria}&page=${pagina}&limit=${POR_PAGINA}`;
        const { cuerpo } = await pedir(ruta);
        const tarjetas = (cuerpo as { data?: { cards?: unknown } } | null)?.data?.cards;
        if (!Array.isArray(tarjetas)) {
          throw new Error(`La respuesta de /slots (categoría ${categoria}, página ${pagina}) no trae data.cards`);
        }
        todas.push(...tarjetas);
        if (tarjetas.length < POR_PAGINA) return todas;
      }
      throw new Error(`El listado de la categoría ${categoria} pasó las ${maxPaginas} páginas sin terminar`);
    },

    async detalle(slug) {
      // MODO responde 400 (siempre, no de a ratos) a algunos slugs que el listado sí publica:
      // es un detalle que no se puede leer, no un corte, y no tiene que hacer fallar la corrida.
      const { cuerpo } = await pedir(`${RUTA_DETALLE}/${encodeURIComponent(slug)}`, [400, 404]);
      return cuerpo;
    },

    async bancos() {
      const { cuerpo } = await pedir("/banks?source=app_modo");
      if (!Array.isArray(cuerpo)) throw new Error("El catálogo de bancos de MODO no es una lista");
      return cuerpo;
    },
  };
}
