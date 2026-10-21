/**
 * Recomienda con qué medio de pago conviene pagar una compra (issue #36).
 * Función pura: todo lo que varía entra por parámetro, incluido `ahora`
 * (constitución §II). Contrato: `specs/002-motor-recomendar/contracts/`.
 */
import { aCentavos, aCentesimosDePunto, aPesos, aplicarPorcentaje } from "./dinero";
import { mediosCompatibles, primeraReglaQueFalla, type ContextoDeCompra } from "./elegibilidad";
import { PerfilSinMediosError } from "./errores";
import { diaArgentina, fechaArgentina } from "./fecha";
import { motivoDescarte, motivoOpcion } from "./motivos";
import { comprasPorPromocion, estadoDeTope } from "./tope";
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
} from "./tipos";

/** Por código de carácter, no por idioma: el mismo orden en Node y en Deno. */
function compararIds(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function compararOpciones(a: OpcionDePago, b: OpcionDePago): number {
  return (
    b.ahorroEstimado - a.ahorroEstimado ||
    compararIds(a.medioDePagoId, b.medioDePagoId) ||
    compararIds(a.promocionId ?? "", b.promocionId ?? "")
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
  const comprasDe = comprasPorPromocion(comprasDelPeriodo);

  for (const promo of promociones) {
    const medios = mediosCompatibles(promo, perfil.mediosDePago);
    const descartar = (causa: CausaDescarte, base: BaseEstimacion | null) =>
      descartadas.push({ promocionId: promo.id, causa, base, motivo: motivoDescarte(causa, promo, ctx) });

    const causa = primeraReglaQueFalla(promo, ctx) ?? (medios.length === 0 ? "medio_de_pago" : null);
    if (causa !== null) {
      descartar(causa, null);
      continue;
    }
    // El tope es de la promo, no del medio: se calcula una vez por promo.
    const tope = estadoDeTope(promo, comprasDe.get(promo.id) ?? [], ctx.fecha);
    if (tope.restante === 0) {
      // Un tope agotado también es un estimado: lleva su base (constitución §V).
      descartar("tope_agotado", tope.base);
      continue;
    }
    const sinTecho = aplicarPorcentaje(montoCentavos, aCentesimosDePunto(promo.porcentaje));
    const ahorro = tope.restante === null ? sinTecho : Math.min(sinTecho, tope.restante);
    for (const medio of medios) {
      opciones.push({
        medioDePagoId: medio.id,
        promocionId: promo.id,
        ahorroEstimado: aPesos(ahorro),
        topeRestanteTrasCompra: tope.restante === null ? null : aPesos(tope.restante - ahorro),
        base: tope.base,
        motivo: motivoOpcion(promo),
      });
    }
  }

  opciones.sort(compararOpciones);
  descartadas.sort((a, b) => compararIds(a.promocionId, b.promocionId));
  const [mejor = null, ...alternativas] = opciones;
  return { mejor, alternativas, descartadas };
}
