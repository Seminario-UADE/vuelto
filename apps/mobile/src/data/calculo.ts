/**
 * Núcleo funcional de la app (ADR-009, ADR-010): llama a `@vuelto/motor` y traduce su
 * resultado a lo que pintan las pantallas. Funciones puras: el estado entra por parámetro,
 * incluido `ahora`, y nada lee el reloj del sistema (spec 008 FR-005). Los catálogos de medios y
 * comercios son datos estáticos de `fixtures.ts`, no estado. Los selectores del store las
 * envuelven con `createSelector`.
 */
import {
  diaArgentina,
  diaMesSinCeros,
  diaSiguiente,
  estimarTopes,
  fechaArgentina,
  finDelPeriodo,
  formatearEstimacion,
  inicioDelPeriodo,
  nombreDelMes,
  PerfilSinMediosError,
  recomendar,
  type Compra as CompraMotor,
  type Dia,
  type EstimacionTope,
  type Perfil as PerfilMotor,
  type Promocion,
  type Recomendacion as RecomendacionMotor,
} from "@vuelto/motor";
import type {
  BorradorCompra,
  Comercio,
  Compra,
  ClaveTope,
  ComprasDeTope,
  EstadoTope,
  MedioDePago,
  PedidoRecomendar,
  PromocionCatalogo,
  Recomendacion,
  ResumenCompras,
  ResumenTopes,
  Rubro,
  TopeMedio,
} from "./contracts";
import { catalogoComercios, catalogoMedios, mediosDelMotor } from "./fixtures";
import { aVista } from "./vista-recomendacion";
import { mediodia } from "../lib/reloj";
import { RUBROS } from "../lib/rubros";
import { textoBase } from "../lib/textos";

/** Lo que el motor necesita para una persona, ya con su forma. */
export type EntradasMotor = {
  perfil: PerfilMotor;
  promociones: Promocion[];
  compras: CompraMotor[];
  ahora: Date;
};

const NOMBRE_DIA: Record<Dia, string> = {
  lun: "lunes",
  mar: "martes",
  mie: "miércoles",
  jue: "jueves",
  vie: "viernes",
  sab: "sábado",
  dom: "domingo",
};
const PLURAL_DIA: Record<Dia, string> = {
  lun: "lunes",
  mar: "martes",
  mie: "miércoles",
  jue: "jueves",
  vie: "viernes",
  sab: "sábados",
  dom: "domingos",
};

/** "miércoles" para una fecha calendario. */
function nombreDelDia(fecha: string): string {
  return NOMBRE_DIA[diaArgentina(mediodia(fecha))];
}

/** "hoy miércoles" */
export function textoDia(fecha: string): string {
  return `hoy ${nombreDelDia(fecha)}`;
}

/** `["mie"]` → "los miércoles"; `null` → "todos los días". */
export function textoDias(dias: Dia[] | null): string {
  if (dias === null || dias.length === 0) return "todos los días";
  const nombres = dias.map((d) => PLURAL_DIA[d]);
  const ultimo = nombres.pop();
  return `los ${nombres.length > 0 ? `${nombres.join(", ")} y ` : ""}${ultimo}`;
}

/**
 * Perfil del motor con los medios que eligió el usuario. Los medios sin forma en el motor
 * (Mercado Pago) quedan afuera: no tienen banco ni red que evaluar (Principio III).
 */
export function perfilDelMotor(medios: string[], nombre: string | null): PerfilMotor {
  return {
    nombreParaMostrar: nombre,
    mediosDePago: medios.flatMap((id) => {
      const m = mediosDelMotor[id];
      return m ? [m] : [];
    }),
    comerciosHabituales: [],
  };
}

/** Medios del catálogo de la app que corresponden a un perfil del motor. */
function mediosDeLaApp(perfil: PerfilMotor): MedioDePago[] {
  const ids = new Set(perfil.mediosDePago.map((m) => m.id));
  return catalogoMedios.filter((m) => ids.has(m.id));
}

function rubroDeCategoria(categoriaId: number): Rubro {
  const par = Object.entries(RUBROS).find(([, v]) => v.categoriaId === categoriaId);
  return (par?.[0] as Rubro | undefined) ?? "otro";
}

/** Nombre del banco de la app ("Galicia") para un `bancoId` del motor ("galicia"). */
function nombreDeBanco(bancoId: string): string {
  const medio = catalogoMedios.find((m) => mediosDelMotor[m.id]?.bancoId === bancoId);
  return medio?.banco ?? bancoId;
}

/** Catálogo para nombrar lo que el motor devuelve por id (`aVista`). */
function promocionesCatalogo(promociones: Promocion[]): PromocionCatalogo[] {
  return promociones.map((p) => ({
    id: p.id,
    titulo: p.titulo,
    bancoId: nombreDeBanco(p.bancoId),
    categoriaId: p.categoriaId,
  }));
}

