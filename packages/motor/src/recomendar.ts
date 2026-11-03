/**
 * Recomienda con qué medio de pago conviene pagar una compra (issue #36).
 * Función pura: todo lo que varía entra por parámetro, incluido `ahora`
 * (constitución §II). Contrato: `specs/002-motor-recomendar/contracts/`.
 */
import { aCentavos, aCentesimosDePunto, aPesos, aplicarPorcentaje } from "./dinero.ts";
import { mediosCompatibles, primeraReglaQueFalla, type ContextoDeCompra } from "./elegibilidad.ts";
import { PerfilSinMediosError } from "./errores.ts";
import { diaArgentina, fechaArgentina } from "./fecha.ts";
import { motivoCombinado, motivoDescarte, motivoOpcion, type TopeTrasCompra } from "./motivos.ts";
import { compararIds } from "./orden.ts";
import { calcularSaldos, clasificarTope, type Saldo } from "./tope.ts";
import type {
  CausaDescarte,
  Compra,
  CompraPropuesta,
  Descarte,
  FechaISO,
  MedioDePago,
  OpcionDePago,
  Perfil,
  Promocion,
  Recomendacion,
} from "./tipos.ts";

function idsDePromos(o: OpcionDePago): string[] {
  return o.promociones.map((p) => p.promocionId).sort(compararIds);
}

/** Elemento por elemento; si una lista es prefijo de la otra, va primero la más corta. */
function compararListasDeIds(a: string[], b: string[]): number {
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    const r = compararIds(a[i] ?? "", b[i] ?? "");
    if (r !== 0) return r;
  }
  return a.length - b.length;
}

/** Una opción armada, con lo que hace falta para ordenarla sin monto. */
interface Candidata {
  opcion: OpcionDePago;
  /** Suma de los porcentajes de sus promos, en centésimos de punto. */
  porcentaje: number;
  /** En centavos; `Infinity` si alguna promo no informa tope. */
  topeDisponible: number;
}

/** Mayor primero, sin restar: `Infinity - Infinity` daría `NaN`. */
function mayorPrimero(a: number, b: number): number {
  return a === b ? 0 : a > b ? -1 : 1;
}

/**
 * Con monto: mayor ahorro. Sin monto el ahorro es 0 en todas, así que va
 * mayor porcentaje y después mayor tope disponible (issue #75). En los dos
 * casos se desempata por medio y por promo, comparando por código.
 */
function compararCandidatas(a: Candidata, b: Candidata, sinMonto: boolean): number {
  return (
    b.opcion.ahorroEstimado - a.opcion.ahorroEstimado ||
    (sinMonto
      ? mayorPrimero(a.porcentaje, b.porcentaje) || mayorPrimero(a.topeDisponible, b.topeDisponible)
      : 0) ||
    compararIds(a.opcion.medioDePagoId, b.opcion.medioDePagoId) ||
    compararListasDeIds(idsDePromos(a.opcion), idsDePromos(b.opcion))
  );
}

/** Lo que el usuario puede llegar a recibir con la opción: cada saldo compartido cuenta una vez. */
function topeDisponible(grupo: PromoAplicable[]): number {
  const contados = new Set<Saldo>();
  let total = 0;
  for (const a of grupo) {
    if (a.saldo) {
      if (!contados.has(a.saldo)) total += a.saldo.restante;
      contados.add(a.saldo);
    } else if (a.topePorCompra !== null) {
      total += a.topePorCompra;
    } else {
      return Infinity;
    }
  }
  return total;
}

/** Una promo que pasó todas las reglas y le queda tope. */
interface PromoAplicable {
  promo: Promocion;
  medios: MedioDePago[];
  /** `null` = sin saldo: no informa tope o es por compra. */
  saldo: Saldo | null;
  /** En centavos, solo si el tope es por compra. */
  topePorCompra: number | null;
  /** Monto por porcentaje, sin ningún tope, en centavos. 0 si la compra no tiene monto. */
  ahorroSinTope: number;
}

/**
 * Arma una opción con una o varias promos del mismo medio. Las promos se
 * reparten el saldo en orden de ahorro sin tope y luego por id, así ninguna
 * combinación supera el restante de un saldo (FR-010).
 */
