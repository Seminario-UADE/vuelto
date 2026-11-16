/**
 * De filas de Postgres a los tipos del motor, en la capa imperativa (ADR-009). Funciones puras:
 * lo ausente es `null` (constitución §III) y una fila que no cumple el contrato del motor devuelve
 * `null`, para descartarla en vez de evaluarla rota.
 *
 * El mapeo de promociones repite el de `apps/mobile/src/sync/mapeo.ts`: vive en otro workspace y
 * otro runtime (Deno), y mover el mapeo al motor le metería la forma de las filas al núcleo. Es
 * deuda conocida (spec 016, plan §Complexity Tracking).
 */
import { fechaArgentina } from "@vuelto/motor";
import type {
  CanalPromo,
  Compra,
  ConsumoDeTope,
  Dia,
  Jurisdiccion,
  MedioDePago,
  OrigenCompra,
  Promocion,
  Red,
  TipoTarjeta,
  Tope,
} from "@vuelto/motor";

/** Una fila de `public.promociones` (las columnas que usa el motor). */
export interface FilaPromocion {
  id: string;
  fuente: string;
  titulo: string;
  banco_id: string;
  categoria_id: number;
  comercio: string | null;
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
  dada_de_baja_en: string | null;
}

export const COLUMNAS_PROMOCION =
  "id, fuente, titulo, banco_id, categoria_id, comercio, porcentaje, debito_redes, credito_redes, " +
  "vigencia_desde, vigencia_hasta, dias, tope_monto, tope_periodo, tope_alcance, grupo_tope_id, " +
  "monto_minimo, jurisdiccion, canal, acumulable, dada_de_baja_en";

/** Una fila de `public.medios_de_pago`, o un medio de `datos_de_contactos` (con el nombre del banco). */
export interface FilaMedio {
  id: string;
  banco_id: string;
  tipo: string;
  red: string;
  banco_nombre?: string | null;
}

/** Un consumo de `datos_de_contactos`: compra reducida a promoción, fecha, monto y descuento (D4). */
export interface FilaConsumo {
  promocion_id: string | null;
  fecha: string;
  monto: number | string;
  descuento_obtenido: number | string | null;
}

/** Una fila de `public.compras` de quien pide (la lee con su sesión, por RLS). */
export interface FilaCompra extends FilaConsumo {
  id: string;
  comercio: string;
  categoria_id: number | null;
  medio_de_pago_id: string;
  reintegro_esperado: number | string | null;
  fecha_acreditacion_estimada: string | null;
  origen: string;
  texto_extraido: string | null;
}

const REDES: readonly string[] = [
  "visa",
  "master",
  "american_express",
  "dinners_club",
  "maestro",
  "cabal",
  "naranja",
  "confiable",
  "tarjeta_sol",
] satisfies Red[];
const TIPOS: readonly string[] = ["debito", "credito"] satisfies TipoTarjeta[];
const DIAS: readonly string[] = ["lun", "mar", "mie", "jue", "vie", "sab", "dom"] satisfies Dia[];
const JURISDICCIONES: readonly string[] = ["nacional", "pba", "caba", "otra_provincia"] satisfies Jurisdiccion[];
const CANALES: readonly string[] = ["presencial", "online", "ambos"] satisfies CanalPromo[];
const PERIODOS: readonly string[] = ["mensual", "semanal", "por_compra"] satisfies NonNullable<Tope["periodo"]>[];
const ALCANCES: readonly string[] = ["compartido", "exclusivo"] satisfies NonNullable<Tope["alcance"]>[];
const ORIGENES: readonly string[] = ["ticket", "excepcion", "manual"] satisfies OrigenCompra[];

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const DIA_MS = 86_400_000;

