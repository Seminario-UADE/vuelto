/**
 * La sugerencia del comercio del catálogo en «Revisá tu compra» (spec 015, issue #134).
 * Funciones puras y determinísticas, sin red ni modelos de lenguaje (FR-003): el catálogo, el
 * nombre y el texto del ticket entran por parámetro. Nunca eligen: solo proponen (FR-004).
 */
import { claveDeComercio, esComercioDeRubro } from "./comercios";
import type { Comercio } from "./contracts";

/** Formas societarias y palabras de sucursal que no dicen qué comercio es (spec 015, Definiciones). */
const PALABRAS_QUE_SOBRAN = new Set(["sa", "srl", "sas", "cicsa", "saciei", "sacifi", "sacif", "sau", "suc", "sucursal"]);

/** Parecido mínimo para sugerir por escritura (research R1, ajustado con la lista de R2). */
export const UMBRAL_PARECIDO = 0.8;

/**
 * El nombre sin formas societarias, sucursal, dígitos, tildes, mayúsculas ni puntuación. Solo
 * para encontrar sugerencias: si coincide exacto se decide con `claveDeComercio`, como hoy.
 */
export function nombreLimpio(nombre: string): string {
  const palabras = nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    // «s.a.», «c.i.c.s.a.», «s.a.c.i.e.i.»: letras sueltas con punto, juntas en una palabra.
    .replace(/(?:\b[a-z]\.\s*){2,}/g, (m) => ` ${m.replace(/[.\s]/g, "")} `)
    .replace(/\d+/g, " ")
    .replace(/[^a-z]+/g, " ")
    .trim()
    .split(" ")
    .filter((p) => p !== "");
  // «S A»: dos o más letras sueltas seguidas también son una sigla.
  const juntas: string[] = [];
  for (let i = 0; i < palabras.length; i++) {
    let p = palabras[i] as string;
    while (p.length === 1 && (palabras[i + 1]?.length ?? 0) === 1 && i + 1 < palabras.length) {
      p += palabras[++i];
    }
    juntas.push(p);
  }
  return juntas.filter((p) => !PALABRAS_QUE_SOBRAN.has(p)).join(" ");
}

/**
 * Cuánto se parecen dos textos, de 0 a 1: `1 - diferencias / largo del más largo`, donde una
 * diferencia es una letra de más, de menos, cambiada o dos vecinas invertidas
 * (Damerau-Levenshtein restringida).
 */
export function parecido(a: string, b: string): number {
  const largo = Math.max(a.length, b.length);
  if (largo === 0) return 1;
  let antes = new Array<number>(b.length + 1).fill(0);
  let fila = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const nueva = [i];
    for (let j = 1; j <= b.length; j++) {
      const costo = a[i - 1] === b[j - 1] ? 0 : 1;
      let d = Math.min((fila[j] as number) + 1, (nueva[j - 1] as number) + 1, (fila[j - 1] as number) + costo);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d = Math.min(d, (antes[j - 2] as number) + 1);
      nueva.push(d);
    }
    antes = fila;
    fila = nueva;
  }
  return 1 - (fila[b.length] as number) / largo;
}

export type OrigenSugerencia = "texto_del_ticket" | "contenido" | "parecido";

/** Un comercio del catálogo propuesto para la compra; nunca una elección (spec 015, data-model). */
export type SugerenciaComercio = { comercio: Comercio; origen: OrigenSugerencia };

export type ResultadoSugerencia =
  | { tipo: "coincide"; comercio: Comercio }
  | { tipo: "elegir_rubro"; opciones: Comercio[] }
  | { tipo: "sugerencias"; titulo: "no_encontrado" | "es_alguno"; sugerencias: SugerenciaComercio[] }
  | { tipo: "nada" };

const MAXIMO_SUGERENCIAS = 3;
/** Los nombres de hasta 3 letras solo cuentan en el texto del ticket si ocupan una línea entera. */
const LARGO_CORTO = 3;
/** Más cortos que esto, no se comparan por parecido: solo por contenido. */
const LARGO_MINIMO_PARECIDO = 4;

