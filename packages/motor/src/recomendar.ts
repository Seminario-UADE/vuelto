/**
 * Recomienda con qué medio de pago conviene pagar una compra (issue #36).
 * Función pura: todo lo que varía entra por parámetro, incluido `ahora`
 * (constitución §II). Contrato: `specs/002-motor-recomendar/contracts/`.
 */
import { aCentavos, aCentesimosDePunto, aPesos, aplicarPorcentaje } from "./dinero.ts";
import { mediosCompatibles, primeraReglaQueFalla, type ContextoDeCompra } from "./elegibilidad.ts";
import { PerfilSinMediosError } from "./errores.ts";
import { diaArgentina, fechaArgentina } from "./fecha.ts";
import { motivoDescarte, motivoOpcion } from "./motivos.ts";
import { calcularSaldos } from "./tope.ts";
import type {
  BaseEstimacion,
  CausaDescarte,
  Compra,
  CompraPropuesta,
  Descarte,
  OpcionDePago,
  Perfil,
  Promocion,
  Recomendacion,
} from "./tipos.ts";

/** Por código de carácter, no por idioma: el mismo orden en Node y en Deno. */
function compararIds(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function idsDePromos(o: OpcionDePago): string {
  return o.promociones
    .map((p) => p.promocionId)
    .sort(compararIds)
    .join(",");
}

function compararOpciones(a: OpcionDePago, b: OpcionDePago): number {
  return (
    b.ahorroEstimado - a.ahorroEstimado ||
    compararIds(a.medioDePagoId, b.medioDePagoId) ||
    compararIds(idsDePromos(a), idsDePromos(b))
  );
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
  const opciones: OpcionDePago[] = [];
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
    const sinTecho = aplicarPorcentaje(montoCentavos, aCentesimosDePunto(promo.porcentaje));
    const limite = saldo?.restante ?? topePorCompra;
    const ahorro = limite === null ? sinTecho : Math.min(sinTecho, limite);
    for (const medio of medios) {
      opciones.push({
        medioDePagoId: medio.id,
        ahorroEstimado: aPesos(ahorro),
        promociones: [
          {
            promocionId: promo.id,
            ahorroEstimado: aPesos(ahorro),
            topeRestanteTrasCompra: saldo ? aPesos(saldo.restante - ahorro) : null,
            base: saldo ? saldo.base : null,
          },
        ],
        motivo: motivoOpcion(promo),
      });
    }
  }

  opciones.sort(compararOpciones);
  descartadas.sort((a, b) => compararIds(a.promocionId, b.promocionId));
  const [mejor = null, ...alternativas] = opciones;
  return { mejor, alternativas, descartadas };
}