/** `numeric` llega como texto o número; `null` si no es un número finito. */
function numero(x: number | string): number | null {
  if (typeof x === "string" && x.trim() === "") return null;
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

/** `undefined` = inválido; `null` = ausente. */
function numeroONull(x: number | string | null): number | null | undefined {
  if (x === null) return null;
  return numero(x) ?? undefined;
}

function enLista<T extends string>(valor: string | null, lista: readonly string[]): T | null | undefined {
  if (valor === null) return null;
  return lista.includes(valor) ? (valor as T) : undefined;
}

function todasConocidas(valores: string[], lista: readonly string[]): boolean {
  return valores.every((v) => lista.includes(v));
}

function diaAnterior(fecha: string): string {
  return new Date(Date.parse(`${fecha}T00:00:00Z`) - DIA_MS).toISOString().slice(0, 10);
}

/** Una promo dada de baja queda vencida el día anterior a la baja (Argentina), como en la app. */
function aplicarBaja(p: Promocion, dadaDeBajaEn: string | null): Promocion {
  if (dadaDeBajaEn === null || p.vigencia.hasta === null) return p;
  const instante = Date.parse(dadaDeBajaEn);
  if (Number.isNaN(instante)) return p;
  const vencida = diaAnterior(fechaArgentina(new Date(instante)));
  return { ...p, vigencia: { ...p.vigencia, hasta: vencida < p.vigencia.hasta ? vencida : p.vigencia.hasta } };
}

export function filaAPromocion(f: FilaPromocion): Promocion | null {
  const porcentaje = numero(f.porcentaje);
  const topeMonto = numeroONull(f.tope_monto);
  const montoMinimo = numeroONull(f.monto_minimo);
  const jurisdiccion = enLista<Jurisdiccion>(f.jurisdiccion, JURISDICCIONES);
  const canal = enLista<CanalPromo>(f.canal, CANALES);
  const periodo = enLista<NonNullable<Tope["periodo"]>>(f.tope_periodo, PERIODOS);
  const alcance = enLista<NonNullable<Tope["alcance"]>>(f.tope_alcance, ALCANCES);
  const ok =
    porcentaje !== null &&
    porcentaje >= 0 &&
    porcentaje <= 100 &&
    topeMonto !== undefined &&
    montoMinimo !== undefined &&
    jurisdiccion !== undefined &&
    canal !== undefined &&
    periodo !== undefined &&
    alcance !== undefined &&
    FECHA.test(f.vigencia_desde) &&
    FECHA.test(f.vigencia_hasta) &&
    todasConocidas(f.debito_redes, REDES) &&
    todasConocidas(f.credito_redes, REDES) &&
    (f.dias === null || todasConocidas(f.dias, DIAS));
  if (!ok) return null;
  return aplicarBaja(
    {
      id: f.id,
      fuente: f.fuente === "modo" ? "modo" : "manual",
      titulo: f.titulo,
      bancoId: f.banco_id,
      categoriaId: f.categoria_id,
      comercio: f.comercio,
      porcentaje,
      tarjetas: { debito: f.debito_redes as Red[], credito: f.credito_redes as Red[] },
      vigencia: { desde: f.vigencia_desde, hasta: f.vigencia_hasta, dias: f.dias as Dia[] | null },
      tope: { monto: topeMonto, periodo, alcance, grupoTopeId: f.grupo_tope_id },
      montoMinimo,
      jurisdiccion,
      canal,
      acumulable: f.acumulable,
    },
    f.dada_de_baja_en,
  );
}

export function filaAMedio(f: FilaMedio): MedioDePago | null {
  if (!TIPOS.includes(f.tipo) || !REDES.includes(f.red)) return null;
  return { id: f.id, bancoId: f.banco_id, tipo: f.tipo as TipoTarjeta, red: f.red as Red };
}

/** `id` lo arma quien llama: para un contacto es opaco, nunca el de la base (research R6). */
export function filaAConsumo(f: FilaConsumo, id: string): ConsumoDeTope | null {
  const monto = numero(f.monto);
  const descuento = numeroONull(f.descuento_obtenido);
  if (monto === null || descuento === undefined || !FECHA.test(f.fecha)) return null;
  return { id, promocionId: f.promocion_id, fecha: f.fecha, monto, descuentoObtenido: descuento };
}

export function filaACompra(f: FilaCompra): Compra | null {
  const consumo = filaAConsumo(f, f.id);
  const reintegro = numeroONull(f.reintegro_esperado);
  if (consumo === null || reintegro === undefined || !ORIGENES.includes(f.origen)) return null;
  return {
    ...consumo,
    comercio: f.comercio,
    categoriaId: f.categoria_id,
    medioDePagoId: f.medio_de_pago_id,
    reintegroEsperado: reintegro,
    fechaAcreditacionEstimada: f.fecha_acreditacion_estimada,
    origen: f.origen as OrigenCompra,
    textoExtraido: f.texto_extraido,
  };
}