type ComercioLimpio = { comercio: Comercio; clave: string; palabras: string[]; junto: string };

type CatalogoLimpio = {
  lista: ComercioLimpio[];
  /** Por su primera palabra, para buscar en el texto del ticket sin recorrer todo el catálogo. */
  porPrimeraPalabra: Map<string, ComercioLimpio[]>;
};

/** El catálogo limpio, sin los rubros (FR-013); se limpia una vez por catálogo (research R5). */
const limpios = new WeakMap<readonly Comercio[], CatalogoLimpio>();
function catalogoLimpio(catalogo: readonly Comercio[]): CatalogoLimpio {
  const guardado = limpios.get(catalogo);
  if (guardado) return guardado;
  const lista = catalogo.flatMap((comercio) => {
    if (esComercioDeRubro(comercio)) return [];
    const limpio = nombreLimpio(comercio.nombre);
    return limpio === ""
      ? []
      : [{ comercio, clave: claveDeComercio(comercio.nombre), palabras: limpio.split(" "), junto: limpio.replace(/ /g, "") }];
  });
  const porPrimeraPalabra = new Map<string, ComercioLimpio[]>();
  for (const c of lista) {
    const primera = c.palabras[0] as string;
    porPrimeraPalabra.set(primera, [...(porPrimeraPalabra.get(primera) ?? []), c]);
  }
  const limpio = { lista, porPrimeraPalabra };
  limpios.set(catalogo, limpio);
  return limpio;
}

/** Dónde empiezan `buscadas`, seguidas, dentro de `palabras`; -1 si no están. */
function posicion(palabras: readonly string[], buscadas: readonly string[]): number {
  for (let i = 0; i + buscadas.length <= palabras.length; i++) {
    if (buscadas.every((b, j) => palabras[i + j] === b)) return i;
  }
  return -1;
}

/** El mejor parecido entre el nombre del catálogo y lo leído entero o un tramo de sus palabras. */
function mejorParecido(c: ComercioLimpio, palabras: readonly string[]): number {
  let mejor = 0;
  for (let i = 0; i < palabras.length; i++) {
    let tramo = "";
    for (let j = i; j < palabras.length; j++) {
      tramo += palabras[j];
      if (tramo.length > c.junto.length * 2) break;
      // El mejor parecido posible con esta diferencia de largo; si no llega al umbral, no se compara letra por letra.
      if (1 - Math.abs(tramo.length - c.junto.length) / Math.max(tramo.length, c.junto.length) < UMBRAL_PARECIDO) continue;
      mejor = Math.max(mejor, parecido(tramo, c.junto));
    }
  }
  return mejor;
}

/** Los del catálogo nombrados en el texto del ticket, en el orden en que aparecen (research R4). */
function delTexto(texto: string, catalogo: CatalogoLimpio): Comercio[] {
  const encontrados: Comercio[] = [];
  for (const linea of texto.split("\n")) {
    const limpia = nombreLimpio(linea);
    if (limpia === "") continue;
    const palabras = limpia.split(" ");
    palabras.forEach((palabra, i) => {
      for (const c of catalogo.porPrimeraPalabra.get(palabra) ?? []) {
        const esta =
          c.junto.length <= LARGO_CORTO ? limpia === c.palabras.join(" ") : c.palabras.every((p, j) => palabras[i + j] === p);
        if (esta && !encontrados.includes(c.comercio)) encontrados.push(c.comercio);
      }
    });
  }
  return encontrados;
}

/**
 * Qué mostrar debajo del campo «Comercio» de «Revisá tu compra» (spec 015, FR-001, FR-002,
 * FR-006, FR-011). Las sugerencias salen, en orden y sin repetir, del texto del ticket, de los
 * nombres contenidos en lo leído y de los parecidos. `categoriaConocida`: el rubro que ya se
 * sabe (compra por confirmar, recomendación o una sugerencia elegida).
 */
