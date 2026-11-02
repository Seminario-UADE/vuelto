/**
 * La fila de la tabla `promociones` tal como la escribe el corpus: una sola fuente de
 * verdad para el SQL de reinicio (`generar.ts`) y la carga remota (`cargar.ts`).
 * Si se agrega una columna a `FilaPromocion`, `valoresSql` deja de compilar hasta
 * que se decida cómo se escribe, y el test de columnas avisa si la lista no cuadra.
 */
import { idDePromocion } from "./ids.ts";
import { FUENTE_CORPUS } from "./tipos.ts";
import type { EntradaCorpus } from "./tipos.ts";

/** Una fila de `promociones`, como se escribe y como se lee. */
export interface FilaPromocion {
  id: string;
  fuente: string;
  fuente_id: string | null;
  titulo: string;
  banco_id: string;
  categoria_id: number;
  comercio: string | null;
  /** `numeric` puede volver como texto ("20.00"). */
  porcentaje: number | string;
  debito_redes: string[];
  credito_redes: string[];
  vigencia_desde: string;
  vigencia_hasta: string;
  dias: string[] | null;
  tope_monto: number | string | null;
  tope_periodo: string | null;
  tope_alcance: string | null;
  grupo_tope_id: string | null;
  monto_minimo: number | string | null;
  jurisdiccion: string | null;
  canal: string | null;
  acumulable: boolean | null;
  fragmentos_fuente: Record<string, string | null>;
  dada_de_baja_en: string | null;
}

/** Lo que el corpus escribe: siempre con su clave natural. */
export type FilaEscrita = FilaPromocion & { fuente_id: string };

export const COLUMNAS_PROMOCION = [
  "id", "fuente", "fuente_id", "titulo", "banco_id", "categoria_id", "comercio", "porcentaje",
  "debito_redes", "credito_redes", "vigencia_desde", "vigencia_hasta", "dias", "tope_monto",
  "tope_periodo", "tope_alcance", "grupo_tope_id", "monto_minimo", "jurisdiccion", "canal",
  "acumulable", "fragmentos_fuente", "dada_de_baja_en",
] as const satisfies readonly (keyof FilaPromocion)[];

export function aFila(e: EntradaCorpus): FilaEscrita {
  return {
    id: idDePromocion(FUENTE_CORPUS, e.fuenteId),
    fuente: e.fuente,
    fuente_id: e.fuenteId,
    titulo: e.titulo,
    banco_id: e.bancoId,
    categoria_id: e.categoriaId,
    comercio: e.comercio,
    porcentaje: e.porcentaje,
    debito_redes: e.tarjetas.debito,
    credito_redes: e.tarjetas.credito,
    vigencia_desde: e.vigencia.desde,
    vigencia_hasta: e.vigencia.hasta,
    dias: e.vigencia.dias,
    tope_monto: e.tope.monto,
    tope_periodo: e.tope.periodo,
    tope_alcance: e.tope.alcance,
    grupo_tope_id: e.tope.grupoTopeId,
    monto_minimo: e.montoMinimo,
    jurisdiccion: e.jurisdiccion,
    canal: e.canal,
    acumulable: e.acumulable,
    fragmentos_fuente: e.fragmentosFuente,
    // Reescribir una promo la reactiva si había sido dada de baja.
    dada_de_baja_en: null,
  };
}

// ---------- SQL ----------

export const sqlTexto = (s: string): string => `'${s.replace(/'/g, "''")}'`;
const sqlNulo = <T>(x: T | null, f: (v: T) => string): string => (x === null ? "null" : f(x));
const sqlListaTexto = (xs: readonly string[]): string =>
  xs.length === 0 ? "'{}'::text[]" : `array[${xs.map(sqlTexto).join(",")}]::text[]`;
const sqlNumero = (n: number | string): string => String(n);

/** JSON con las claves ordenadas, sin espacios: forma estable para `jsonb`. */
function jsonOrdenado(objeto: Record<string, string | null>): string {
  const ordenado: Record<string, string | null> = {};
  for (const clave of Object.keys(objeto).sort()) ordenado[clave] = objeto[clave] ?? null;
  return JSON.stringify(ordenado);
}

/** El literal de Postgres de cada columna. Es un `Record`: no compila si falta una columna. */
export function valoresSql(f: FilaPromocion): Record<(typeof COLUMNAS_PROMOCION)[number], string> {
  return {
    id: sqlTexto(f.id),
    fuente: sqlTexto(f.fuente),
    fuente_id: sqlNulo(f.fuente_id, sqlTexto),
    titulo: sqlTexto(f.titulo),
    banco_id: sqlTexto(f.banco_id),
    categoria_id: sqlNumero(f.categoria_id),
    comercio: sqlNulo(f.comercio, sqlTexto),
    porcentaje: sqlNumero(f.porcentaje),
    debito_redes: sqlListaTexto(f.debito_redes),
    credito_redes: sqlListaTexto(f.credito_redes),
    vigencia_desde: `${sqlTexto(f.vigencia_desde)}::date`,
    vigencia_hasta: `${sqlTexto(f.vigencia_hasta)}::date`,
    dias: sqlNulo(f.dias, sqlListaTexto),
    tope_monto: sqlNulo(f.tope_monto, sqlNumero),
    tope_periodo: sqlNulo(f.tope_periodo, sqlTexto),
    tope_alcance: sqlNulo(f.tope_alcance, sqlTexto),
    grupo_tope_id: sqlNulo(f.grupo_tope_id, sqlTexto),
    monto_minimo: sqlNulo(f.monto_minimo, sqlNumero),
    jurisdiccion: sqlNulo(f.jurisdiccion, sqlTexto),
    canal: sqlNulo(f.canal, sqlTexto),
    acumulable: sqlNulo(f.acumulable, String),
    fragmentos_fuente: `${sqlTexto(jsonOrdenado(f.fragmentos_fuente))}::jsonb`,
    dada_de_baja_en: sqlNulo(f.dada_de_baja_en, sqlTexto),
  };
}

// ---------- Comparación con lo que ya hay en la base ----------

/** El contenido de la promo: todo salvo el id, la clave natural y la baja. */
export const CAMPOS_COMPARABLES = COLUMNAS_PROMOCION.filter(
  (c) => c !== "id" && c !== "fuente" && c !== "fuente_id" && c !== "dada_de_baja_en",
);

const CAMPOS_NUMERICOS: readonly string[] = ["porcentaje", "tope_monto", "monto_minimo"];

/** Forma comparable de una fila: los `numeric` como número y las claves de los fragmentos ordenadas. */
export function comparable(f: FilaPromocion): string {
  return JSON.stringify(
    CAMPOS_COMPARABLES.map((campo) => {
      const valor = f[campo];
      if (CAMPOS_NUMERICOS.includes(campo)) return valor === null ? null : Number(valor);
      if (campo === "fragmentos_fuente") return jsonOrdenado(f.fragmentos_fuente);
      return valor;
    }),
  );
}
