/**
 * Traduce la respuesta de la Edge Function `recomendar` (forma del motor) a lo que pintan
 * las pantallas. No calcula reintegros ni topes: nombra lo que llega por id con los
 * catálogos y elige qué texto mostrar. La única cuenta es "te sale" (monto − ahorro), que
 * resta dos cifras del servidor.
 */
import type {
  Alternativa,
  Base,
  BaseEstimacion,
  Comercio,
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

/** El medio del usuario de una promo descartada: el de su mismo banco, si lo tiene. */
function medioDePromo(promocionId: string, c: Catalogos): MedioDePago | null {
  const promo = c.promociones.find((p) => p.id === promocionId);
  return promo ? (c.medios.find((m) => m.banco === promo.bancoId) ?? null) : null;
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
      const medio = medioDePromo(d.promocionId, c);
      const promo = c.promociones.find((p) => p.id === d.promocionId);
      const base = d.causa === "tope_agotado" ? baseDeMotor(d.base, c.mes) : null;
      return {
        medioId: medio?.id ?? null,
        titulo: medio?.nombre ?? promo?.titulo ?? "Promoción",
        inicial: medio?.inicial ?? "?",
        motivo: base ? `${d.motivo} ${base.texto}` : d.motivo,
        estado: d.causa === "tope_agotado" ? "agotado" : "no-aplica",
      };
    }),
  ];

  const otroDia = r.descartadas.find((d) => d.causa === "dia");
  const comun = { comercio, dia: c.dia, monto: pedido.monto, alternativas };

  if (!r.mejor) {
    const medio = otroDia ? medioDePromo(otroDia.promocionId, c) : null;
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
      proximaPromo: otroDia ? `${medio?.nombre ?? "Otro medio"}: ${otroDia.motivo.replace(/^Hoy no aplica: /, "")}` : null,
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
    razon: r.mejor.motivo,
    // Sin base no hay cifra de tope (Principio V): se muestra el texto de la base.
    topeDisponible: !conMonto && conBase ? tope : null,
    base,
    reintegro: conMonto ? r.mejor.ahorroEstimado : null,
    teSale: conMonto && pedido.monto !== null ? pedido.monto - r.mejor.ahorroEstimado : null,
    topeDespues: conMonto && conBase && tope !== null ? { disponible: tope } : null,
    proximaPromo: null,
  };
}
