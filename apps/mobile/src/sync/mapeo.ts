/**
 * De filas de Postgres a los tipos del motor (spec 009 FR-010, FR-012). Funciones puras: no inventan
 * nada (lo ausente es `null`, constitución §III) y devuelven `null` para una fila que no cumple el
 * contrato del motor, así la sincronización la cuenta y no la mezcla en el corpus.
 */
import { fechaArgentina } from "@vuelto/motor";
import type {
  CanalPromo,
  Compra,
  Dia,
  Jurisdiccion,
  OrigenCompra,
  Promocion,
  Red,
  Tope,
} from "@vuelto/motor";
import type { FilaCompra, FilaPromocion } from "./contratos";

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
const DIAS: readonly string[] = ["lun", "mar", "mie", "jue", "vie", "sab", "dom"] satisfies Dia[];
const JURISDICCIONES: readonly string[] = ["nacional", "pba", "caba", "otra_provincia"] satisfies Jurisdiccion[];
const CANALES: readonly string[] = ["presencial", "online", "ambos"] satisfies CanalPromo[];
const PERIODOS: readonly string[] = ["mensual", "semanal", "por_compra"] satisfies NonNullable<Tope["periodo"]>[];
const ALCANCES: readonly string[] = ["compartido", "exclusivo"] satisfies NonNullable<Tope["alcance"]>[];
const ORIGENES: readonly string[] = ["ticket", "excepcion", "manual"] satisfies OrigenCompra[];

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const DIA_MS = 86_400_000;

/** `"2026-11-01"` → `"2026-10-31"`. Aritmética de calendario en UTC, sin `Intl` (igual que el motor). */
export function diaAnterior(fecha: string): string {
  return new Date(Date.parse(`${fecha}T00:00:00Z`) - DIA_MS).toISOString().slice(0, 10);
}

/** `numeric` llega como texto o número; `null` si no es un número finito. */
function numero(x: number | string): number | null {
  if (typeof x === "string" && x.trim() === "") return null;
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

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

/** Una promo dada de baja queda vencida el día anterior a la baja (Argentina): FR-010, spec 009 US4. */
function conBaja(p: Promocion, dadaDeBajaEn: string | null): Promocion {
  if (dadaDeBajaEn === null) return p;
  const instante = Date.parse(dadaDeBajaEn);
  if (Number.isNaN(instante)) return p;
  const vencida = diaAnterior(fechaArgentina(new Date(instante)));
  return { ...p, vigencia: { ...p.vigencia, hasta: vencida < p.vigencia.hasta ? vencida : p.vigencia.hasta } };
}

/** Aplica la baja a una promo que ya estaba en el corpus (cuando la fila nueva no se pudo mapear). */
export function aplicarBaja(p: Promocion, dadaDeBajaEn: string): Promocion {
  return conBaja(p, dadaDeBajaEn);
}

/** `null` si la fila no cumple el contrato del motor. */
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

  return conBaja(
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

/** `null` si la fila no cumple el contrato del motor. */
export function filaACompra(f: FilaCompra): Compra | null {
  const monto = numero(f.monto);
  const descuento = numeroONull(f.descuento_obtenido);
  const reintegro = numeroONull(f.reintegro_esperado);
  if (monto === null || descuento === undefined || reintegro === undefined) return null;
  if (!ORIGENES.includes(f.origen) || !FECHA.test(f.fecha)) return null;
  return {
    id: f.id,
    fecha: f.fecha,
    monto,
    comercio: f.comercio,
    categoriaId: f.categoria_id,
    medioDePagoId: f.medio_de_pago_id,
    promocionId: f.promocion_id,
    descuentoObtenido: descuento,
    reintegroEsperado: reintegro,
    fechaAcreditacionEstimada: f.fecha_acreditacion_estimada,
    origen: f.origen as OrigenCompra,
    textoExtraido: f.texto_extraido,
  };
}