/** La compra que se evalúa en un comercio del catálogo. La app siempre pregunta por presencial. */
export function pedidoPresencial(comercio: Comercio & { categoriaId: number }, monto: number | null): PedidoRecomendar {
  return {
    comercio: comercio.nombre,
    categoriaId: comercio.categoriaId,
    monto: monto !== null && monto > 0 ? monto : null,
    canal: "presencial",
  };
}

/** `recomendar()` sin excepción por perfil vacío: sin medios evaluables no hay promo. */
export function recomendarSeguro(pedido: PedidoRecomendar, entradas: EntradasMotor): RecomendacionMotor {
  const { perfil, promociones, compras, ahora } = entradas;
  try {
    // Hasta #43 el motor exige monto: "sin monto" se consulta con 0 (spec 008, Assumptions).
    return recomendar({ ...pedido, monto: pedido.monto ?? 0 }, perfil, promociones, compras, ahora);
  } catch (error) {
    if (error instanceof PerfilSinMediosError) return { mejor: null, alternativas: [], descartadas: [] };
    throw error;
  }
}

/**
 * La recomendación para un comercio y un monto opcional, con la forma de la pantalla.
 * `null` si el comercio no tiene categoría (fuera del catálogo): no se le pregunta al motor.
 */
export function recomendacionVista(
  entradas: EntradasMotor,
  comercio: Comercio,
  monto: number | null,
): Recomendacion | null {
  if (comercio.categoriaId === null) return null;
  const pedido = pedidoPresencial({ ...comercio, categoriaId: comercio.categoriaId }, monto);
  const r = recomendarSeguro(pedido, entradas);
  // Las promos de otro rubro no son una alternativa para esta compra (research R4).
  const respuesta = { ...r, descartadas: r.descartadas.filter((d) => d.causa !== "categoria") };
  const hoy = fechaArgentina(entradas.ahora);
  return aVista(pedido, respuesta, comercio, {
    medios: mediosDeLaApp(entradas.perfil),
    promociones: promocionesCatalogo(entradas.promociones),
    mes: nombreDelMes(hoy),
    dia: textoDia(hoy),
  });
}

const ESTADO: Record<ReturnType<typeof formatearEstimacion>["estado"], EstadoTope> = {
  disponible: "disponible",
  queda_poco: "queda-poco",
  agotado: "agotado",
  sin_compras: "sin-base",
};

function aplicaElDia(promo: Promocion, fecha: string): boolean {
  const dias = promo.vigencia.dias;
  return dias === null || dias.includes(diaArgentina(mediodia(fecha)));
}

/** La clave del saldo de una estimación: la misma agrupación que hace `estimarTopes`. */
export function claveDeTope(est: EstimacionTope): ClaveTope {
  return est.grupoTopeId !== null ? `grupo:${est.grupoTopeId}` : `promo:${est.promocionIds[0] ?? ""}`;
}

function topeMedio(est: EstimacionTope, entradas: EntradasMotor, hoy: string): TopeMedio | null {
  const medio = catalogoMedios.find((m) => m.id === est.mediosDePagoIds[0]);
  const promo = entradas.promociones.find((p) => p.id === est.promocionIds[0]);
  if (!medio || !promo) return null;
  const texto = formatearEstimacion(est);
  const estado = ESTADO[texto.estado];
  const periodo = est.periodo.tipo === "semanal" ? "semana" : "mes";
  const rubro = rubroDeCategoria(promo.categoriaId);
  const vuelve = diaMesSinCeros(diaSiguiente(est.periodo.hasta));
  // Agotado, la base del motor trae el reinicio pegado ("según 2 compras de octubre · vuelve
  // el 1/11"); la tarjeta los muestra por separado.
  const [segun = texto.base] = texto.base.split(" · ");
  return {
    clave: claveDeTope(est),
    medio,
    rubro,
    promo: `${promo.porcentaje}% en ${RUBROS[rubro].enFrase} · ${textoDias(promo.vigencia.dias)}`,
    nominal: est.tope,
    periodo,
    disponible: estado === "sin-base" ? null : est.restante,
    cifra: texto.cifra,
    estado,
    base:
      estado === "sin-base"
        ? { tipo: "sin-compras", texto: texto.base }
        : { tipo: "compras", cantidad: est.base.comprasRegistradas, periodo, texto: segun },
    reinicio:
      estado === "agotado"
        ? `vuelve el ${vuelve}`
        : periodo === "semana"
          ? "se reinicia el lunes"
          : `se reinicia el ${vuelve}`,
    consejo:
      (estado === "disponible" || estado === "queda-poco") && aplicaElDia(promo, hoy) && texto.cifra
        ? `Hoy es ${nombreDelDia(hoy)}: en ${RUBROS[rubro].enFrase}, con ${medio.nombreCorto} te quedan ${texto.cifra} de tope.`
        : null,
    promociones: est.promocionIds.flatMap((id) => {
      const p = entradas.promociones.find((x) => x.id === id);
      return p ? [p.titulo] : [];
    }),
    compraIds: est.compraIds,
  };
}

