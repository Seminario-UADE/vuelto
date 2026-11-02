/**
 * Núcleo funcional de la app (ADR-009, ADR-010): llama a `@vuelto/motor` y traduce su
 * resultado a lo que pintan las pantallas. Funciones puras: todo entra por parámetro,
 * incluido `ahora`, y nada lee el reloj del sistema (spec 007 FR-005). Los selectores del
 * store las envuelven con `createSelector`.
 */
import {
  estimarTopes,
  fechaArgentina,
  formatearEstimacion,
  inicioDelPeriodo,
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
import { RUBROS } from "../lib/rubros";
import { textoBase } from "../lib/textos";

/** Lo que el motor necesita para una persona, ya con su forma. */
export type EntradasMotor = {
  perfil: PerfilMotor;
  promociones: Promocion[];
  compras: CompraMotor[];
  ahora: Date;
};

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];
const NOMBRE_DIA = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const DIA_SEMANA: Dia[] = ["dom", "lun", "mar", "mie", "jue", "vie", "sab"];
const PLURAL_DIA: Record<Dia, string> = {
  lun: "lunes",
  mar: "martes",
  mie: "miércoles",
  jue: "jueves",
  vie: "viernes",
  sab: "sábados",
  dom: "domingos",
};

/** "2026-10-14" → 3 (miércoles). Calendario puro, sin zona horaria. */
function diaDeSemana(fecha: string): number {
  return new Date(`${fecha}T00:00:00Z`).getUTCDay();
}

function sumarDias(fecha: string, dias: number): string {
  return new Date(Date.parse(`${fecha}T00:00:00Z`) + dias * 86_400_000).toISOString().slice(0, 10);
}

function diaMes(fecha: string): string {
  const [, m, d] = fecha.split("-").map(Number);
  return `${d}/${m}`;
}

export function nombreDelMes(fecha: string): string {
  return MESES[Number(fecha.slice(5, 7)) - 1] ?? "";
}

/** "hoy miércoles" */
export function textoDia(fecha: string): string {
  return `hoy ${NOMBRE_DIA[diaDeSemana(fecha)]}`;
}

