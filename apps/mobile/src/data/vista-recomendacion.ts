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
  PromocionAplicada,
  Recomendacion,
  RespuestaRecomendar,
} from "./contracts";
import { periodoDeVista, textoBase } from "../lib/textos";

export type Catalogos = {
  medios: MedioDePago[];
  /** "octubre", para la base: "según 3 compras de octubre". */
  mes: string;
  /** "hoy miércoles" */
  dia: string;
};

/**
 * Base del motor → texto (Principio V), con el período del tope ("de octubre" o "esta
 * semana"). Con cero compras no hay cifra que sostener.
 */
export function baseDeMotor(
  base: BaseEstimacion | null,
  periodo: PromocionAplicada["periodo"],
  mes: string,
): Base | null {
  return base ? textoBase(base.comprasRegistradas, periodoDeVista(periodo), mes) : null;
}

function medioDe(id: string, c: Catalogos): MedioDePago | null {
  return c.medios.find((m) => m.id === id) ?? null;
}

/**
 * Qué dan las promos de una opción, sin el tope: lo arma el motor (issue #46), así la
 * tarjeta muestra la cifra del tope aparte sin cortar el motivo.
 */
export function razonDe(o: OpcionDePago): string {
  return o.promociones.map((p) => p.textoPromo).join(" + ");
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

/** Lo que se muestra de un medio del usuario sin ninguna promo para esta compra. */
export const SIN_PROMO = "Sin promo para esta compra";

/**
 * Solo las promos descartadas que le servían a algún medio del usuario: las demás no
 * explican ningún "¿por qué no X?" y mostrarlas sería listar promociones (Principio I).
 */
function descartesDelUsuario(r: RespuestaRecomendar): Descarte[] {
  return r.descartadas.filter((d) => d.mediosDePagoIds.length > 0);
}

/**
 * "¿Por qué no X?" para cada medio del usuario (issue #46): las otras opciones; los
 * descartes de los medios que no son ninguna opción, uno por promo; y los medios sin
 * nada, con `SIN_PROMO`. Un medio que ya es opción no repite sus descartes.
 */
function alternativasDe(r: RespuestaRecomendar, c: Catalogos): Alternativa[] {
  const conOpcion = new Set([r.mejor, ...r.alternativas].flatMap((o) => (o ? [o.medioDePagoId] : [])));
  const descartadas = descartesDelUsuario(r);
  const porDescarte = descartadas.flatMap((d) =>
    d.mediosDePagoIds.flatMap((id): Alternativa[] => {
      const medio = conOpcion.has(id) ? null : medioDe(id, c);
      return medio
        ? [
            {
              medioId: medio.id,
              titulo: medio.nombre,
              inicial: medio.inicial,
              // Agotado, el motivo del motor ya trae su base ("Tope agotado este mes, según 2 compras").
              motivo: d.motivo,
              estado: d.causa === "tope_agotado" ? "agotado" : "no-aplica",
            },
          ]
        : [];
    }),
  );
  const mediosExplicados = new Set([...conOpcion, ...descartadas.flatMap((d) => d.mediosDePagoIds)]);
  const sinPromo = c.medios
    .filter((m) => !mediosExplicados.has(m.id))
    .map((m): Alternativa => ({ medioId: m.id, titulo: m.nombre, inicial: m.inicial, motivo: SIN_PROMO, estado: "no-aplica" }));
  return [...r.alternativas.map((o) => alternativaDeOpcion(o, c)), ...porDescarte, ...sinPromo];
}

export function aVista(
  pedido: PedidoRecomendar,
  r: RespuestaRecomendar,
  comercio: Comercio,
  c: Catalogos,
): Recomendacion {
  const alternativas = alternativasDe(r, c);
  const otroDia = descartesDelUsuario(r).find((d) => d.causa === "dia");
  const comun = { comercio, dia: c.dia, monto: pedido.monto, alternativas };

  if (!r.mejor) {
    const idDelMedio = otroDia?.mediosDePagoIds[0];
    const medio = idDelMedio === undefined ? null : medioDe(idDelMedio, c);
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
  const base = baseDeMotor(principal?.base ?? null, principal?.periodo ?? null, c.mes);
  const conBase = base?.tipo === "compras";
  const tope = principal?.topeRestanteTrasCompra ?? null;
  const conMonto = pedido.monto !== null;

  return {
    ...comun,
    resultado: "recomendado",
    medio: medioDe(r.mejor.medioDePagoId, c),
    razon: razonDe(r.mejor),
    // Sin base no hay cifra de tope (Principio V): se muestra el texto de la base.
    topeDisponible: !conMonto && conBase ? tope : null,
    base,
    reintegro: conMonto ? r.mejor.ahorroEstimado : null,
    teSale: conMonto && pedido.monto !== null ? pedido.monto - r.mejor.ahorroEstimado : null,
    topeDespues: conMonto && conBase && tope !== null ? { disponible: tope } : null,
    proximaPromo: null,
  };
}