/** Compras del mes en curso, la más nueva primero. */
function comprasDelMes(compras: CompraMotor[], hoy: string): CompraMotor[] {
  const desde = inicioDelPeriodo("mensual", hoy);
  return compras.filter((c) => c.fecha >= desde && c.fecha <= hoy);
}

/**
 * Las compras del período de tope en curso: desde el inicio del mes o de la semana, lo que
 * empiece antes (ADR-010). Es lo único que el celular guarda (`docs/product/privacidad.md`).
 */
export function comprasDelPeriodo(compras: CompraMotor[], hoy: string): CompraMotor[] {
  const mes = inicioDelPeriodo("mensual", hoy);
  const semana = inicioDelPeriodo("semanal", hoy);
  const desde = mes < semana ? mes : semana;
  return compras.filter((c) => c.fecha >= desde);
}

/** Lo que el banco devolvió, o lo que esperamos que devuelva si no lo informó. */
function reintegroDe(c: CompraMotor): number | null {
  return c.descuentoObtenido ?? c.reintegroEsperado;
}

function devolvieron(compras: CompraMotor[], mes: string): ResumenTopes["devolvieron"] {
  return {
    monto: compras.reduce((s, c) => s + (reintegroDe(c) ?? 0), 0),
    base: textoBase(compras.length, "mes", mes),
  };
}

/** «Tus topes»: una tarjeta por saldo, con la cifra, el estado y la base del motor (FR-007). */
export function topesVista(entradas: EntradasMotor): ResumenTopes {
  const hoy = fechaArgentina(entradas.ahora);
  const mes = nombreDelMes(hoy);
  const tarjetas = estimarTopes(entradas.promociones, entradas.compras, entradas.perfil, entradas.ahora).flatMap(
    (est) => {
      const t = topeMedio(est, entradas, hoy);
      return t ? [t] : [];
    },
  );
  // Un solo consejo por pantalla (DESIGN.md §5): el del primer tope que lo tenga.
  const conConsejo = tarjetas.findIndex((t) => t.consejo !== null);
  const medios = tarjetas.map((t, i) => (i === conConsejo ? t : { ...t, consejo: null }));
  const reinicio = diaSiguiente(finDelPeriodo("mensual", hoy));
  return {
    mes,
    devolvieron: devolvieron(comprasDelMes(entradas.compras, hoy), mes),
    mediosConTope: medios.filter((t) => t.estado === "disponible" || t.estado === "queda-poco").length,
    reinicioMensualEnDias: Math.round((Date.parse(reinicio) - Date.parse(hoy)) / 86_400_000),
    medios,
  };
}

/**
 * Las compras que consumieron un tope (issue #45). Son las que el motor contó en la base de la
 * estimación (`compraIds`), así la lista y el "según N compras" salen del mismo cálculo; la app
 * no decide qué compra pertenece a qué tope. En el orden de `compras` (como «Mis compras»).
 * Sin consejo: ya se vio en «Tus topes» y hay uno por pantalla (DESIGN.md §5). `null` si el
 * tope ya no está (venció o se sacó el medio del perfil).
 */
export function comprasDeTopeVista(topes: ResumenTopes, compras: CompraMotor[], clave: string): ComprasDeTope | null {
  const tope = topes.medios.find((t) => t.clave === clave);
  if (!tope) return null;
  const ids = new Set(tope.compraIds);
  const vistas = compras.flatMap((c) => {
    const v = ids.has(c.id) ? compraVista(c) : null;
    return v ? [v] : [];
  });
  return { tope: { ...tope, consejo: null }, compras: vistas, sinMostrar: tope.compraIds.length - vistas.length };
}

/** Comercio del catálogo por nombre; fuera del catálogo, sin rubro (no se inventa). */
export function comercioPorNombre(nombre: string): Comercio {
  return (
    catalogoComercios.find((c) => c.nombre.toLowerCase() === nombre.toLowerCase()) ?? {
      id: `libre-${nombre.toLowerCase()}`,
      nombre,
      inicial: nombre.charAt(0).toUpperCase(),
      rubro: "otro",
      categoriaId: null,
      frecuente: false,
    }
  );
}