function armarOpcion(
  medio: MedioDePago,
  grupo: PromoAplicable[],
  fecha: FechaISO,
  sinMonto: boolean,
): Candidata {
  const ordenadas = [...grupo].sort(
    (a, b) => b.ahorroSinTope - a.ahorroSinTope || compararIds(a.promo.id, b.promo.id),
  );
  const restantes = new Map<Saldo, number>();
  // Las que quedan en $0 porque otra promo de esta misma opción agotó el saldo (FR-010).
  const sinSaldo = new Set<string>();
  const ahorros = ordenadas.map((a) => {
    const limite = a.saldo ? (restantes.get(a.saldo) ?? a.saldo.restante) : a.topePorCompra;
    const ahorro = limite === null ? a.ahorroSinTope : Math.min(a.ahorroSinTope, limite);
    if (a.saldo && limite !== null) {
      if (limite === 0 && restantes.has(a.saldo)) sinSaldo.add(a.promo.id);
      restantes.set(a.saldo, limite - ahorro);
    }
    return ahorro;
  });
  // Las que comparten saldo informan el mismo restante final (FR-012).
  const topes = ordenadas.map((a): TopeTrasCompra | null =>
    a.saldo ? { restante: restantes.get(a.saldo) ?? a.saldo.restante, saldo: a.saldo, fecha } : null,
  );
  const promociones = ordenadas.map((a, i) => {
    const tope = topes[i] ?? null;
    return {
      promocionId: a.promo.id,
      ahorroEstimado: aPesos(ahorros[i] ?? 0),
      topeRestanteTrasCompra: tope ? aPesos(tope.restante) : null,
      base: a.saldo ? a.saldo.base : null,
    };
  });
  const opcion: OpcionDePago = {
    medioDePagoId: medio.id,
    ahorroEstimado: aPesos(ahorros.reduce((t, x) => t + x, 0)),
    promociones,
    motivo:
      ordenadas.length === 1 && ordenadas[0]
        ? motivoOpcion(ordenadas[0].promo, topes[0] ?? null, sinMonto)
        : motivoCombinado(
            ordenadas.map((a, i) => ({ promo: a.promo, tope: topes[i] ?? null, sinSaldo: sinSaldo.has(a.promo.id) })),
            sinMonto,
          ),
  };
  return {
    opcion,
    porcentaje: ordenadas.reduce((t, a) => t + aCentesimosDePunto(a.promo.porcentaje), 0),
    topeDisponible: topeDisponible(ordenadas),
  };
}

export function recomendar(
  compra: CompraPropuesta,
  perfil: Perfil,
  promociones: Promocion[],
  comprasDelPeriodo: Compra[],
  ahora: Date,
): Recomendacion {
  if (perfil.mediosDePago.length === 0) throw new PerfilSinMediosError();

  const ctx: ContextoDeCompra = { compra, fecha: fechaArgentina(ahora), dia: diaArgentina(ahora) };
  // Sin monto (issue #75): ahorro 0 y el tope tras la compra es el disponible.
  const sinMonto = compra.monto === null;
  const montoCentavos = compra.monto === null ? 0 : aCentavos(compra.monto);
  const aplicables: PromoAplicable[] = [];
  const descartadas: Descarte[] = [];
  const saldos = calcularSaldos(promociones, comprasDelPeriodo, ctx.fecha);

  for (const promo of promociones) {
    const medios = mediosCompatibles(promo, perfil.mediosDePago);
    // Los medios del usuario a los que aplicaba, para el "¿por qué no X?" de la pantalla.
    const mediosDePagoIds = medios.map((m) => m.id).sort(compararIds);
    const descartar = (causa: CausaDescarte, saldo: Saldo | null) =>
      descartadas.push({
        promocionId: promo.id,
        causa,
        mediosDePagoIds,
        base: saldo ? saldo.base : null,
        motivo: motivoDescarte(causa, promo, ctx, saldo),
      });

    const causa = primeraReglaQueFalla(promo, ctx) ?? (medios.length === 0 ? "medio_de_pago" : null);
    if (causa !== null) {
      descartar(causa, null);
      continue;
    }
    // El tope es de la promo, no del medio.
    const saldo = saldos.get(promo.id);
    const clase = clasificarTope(promo);
    const topePorCompra = clase.tipo === "por_compra" ? clase.monto : null;
    if (saldo?.restante === 0) {
      // Un tope agotado también es un estimado: lleva su base (constitución §V).
      descartar("tope_agotado", saldo);
      continue;
    }
    if (topePorCompra === 0) {
      // Sin compras que sostengan un saldo: la única excepción sin base (FR-015).
      descartar("tope_agotado", null);
      continue;
    }
    aplicables.push({
      promo,
      medios,
      saldo: saldo ?? null,
      topePorCompra,
      ahorroSinTope: aplicarPorcentaje(montoCentavos, aCentesimosDePunto(promo.porcentaje)),
    });
  }

  // Por medio: las acumulables (=== true) juntas si son dos o más; las demás, solas (FR-008).
  const candidatas: Candidata[] = [];
  const armar = (medio: MedioDePago, grupo: PromoAplicable[]) =>
    candidatas.push(armarOpcion(medio, grupo, ctx.fecha, sinMonto));
  for (const medio of perfil.mediosDePago) {
    const delMedio = aplicables.filter((a) => a.medios.includes(medio));
    const acumulables = delMedio.filter((a) => a.promo.acumulable === true);
    if (acumulables.length >= 2) {
      armar(medio, acumulables);
      for (const a of delMedio) if (a.promo.acumulable !== true) armar(medio, [a]);
    } else {
      for (const a of delMedio) armar(medio, [a]);
    }
  }

  candidatas.sort((a, b) => compararCandidatas(a, b, sinMonto));
  const opciones = candidatas.map((c) => c.opcion);
  descartadas.sort((a, b) => compararIds(a.promocionId, b.promocionId));
  const [mejor = null, ...alternativas] = opciones;
  return { mejor, alternativas, descartadas };
}
