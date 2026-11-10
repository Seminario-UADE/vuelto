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
 *
 * Tolerancia a fallas: cada pedido tiene un tiempo máximo (`AbortSignal.timeout`), un
 * 5xx o un corte de red se reintentan, un 429 se reintenta esperando lo que pida
 * `Retry-After` (o un backoff exponencial, el mayor de los dos) y un 400 del detalle
 * se reintenta una vez antes de darlo por «no se puede leer».
 */

const BASE = "https://www.modo.com.ar/promos/api/rewards";
const USER_AGENT = "VueltoBot (UADE)";
const PAUSA_MINIMA_MS = 1000;
const POR_PAGINA = 100;
const RUTA_DETALLE = "/v2/benefit";
/** Tiempo máximo de un pedido entero (respuesta y cuerpo). Sin esto, una conexión colgada consume el job de 90 minutos. */
const TIMEOUT_POR_DEFECTO_MS = 30_000;
/** Lo máximo que se espera por un 429, pida lo que pida `Retry-After`: el job tiene tope de tiempo. */
const ESPERA_MAXIMA_429_MS = 60_000;
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
  /** Reintentos ante un error de servidor (5xx), un corte de red o un timeout. Por defecto 2. */
  reintentos?: number;
  /** Reintentos ante un 429 (demasiados pedidos), aparte de los anteriores. Por defecto 4. */
  reintentos429?: number;
  /**
   * Reintentos de un 400 en una ruta donde el 400 significa «no se puede leer» (el detalle) antes
   * de darla por inexistente. Por defecto 1: un 400 transitorio no tiene que dar de baja la promo,
   * pero los slugs que MODO rechaza siempre con 400 no deben costar mucho tiempo.
   */
  reintentos400?: number;
  /** Tiempo máximo de cada pedido, en ms. Por defecto 30 s. */
  timeoutMs?: number;
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

/**
 * Cuánto esperar antes de reintentar un 429: el mayor entre `Retry-After` (segundos o fecha HTTP) y un
 * backoff exponencial (pausa × 2^intento), con tope. `intento` empieza en 1.
 */
export function esperaDe429(retryAfter: string | null, intento: number, pausaMs: number, ahora: () => number = Date.now): number {
  const backoff = pausaMs * 2 ** intento;
  let pedido = 0;
  if (retryAfter !== null && retryAfter.trim() !== "") {
    const segundos = Number(retryAfter);
    if (Number.isFinite(segundos) && segundos >= 0) pedido = segundos * 1000;
    else {
      const fecha = Date.parse(retryAfter);
      if (!Number.isNaN(fecha)) pedido = Math.max(0, fecha - ahora());
    }
  }
  return Math.min(ESPERA_MAXIMA_429_MS, Math.max(backoff, pedido));
}

export function crearClienteMODO(opciones: OpcionesMODO): ClienteMODO {
  if (opciones.pausaMs < PAUSA_MINIMA_MS) {
    throw new Error(`La pausa entre pedidos tiene que ser de al menos ${PAUSA_MINIMA_MS} ms (RNF-13).`);
  }
  const maxPaginas = opciones.maxPaginas ?? 200;
  const reintentos = opciones.reintentos ?? 2;
  const reintentos429 = opciones.reintentos429 ?? 4;
  const reintentos400 = opciones.reintentos400 ?? 1;
  const timeoutMs = opciones.timeoutMs ?? TIMEOUT_POR_DEFECTO_MS;
  let hizoPedidos = false;

  /**
   * Un pedido. Un 5xx, un corte de red o un timeout se reintentan (con la misma pausa); un 429 se
   * reintenta esperando más (ver `esperaDe429`); un 4xx no. Los estados de `inexistente` devuelven
   * `cuerpo: null` en vez de lanzar; si es un 400 se reintenta antes (`reintentos400`).
   */
  async function pedir(ruta: string, inexistente: readonly number[] = [404]): Promise<{ estado: number; cuerpo: unknown }> {
    const url = `${BASE}${ruta}`;
    let fallas = 0;
    let fallas429 = 0;
    let fallas400 = 0;
    let espera = opciones.pausaMs;
    for (;;) {
      if (hizoPedidos) await opciones.esperar(espera);
      hizoPedidos = true;
      espera = opciones.pausaMs;
      let respuesta: Response;
      let texto: string;
      try {
        respuesta = await opciones.fetch(url, {
          headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
          signal: AbortSignal.timeout(timeoutMs),
        });
        texto = await respuesta.text();
      } catch (error) {
        const motivo = error instanceof Error && error.name === "TimeoutError" ? `Se agotaron los ${timeoutMs} ms` : error instanceof Error ? error.message : String(error);
        if (++fallas > reintentos) {
          throw new Error(`Falló la conexión con ${url}: ${motivo} (después de ${reintentos + 1} intentos)`, { cause: error });
        }
        continue;
      }
      if (respuesta.status === 429) {
        if (++fallas429 > reintentos429) throw new Error(`MODO respondió 429 en ${url} (después de ${reintentos429 + 1} intentos)`);
        espera = esperaDe429(respuesta.headers.get("Retry-After"), fallas429, opciones.pausaMs);
        continue;
      }
      if (inexistente.includes(respuesta.status)) {
        if (respuesta.status === 400 && fallas400 < reintentos400) {
          fallas400++;
          continue;
        }
        return { estado: respuesta.status, cuerpo: null };
      }
      if (respuesta.status >= 500) {
        if (++fallas > reintentos) throw new Error(`MODO respondió ${respuesta.status} en ${url} (después de ${reintentos + 1} intentos)`);
        continue;
      }
      if (!respuesta.ok) throw new Error(`MODO respondió ${respuesta.status} en ${url}`);
      try {
        return { estado: respuesta.status, cuerpo: JSON.parse(texto) as unknown };
      } catch {
        throw new Error(`La respuesta de ${url} no es JSON`);
      }
    }
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
      // Igual se reintenta una vez (`reintentos400`): un 400 suelto no debe dar de baja una promo.
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