export function sugerirComercio({
  nombre,
  textoTicket,
  catalogo,
  categoriaConocida,
}: {
  nombre: string;
  textoTicket: string | null;
  catalogo: readonly Comercio[];
  categoriaConocida: number | null;
}): ResultadoSugerencia {
  const limpio = catalogoLimpio(catalogo);
  const limpiosDelCatalogo = limpio.lista;
  const clave = claveDeComercio(nombre);

  if (clave !== "") {
    const mismos = limpiosDelCatalogo
      .filter((c) => c.clave === clave)
      .map((c) => c.comercio)
      .sort((a, b) => (a.categoriaId ?? 0) - (b.categoriaId ?? 0));
    const delRubro = categoriaConocida === null ? undefined : mismos.find((c) => c.categoriaId === categoriaConocida);
    if (delRubro) return { tipo: "coincide", comercio: delRubro };
    const [unico] = mismos;
    if (mismos.length === 1 && unico) return { tipo: "coincide", comercio: unico };
    if (mismos.length > 1) return { tipo: "elegir_rubro", opciones: mismos };
  }

  const sugerencias: SugerenciaComercio[] = [];
  const sumar = (comercio: Comercio, origen: OrigenSugerencia) => {
    if (sugerencias.length < MAXIMO_SUGERENCIAS && !sugerencias.some((s) => s.comercio.id === comercio.id)) {
      sugerencias.push({ comercio, origen });
    }
  };

  if (textoTicket !== null) for (const c of delTexto(textoTicket, limpio)) sumar(c, "texto_del_ticket");

  const leido = nombreLimpio(nombre);
  const palabras = leido === "" ? [] : leido.split(" ");
  if (palabras.length > 0) {
    limpiosDelCatalogo
      .map((c) => ({ c, pos: posicion(palabras, c.palabras) }))
      .filter((x) => x.pos >= 0)
      .sort((a, b) => a.pos - b.pos)
      .forEach((x) => sumar(x.c.comercio, "contenido"));

    limpiosDelCatalogo
      .filter((c) => c.junto.length >= LARGO_MINIMO_PARECIDO)
      .map((c) => ({ c, puntaje: mejorParecido(c, palabras) }))
      .filter((x) => x.puntaje >= UMBRAL_PARECIDO)
      .sort((a, b) => b.puntaje - a.puntaje)
      .forEach((x) => sumar(x.c.comercio, "parecido"));
  }

  if (clave === "") return sugerencias.length > 0 ? { tipo: "sugerencias", titulo: "es_alguno", sugerencias } : { tipo: "nada" };
  return { tipo: "sugerencias", titulo: "no_encontrado", sugerencias };
}

/**
 * «Buscar otro comercio» (spec 015, FR-007): primero los que contienen lo escrito en su nombre
 * («jum» encuentra «Jumbo»), después los parecidos que superan el umbral. Nunca un rubro sin
 * comercio (FR-013).
 */
export function buscarEnCatalogo(catalogo: readonly Comercio[], texto: string, limite: number): Comercio[] {
  const buscado = claveDeComercio(texto);
  if (buscado === "") return [];
  const { lista } = catalogoLimpio(catalogo);
  const resultados = lista.filter((c) => c.clave.includes(buscado)).map((c) => c.comercio);
  const leido = nombreLimpio(texto);
  if (leido !== "") {
    const palabras = leido.split(" ");
    lista
      .filter((c) => c.junto.length >= LARGO_MINIMO_PARECIDO && !resultados.includes(c.comercio))
      .map((c) => ({ c, puntaje: mejorParecido(c, palabras) }))
      .filter((x) => x.puntaje >= UMBRAL_PARECIDO)
      .sort((a, b) => b.puntaje - a.puntaje)
      .forEach((x) => resultados.push(x.c.comercio));
  }
  return resultados.slice(0, limite);
}
