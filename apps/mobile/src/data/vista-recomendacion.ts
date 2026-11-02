/**
 * Traduce la respuesta de `recomendar()` del motor a lo que pintan las pantallas. No
 * calcula reintegros ni topes: nombra lo que llega por id con los catálogos y elige qué
 * texto mostrar. La única cuenta es "te sale" (monto − ahorro), que resta dos cifras del
 * motor.
 */
import type {
  Alternativa,
  Base,
  BaseEstimacion,
  Comercio,
  Descarte,
  MedioDePago,
  OpcionDePago,
  PedidoRecomendar,
  PromocionCatalogo,
  Recomendacion,
  RespuestaRecomendar,
} from "./contracts";
import { textoBase } from "../lib/textos";

export type Catalogos = {
  medios: MedioDePago[];
  promociones: PromocionCatalogo[];
  /** "octubre", para la base: "según 3 compras de octubre". */
  mes: string;
  /** "hoy miércoles" */
  dia: string;
};

/** Base del motor → texto (Principio V). Con cero compras no hay cifra que sostener. */
export function baseDeMotor(base: BaseEstimacion | null, mes: string): Base | null {
  return base ? textoBase(base.comprasRegistradas, "mes", mes) : null;
}

function medioDe(id: string, c: Catalogos): MedioDePago | null {
  return c.medios.find((m) => m.id === id) ?? null;
}

/**
 * El medio del usuario de una promo descartada: el que informa el motor (issue #46) o, si la
 * promo no aplicaba a ninguno, el de su mismo banco, si lo tiene.
 */
function medioDeDescarte(d: Descarte, c: Catalogos): MedioDePago | null {
  const informado = d.mediosDePagoIds.map((id) => medioDe(id, c)).find((m) => m !== null);
  if (informado) return informado;
  const promo = c.promociones.find((p) => p.id === d.promocionId);
  return promo ? (c.medios.find((m) => m.banco === promo.bancoId) ?? null) : null;
}

/**
 * Qué da la promo, sin el tope ni la base que el motor agrega al motivo (issue #46): la
 * tarjeta los muestra aparte, con su cifra. "20% en supermercados los miércoles · te quedan
 * ≈$6.500 de tope, según 3 compras de octubre" → "20% en supermercados los miércoles".
 */
export function queDa(motivo: string): string {
  return motivo
    .split(" + ")
    .map((parte) => parte.split(" · ")[0] ?? parte)
    .join(" + ");
}

/** "Hoy no aplica, la promo es los jueves" → "la promo es los jueves". */
function sinHoyNoAplica(motivo: string): string {
  return motivo.replace(/^Hoy no aplica[:,] /, "");
}

function alternativaDeOpcion(o: OpcionDePago, c: Catalogos): Alternativa {
  const medio = medioDe(o.medioDePagoId, c);
  return {
    medioId: medio?.id ?? null,
    titulo: medio?.nombre ?? "Otro medio",
    inicial: medio?.inicial ?? "?",
    motivo: o.motivo,
    estado: "otra-opcion",
  };
}

export function aVista(
  pedido: PedidoRecomendar,
  r: RespuestaRecomendar,
  comercio: Comercio,
  c: Catalogos,
): Recomendacion {
  const alternativas: Alternativa[] = [
    ...r.alternativas.map((o) => alternativaDeOpcion(o, c)),
    ...r.descartadas.map((d): Alternativa => {
      const medio = medioDeDescarte(d, c);
      const promo = c.promociones.find((p) => p.id === d.promocionId);
      return {
        medioId: medio?.id ?? null,
        titulo: medio?.nombre ?? promo?.titulo ?? "Promoción",
        inicial: medio?.inicial ?? "?",
        // Agotado, el motivo del motor ya trae su base ("Tope agotado este mes, según 2 compras").
        motivo: d.motivo,
        estado: d.causa === "tope_agotado" ? "agotado" : "no-aplica",
      };
    }),
  ];

  const otroDia = r.descartadas.find((d) => d.causa === "dia");
  const comun = { comercio, dia: c.dia, monto: pedido.monto, alternativas };

  if (!r.mejor) {
    const medio = otroDia ? medioDeDescarte(otroDia, c) : null;
    return {
      ...comun,
      resultado: "sin-promo",
      medio: null,
      razon: null,
      topeDisponible: null,
      base: null,
      reintegro: null,
      teSale: null,
      topeDespues: null,
      proximaPromo: otroDia ? `${medio?.nombre ?? "Otro medio"}: ${sinHoyNoAplica(otroDia.motivo)}` : null,
    };
  }

  const principal = r.mejor.promociones[0] ?? null;
  const base = baseDeMotor(principal?.base ?? null, c.mes);
  const conBase = base?.tipo === "compras";
  const tope = principal?.topeRestanteTrasCompra ?? null;
  const conMonto = pedido.monto !== null;

  return {
    ...comun,
    resultado: "recomendado",
    medio: medioDe(r.mejor.medioDePagoId, c),
    razon: queDa(r.mejor.motivo),
    // Sin base no hay cifra de tope (Principio V): se muestra el texto de la base.
    topeDisponible: !conMonto && conBase ? tope : null,
    base,
    reintegro: conMonto ? r.mejor.ahorroEstimado : null,
    teSale: conMonto && pedido.monto !== null ? pedido.monto - r.mejor.ahorroEstimado : null,
    topeDespues: conMonto && conBase && tope !== null ? { disponible: tope } : null,
    proximaPromo: null,
  };
}
