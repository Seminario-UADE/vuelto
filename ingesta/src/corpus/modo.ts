/**
 * Cliente de la API pública de MODO (`docs/product/fuentes-promos.md`).
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

/** La URL pública del detalle de una promo. */
export const urlDetalle = (slug: string): string => `${BASE}${RUTA_DETALLE}/${encodeURIComponent(slug)}`;

export interface OpcionesMODO {
  fetch: typeof fetch;
  /** Pausa entre pedidos, en ms. Mínimo 1000. */
  pausaMs: number;
  esperar: (ms: number) => Promise<void>;
  /** Tope de páginas por categoría, por si el listado nunca termina. */
  maxPaginas?: number;
  /** Reintentos ante un error de servidor (5xx) o un corte de red. Por defecto 2. */
  reintentos?: number;
}

export interface ClienteMODO {
  /** Una página del listado de una categoría (id numérico: el slug devuelve 0). */
  listarPagina(categoria: number, pagina: number): Promise<unknown[]>;
  /** Todas las tarjetas de una categoría, página por página. */
  listarCategoria(categoria: number): Promise<unknown[]>;
  /** Detalle de una promo (legales, tope estructurado, bancos por id). `null` si no existe. */
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

  /** Un pedido. Un 5xx o un corte de red se reintentan (con la misma pausa); un 4xx no. */
  async function pedir(ruta: string): Promise<{ estado: number; cuerpo: unknown }> {
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
      if (respuesta.status === 404) return { estado: 404, cuerpo: null };
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

  async function listarPagina(categoria: number, pagina: number): Promise<unknown[]> {
    const ruta = `/slots?slots=web-modo-hub-mas-promos&categories=${categoria}&page=${pagina}&limit=${POR_PAGINA}`;
    const { cuerpo } = await pedir(ruta);
    const tarjetas = (cuerpo as { data?: { cards?: unknown } } | null)?.data?.cards;
    if (!Array.isArray(tarjetas)) throw new Error(`La respuesta de /slots (categoría ${categoria}, página ${pagina}) no trae data.cards`);
    return tarjetas;
  }

  return {
    listarPagina,

    async listarCategoria(categoria) {
      const todas: unknown[] = [];
      for (let pagina = 1; pagina <= maxPaginas; pagina++) {
        const tarjetas = await listarPagina(categoria, pagina);
        todas.push(...tarjetas);
        if (tarjetas.length < POR_PAGINA) return todas;
      }
      throw new Error(`El listado de la categoría ${categoria} pasó las ${maxPaginas} páginas sin terminar`);
    },

    async detalle(slug) {
      const { estado, cuerpo } = await pedir(`${RUTA_DETALLE}/${encodeURIComponent(slug)}`);
      return estado === 404 ? null : cuerpo;
    },

    async bancos() {
      const { cuerpo } = await pedir("/banks?source=app_modo");
      if (!Array.isArray(cuerpo)) throw new Error("El catálogo de bancos de MODO no es una lista");
      return cuerpo;
    },
  };
}
