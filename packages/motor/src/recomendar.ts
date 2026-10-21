/**
 * Recomienda con qué medio de pago conviene pagar una compra (issue #36).
 * Función pura: todo lo que varía entra por parámetro, incluido `ahora`
 * (constitución §II). Contrato: `specs/002-motor-recomendar/contracts/`.
 */
import { aCentavos, aCentesimosDePunto, aPesos, aplicarPorcentaje } from "./dinero";
import { mediosCompatibles, primeraReglaQueFalla, type ContextoDeCompra } from "./elegibilidad";
import { PerfilSinMediosError } from "./errores";
import { diaArgentina, fechaArgentina } from "./fecha";
import { motivoOpcion } from "./motivos";
import type {
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
  // Se usa desde la US3 (tope consumido).
  _comprasDelPeriodo: Compra[],
  ahora: Date,
): Recomendacion {
  if (perfil.mediosDePago.length === 0) throw new PerfilSinMediosError();

  const ctx: ContextoDeCompra = { compra, fecha: fechaArgentina(ahora), dia: diaArgentina(ahora) };
  const montoCentavos = aCentavos(compra.monto);
  const opciones: OpcionDePago[] = [];
  const descartadas: Descarte[] = [];

  for (const promo of promociones) {
    const medios = mediosCompatibles(promo, perfil.mediosDePago);
    const causa = primeraReglaQueFalla(promo, ctx) ?? (medios.length === 0 ? "medio_de_pago" : null);
    if (causa !== null) {
      // El motivo por causa llega con la US2.
      descartadas.push({ promocionId: promo.id, causa, base: null, motivo: "No aplica a esta compra" });
      continue;
    }
    const ahorro = aplicarPorcentaje(montoCentavos, aCentesimosDePunto(promo.porcentaje));
    for (const medio of medios) {
      opciones.push({
        medioDePagoId: medio.id,
        promocionId: promo.id,
        ahorroEstimado: aPesos(ahorro),
        // Tope y base llegan con la US3.
        topeRestanteTrasCompra: null,
        base: null,
        motivo: motivoOpcion(promo),
      });
    }
  }

  opciones.sort(compararOpciones);
  descartadas.sort((a, b) => compararIds(a.promocionId, b.promocionId));
  const [mejor = null, ...alternativas] = opciones;
  return { mejor, alternativas, descartadas };
}