function compraVista(c: CompraMotor): Compra | null {
  const medio = catalogoMedios.find((m) => m.id === c.medioDePagoId);
  if (!medio) return null;
  return {
    id: c.id,
    comercio: comercioPorNombre(c.comercio),
    fecha: c.fecha,
    monto: c.monto,
    medio,
    reintegro: reintegroDe(c),
    origen: c.origen,
    textoExtraido: c.textoExtraido,
  };
}

/**
 * «Mis compras»: lista todas las del período de topes (mes o semana, lo que empiece antes), así
 * ninguna compra que consume un tope queda sin poder verse o borrarse (spec 010, FR-003).
 * Lo gastado y lo devuelto siguen siendo los del mes en curso.
 */
export function comprasVista(compras: CompraMotor[], ahora: Date): ResumenCompras {
  const hoy = fechaArgentina(ahora);
  const mes = nombreDelMes(hoy);
  const delMes = comprasDelMes(compras, hoy);
  return {
    mes,
    gastaste: delMes.reduce((s, c) => s + c.monto, 0),
    devolvieron: devolvieron(delMes, mes),
    compras: comprasDelPeriodo(compras, hoy).flatMap((c) => {
      const v = compraVista(c);
      return v ? [v] : [];
    }),
  };
}

/**
 * La promo que el motor asocia a un comercio, un medio y **la fecha de la compra** (spec 010,
 * FR-022). La hoja «Revisá tu compra» la muestra y `compraParaGuardar` la guarda: una sola
 * función, así un ticket de otro día no muestra una cosa y guarda otra.
 */
export type PromoPropuesta = {
  medioId: string;
  fecha: string;
  /** Todas las acumulables de la opción; vacío si no hay ninguna. */
  promociones: { promocionId: string; nombre: string }[];
  /** El estimado del motor; `null` sin monto o sin promo. Nunca presentado como cobrado. */
  reintegro: number | null;
  /** «según N compras de octubre»; `null` sin promo. */
  base: string | null;
};

export function promoPropuesta(
  entradas: EntradasMotor,
  comercio: Comercio,
  medioId: string,
  fecha: string,
  monto: number | null,
): PromoPropuesta {
  const vacia: PromoPropuesta = { medioId, fecha, promociones: [], reintegro: null, base: null };
  if (comercio.categoriaId === null) return vacia;
  const pedido = pedidoPresencial({ ...comercio, categoriaId: comercio.categoriaId }, monto);
  const r = recomendarSeguro(pedido, { ...entradas, ahora: mediodia(fecha) });
  const opcion = [r.mejor, ...r.alternativas].find((o) => o?.medioDePagoId === medioId) ?? null;
  if (opcion === null || opcion.promociones.length === 0) return vacia;
  const catalogo = new Map(entradas.promociones.map((p) => [p.id, p]));
  const conBase = opcion.promociones.find((p) => p.base !== null);
  const periodo = catalogo.get(conBase?.promocionId ?? "")?.tope.periodo === "semanal" ? "semana" : "mes";
  return {
    medioId,
    fecha,
    promociones: opcion.promociones.map((p) => ({
      promocionId: p.promocionId,
      nombre: catalogo.get(p.promocionId)?.titulo ?? p.promocionId,
    })),
    reintegro: monto === null ? null : opcion.ahorroEstimado,
    base: conBase?.base ? textoBase(conBase.base.comprasRegistradas, periodo, nombreDelMes(fecha)).texto : null,
  };
}

/**
 * La compra que se guarda (FR-008): se evalúa con el motor al mediodía de su fecha y, si el
 * medio elegido tiene una promo y el usuario no la quitó, queda asociada a ella con el ahorro
 * como reintegro esperado. `descuentoObtenido` queda `null`: el usuario no informó cuánto le
 * devolvieron.
 */
export function compraParaGuardar(entradas: EntradasMotor, b: BorradorCompra, id: string): CompraMotor {
  if (b.monto === null || b.medioId === null) throw new Error("Falta el monto o el medio de pago");
  if (!catalogoMedios.some((m) => m.id === b.medioId)) throw new Error(`Medio desconocido: ${b.medioId}`);
  const comercio = comercioPorNombre((b.comercio ?? "").trim() || "Compra");
  const propuesta = b.usarPromo ? promoPropuesta(entradas, comercio, b.medioId, b.fecha, b.monto) : null;
  const tienePromo = propuesta !== null && propuesta.promociones.length > 0;
  return {
    id,
    fecha: b.fecha,
    monto: b.monto,
    comercio: comercio.nombre,
    categoriaId: comercio.categoriaId,
    medioDePagoId: b.medioId,
    promocionId: tienePromo ? (propuesta.promociones[0]?.promocionId ?? null) : null,
    descuentoObtenido: null,
    reintegroEsperado: tienePromo ? propuesta.reintegro : null,
    fechaAcreditacionEstimada: null,
    origen: b.modo,
    textoExtraido: b.textoExtraido,
  };
}