/** El mediodía de una fecha en Argentina: el instante con que se evalúa una compra de ese día. */
export function mediodia(fecha: string): Date {
  return new Date(`${fecha}T12:00:00-03:00`);
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

/** `recomendar()` sin excepción por perfil vacío: sin medios evaluables no hay promo. */
function recomendarSeguro(pedido: PedidoRecomendar & { categoriaId: number }, e: EntradasMotor): RecomendacionMotor {
  try {
    // Hasta #43 el motor exige monto: "sin monto" se consulta con 0 (spec 007, Assumptions).
    return recomendar({ ...pedido, monto: pedido.monto ?? 0 }, e.perfil, e.promociones, e.compras, e.ahora);
  } catch (error) {
    if (error instanceof PerfilSinMediosError) return { mejor: null, alternativas: [], descartadas: [] };
    throw error;
  }
}

/**
 * La recomendación para un comercio y un monto opcional, con la forma de la pantalla.
 * `null` si el comercio no tiene categoría (fuera del catálogo): no se le pregunta al motor.
 */
export function recomendacionVista(e: EntradasMotor, comercio: Comercio, monto: number | null): Recomendacion | null {
  if (comercio.categoriaId === null) return null;
  const pedido = {
    comercio: comercio.nombre,
    categoriaId: comercio.categoriaId,
    monto: monto !== null && monto > 0 ? monto : null,
    canal: "presencial" as const,
  };
  const r = recomendarSeguro(pedido, e);
  // Las promos de otro rubro no son una alternativa para esta compra (research R4).
  const respuesta = { ...r, descartadas: r.descartadas.filter((d) => d.causa !== "categoria") };
  const hoy = fechaArgentina(e.ahora);
  return aVista(pedido, respuesta, comercio, {
    medios: mediosDeLaApp(e.perfil),
    promociones: promocionesCatalogo(e.promociones),
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
  return dias === null || dias.includes(DIA_SEMANA[diaDeSemana(fecha)] ?? "dom");
}

function topeMedio(est: EstimacionTope, e: EntradasMotor, hoy: string): TopeMedio | null {
  const medio = catalogoMedios.find((m) => m.id === est.mediosDePagoIds[0]);
  const promo = e.promociones.find((p) => p.id === est.promocionIds[0]);
  if (!medio || !promo) return null;
  const texto = formatearEstimacion(est);
  const estado = ESTADO[texto.estado];
  const periodo = est.periodo.tipo === "semanal" ? "semana" : "mes";
  const rubro = rubroDeCategoria(promo.categoriaId);
  const vuelve = diaMes(sumarDias(est.periodo.hasta, 1));
  // Agotado, la base del motor trae el reinicio pegado ("según 2 compras de octubre · vuelve
  // el 1/11"); la tarjeta los muestra por separado.
  const [segun = texto.base] = texto.base.split(" · ");
  return {
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
        ? `Hoy es ${NOMBRE_DIA[diaDeSemana(hoy)]}: en ${RUBROS[rubro].enFrase}, con ${medio.nombreCorto} te quedan ${texto.cifra} de tope.`
        : null,
  };
}

/** Compras del mes en curso, la más nueva primero. */
function comprasDelMes(compras: CompraMotor[], hoy: string): CompraMotor[] {
  const desde = inicioDelPeriodo("mensual", hoy);
  return compras.filter((c) => c.fecha >= desde && c.fecha <= hoy);
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
export function topesVista(e: EntradasMotor): ResumenTopes {
  const hoy = fechaArgentina(e.ahora);
  const mes = nombreDelMes(hoy);
  const medios = estimarTopes(e.promociones, e.compras, e.perfil, e.ahora).flatMap((est) => {
    const t = topeMedio(est, e, hoy);
    return t ? [t] : [];
  });
  // Un solo consejo por pantalla (DESIGN.md §5).
  let conConsejo = false;
  for (const t of medios) {
    if (t.consejo && !conConsejo) conConsejo = true;
    else t.consejo = null;
  }
  const finDeMes = sumarDias(`${hoy.slice(0, 7)}-01`, 31).slice(0, 7);
  return {
    mes,
    devolvieron: devolvieron(comprasDelMes(e.compras, hoy), mes),
    mediosConTope: medios.filter((t) => t.estado === "disponible" || t.estado === "queda-poco").length,
    reinicioMensualEnDias: Math.round((Date.parse(`${finDeMes}-01`) - Date.parse(hoy)) / 86_400_000),
    medios,
  };
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

/** «Mis compras»: las del mes en curso, con lo gastado y lo devuelto. */
export function comprasVista(compras: CompraMotor[], ahora: Date): ResumenCompras {
  const hoy = fechaArgentina(ahora);
  const mes = nombreDelMes(hoy);
  const delMes = comprasDelMes(compras, hoy);
  return {
    mes,
    gastaste: delMes.reduce((s, c) => s + c.monto, 0),
    devolvieron: devolvieron(delMes, mes),
    compras: delMes.flatMap((c) => {
      const v = compraVista(c);
      return v ? [v] : [];
    }),
  };
}

/**
 * La compra que se guarda (FR-008): se evalúa con el motor al mediodía de su fecha y, si el
 * medio elegido tiene una opción, queda asociada a su promo con el ahorro como reintegro
 * esperado. `descuentoObtenido` queda `null`: el usuario no informó cuánto le devolvieron.
 */
export function compraParaGuardar(e: EntradasMotor, b: BorradorCompra, id: string): CompraMotor {
  if (b.monto === null || b.medioId === null) throw new Error("Falta el monto o el medio de pago");
  if (!catalogoMedios.some((m) => m.id === b.medioId)) throw new Error(`Medio desconocido: ${b.medioId}`);
  const comercio = comercioPorNombre((b.comercio ?? "").trim() || "Compra");
  let opcion: RecomendacionMotor["mejor"] = null;
  if (comercio.categoriaId !== null) {
    const r = recomendarSeguro(
      { comercio: comercio.nombre, categoriaId: comercio.categoriaId, monto: b.monto, canal: "presencial" },
      { ...e, ahora: mediodia(b.fecha) },
    );
    opcion = [r.mejor, ...r.alternativas].find((o) => o?.medioDePagoId === b.medioId) ?? null;
  }
  return {
    id,
    fecha: b.fecha,
    monto: b.monto,
    comercio: comercio.nombre,
    categoriaId: comercio.categoriaId,
    medioDePagoId: b.medioId,
    promocionId: opcion?.promociones[0]?.promocionId ?? null,
    descuentoObtenido: null,
    reintegroEsperado: opcion ? opcion.ahorroEstimado : null,
    fechaAcreditacionEstimada: null,
    origen: b.modo,
    textoExtraido: b.textoExtraido,
  };
}

/** Cuánto falta para la próxima medianoche de Argentina (UTC−3, sin horario de verano). */
export function msHastaLaMedianoche(ahora: Date): number {
  const enArgentina = ahora.getTime() - 3 * 3_600_000;
  const dia = 86_400_000;
  return dia - (((enArgentina % dia) + dia) % dia);
}
