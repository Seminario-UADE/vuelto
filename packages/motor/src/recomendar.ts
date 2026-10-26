/**
 * Recomienda con qué medio de pago conviene pagar una compra (issue #36).
 * Función pura: todo lo que varía entra por parámetro, incluido `ahora`
 * (constitución §II). Contrato: `specs/002-motor-recomendar/contracts/`.
 */
import { aCentavos, aCentesimosDePunto, aPesos, aplicarPorcentaje } from "./dinero.ts";
import { mediosCompatibles, primeraReglaQueFalla, type ContextoDeCompra } from "./elegibilidad.ts";
import { PerfilSinMediosError } from "./errores.ts";
import { diaArgentina, fechaArgentina } from "./fecha.ts";
import { motivoCombinado, motivoDescarte, motivoOpcion } from "./motivos.ts";
import { calcularSaldos, type Saldo } from "./tope.ts";
import type {
  BaseEstimacion,
  CausaDescarte,
  Compra,
  CompraPropuesta,
  Descarte,
  MedioDePago,
  OpcionDePago,
  Perfil,
  Promocion,
  Recomendacion,
} from "./tipos.ts";

/** Por código de carácter, no por idioma: el mismo orden en Node y en Deno. */
function compararIds(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

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

function compararOpciones(a: OpcionDePago, b: OpcionDePago): number {
  return (
    b.ahorroEstimado - a.ahorroEstimado ||
    compararIds(a.medioDePagoId, b.medioDePagoId) ||
    compararListasDeIds(idsDePromos(a), idsDePromos(b))
  );
}

/** Una promo que pasó todas las reglas y le queda tope. */
interface PromoAplicable {
  promo: Promocion;
  medios: MedioDePago[];
  /** `null` = sin saldo: no informa tope o es por compra. */
  saldo: Saldo | null;
  /** En centavos, solo si el tope es por compra. */
  topePorCompra: number | null;
  /** Monto por porcentaje, sin ningún tope, en centavos. */
  ahorroSinTope: number;
}

/**
 * Arma una opción con una o varias promos del mismo medio. Las promos se
 * reparten el saldo en orden de ahorro sin tope y luego por id, así ninguna
 * combinación supera el restante de un saldo (FR-010).
 */
function armarOpcion(medio: MedioDePago, grupo: PromoAplicable[]): OpcionDePago {
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
  const promociones = ordenadas.map((a, i) => ({
    promocionId: a.promo.id,
    ahorroEstimado: aPesos(ahorros[i] ?? 0),
    // Las que comparten saldo informan el mismo restante final (FR-012).
    topeRestanteTrasCompra: a.saldo ? aPesos(restantes.get(a.saldo) ?? a.saldo.restante) : null,
    base: a.saldo ? a.saldo.base : null,
  }));
  return {
    medioDePagoId: medio.id,
    ahorroEstimado: aPesos(ahorros.reduce((t, x) => t + x, 0)),
    promociones,
    motivo:
      ordenadas.length === 1 && ordenadas[0]
        ? motivoOpcion(ordenadas[0].promo)
        : motivoCombinado(
            ordenadas.map((a) => a.promo),
            sinSaldo,
          ),
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
  const montoCentavos = aCentavos(compra.monto);
  const aplicables: PromoAplicable[] = [];
  const descartadas: Descarte[] = [];
  const saldos = calcularSaldos(promociones, comprasDelPeriodo, ctx.fecha);

  for (const promo of promociones) {
    const medios = mediosCompatibles(promo, perfil.mediosDePago);
    const descartar = (causa: CausaDescarte, base: BaseEstimacion | null) =>
      descartadas.push({ promocionId: promo.id, causa, base, motivo: motivoDescarte(causa, promo, ctx) });

    const causa = primeraReglaQueFalla(promo, ctx) ?? (medios.length === 0 ? "medio_de_pago" : null);
    if (causa !== null) {
      descartar(causa, null);
      continue;
    }
    // El tope es de la promo, no del medio.
    const saldo = saldos.get(promo.id);
    const topePorCompra =
      promo.tope.periodo === "por_compra" && promo.tope.monto !== null
        ? aCentavos(promo.tope.monto)
        : null;
    if (saldo?.restante === 0) {
      // Un tope agotado también es un estimado: lleva su base (constitución §V).
      descartar("tope_agotado", saldo.base);
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
  const opciones: OpcionDePago[] = [];
  for (const medio of perfil.mediosDePago) {
    const delMedio = aplicables.filter((a) => a.medios.includes(medio));
    const acumulables = delMedio.filter((a) => a.promo.acumulable === true);
    if (acumulables.length >= 2) {
      opciones.push(armarOpcion(medio, acumulables));
      for (const a of delMedio) if (a.promo.acumulable !== true) opciones.push(armarOpcion(medio, [a]));
    } else {
      for (const a of delMedio) opciones.push(armarOpcion(medio, [a]));
    }
  }

  opciones.sort(compararOpciones);
  descartadas.sort((a, b) => compararIds(a.promocionId, b.promocionId));
  const [mejor = null, ...alternativas] = opciones;
  return { mejor, alternativas, descartadas };
}
