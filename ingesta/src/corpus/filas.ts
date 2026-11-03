/**
 * La fila de la tabla `promociones` tal como la escribe la ingesta (`publicar.ts`).
 * El test de columnas avisa si `COLUMNAS_PROMOCION` no cuadra con `FilaPromocion`.
 */
import { idDePromocion } from "./ids.ts";
import type { PromocionIngestada } from "./tipos.ts";

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
  /** La captura de MODO de la que salieron los valores (obligatoria para `fuente = 'modo'`). */
  captura_cruda_id: string | null;
  dada_de_baja_en: string | null;
}

/** Lo que la ingesta escribe: siempre con su clave natural. */
export type FilaEscrita = FilaPromocion & { fuente_id: string };

export const COLUMNAS_PROMOCION = [
  "id", "fuente", "fuente_id", "titulo", "banco_id", "categoria_id", "comercio", "porcentaje",
  "debito_redes", "credito_redes", "vigencia_desde", "vigencia_hasta", "dias", "tope_monto",
  "tope_periodo", "tope_alcance", "grupo_tope_id", "monto_minimo", "jurisdiccion", "canal",
  "acumulable", "fragmentos_fuente", "captura_cruda_id", "dada_de_baja_en",
] as const satisfies readonly (keyof FilaPromocion)[];

export function aFila(e: PromocionIngestada, capturaCrudaId: string): FilaEscrita {
  return {
    id: idDePromocion(e.fuente, e.fuenteId),
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
    captura_cruda_id: capturaCrudaId,
    // Reescribir una promo la reactiva si había sido dada de baja.
    dada_de_baja_en: null,
  };
}

// ---------- Comparación con lo que ya hay en la base ----------

/**
 * El contenido de la promo: todo salvo el id, la clave natural, la baja y la captura. Una
 * captura nueva con los mismos valores no reescribe la fila: así no se mueve
 * `actualizada_en` y la app no vuelve a bajar una promo que no cambió.
 */
export const CAMPOS_COMPARABLES = COLUMNAS_PROMOCION.filter(
  (c) => c !== "id" && c !== "fuente" && c !== "fuente_id" && c !== "captura_cruda_id" && c !== "dada_de_baja_en",
);

const CAMPOS_NUMERICOS: readonly string[] = ["porcentaje", "tope_monto", "monto_minimo"];

/** JSON con las claves ordenadas, sin espacios: `jsonb` no conserva el orden de las claves. */
export function jsonOrdenado(objeto: Record<string, string | null>): string {
  const ordenado: Record<string, string | null> = {};
  for (const clave of Object.keys(objeto).sort()) ordenado[clave] = objeto[clave] ?? null;
  return JSON.stringify(ordenado);
}

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
