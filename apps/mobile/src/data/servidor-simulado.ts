/**
 * REEMPLAZO TEMPORAL DE LAS EDGE FUNCTIONS — no es la lógica del producto.
 *
 * Arma, a partir de los fixtures, las mismas respuestas que van a devolver las Edge
 * Functions (`recomendar`, `topes`, `recomendar-grupo`) para que la app se pueda usar en
 * Expo Go antes de que existan. Excepción al Principio II aprobada por el PO (spec 006,
 * plan §Complexity Tracking):
 *   - Lo importa SOLO `api.ts`. Ninguna pantalla ni componente calcula reintegros.
 *   - Se borra cuando existan los endpoints del motor (#43/#45) y del grupo (#56).
 * La recomendación real sale de `@vuelto/motor`, que corre en el servidor.
 */
import type {
  BaseEstimacion,
  Compra,
  Descarte,
  OpcionDePago,
  PedidoRecomendar,
  RespuestaRecomendar,
  Base,
  Comercio,
  EstadoTope,
  FilaIntegrante,
  IntegranteGrupo,
  MedioDePago,
  RecomendacionGrupo,
  ResumenTopes,
  TopeMedio,
} from "./contracts";
import {
  DIA_HOY,
  HOY,
  DIAS_PARA_REINICIO,
  MES,
  consejos,
  contactoServidor,
  contactos,
  mediosDeclarados,
  nombreRubro,
  CATEGORIA_DE_RUBRO,
  NOMBRE_CATEGORIA,
  promos,
  type PromoFixture,
} from "./fixtures";
import { aprox } from "../lib/format";
import { textoBase } from "../lib/textos";

const UMBRAL_QUEDA_POCO = 0.3;
const NOMBRE_DIA = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

export function estadoTope(disponible: number | null, nominal: number): EstadoTope {
  if (disponible === null) return "sin-base";
  if (disponible <= 0) return "agotado";
  if (disponible <= nominal * UMBRAL_QUEDA_POCO) return "queda-poco";
  return "disponible";
}

function disponible(p: PromoFixture): number | null {
  return p.consumido === null ? null : Math.max(0, p.nominal - p.consumido);
}

function baseDe(p: PromoFixture): Base {
  return textoBase(p.consumido === null ? 0 : p.comprasEnPeriodo, p.periodo, MES);
}

function baseSinCompras(p: PromoFixture): Base {
  return baseDe({ ...p, consumido: null, comprasEnPeriodo: 0 });
}

function aplicaHoy(p: PromoFixture): boolean {
  return p.dias === null || p.dias.includes(DIA_HOY);
}

function promoDe(medio: MedioDePago): PromoFixture | undefined {
  return promos.find((p) => p.medioId === medio.id);
}

function porcentajeTexto(p: PromoFixture): string {
  return `${p.porcentaje}% en ${nombreRubro[p.rubro]} ${p.diasTexto}`;
}

/** Escenario "mes sin compras": ningún tope tiene base. */
export type Opciones = { sinCompras?: boolean };

/** Plantilla de `motivoOpcion` del motor: "20% en supermercados los miércoles". */
function motivoOpcion(p: PromoFixture): string {
  const categoria = NOMBRE_CATEGORIA[CATEGORIA_DE_RUBRO[p.rubro] ?? -1] ?? "esta categoría";
  return `${p.porcentaje}% en ${categoria}${p.dias ? ` ${p.diasTexto}` : ""}`;
}

function baseMotor(p: PromoFixture, op: Opciones): BaseEstimacion {
  return { comprasRegistradas: op.sinCompras ? 0 : p.comprasEnPeriodo, comprasSinDescuentoInformado: 0 };
}

/**
 * Simula `POST /functions/v1/recomendar`: misma forma que `recomendar()` del motor
 * (specs/004-recomendar-pantalla/contracts/recomendar.md). Como la Edge Function, solo evalúa
 * las promos del rubro pedido. Sin compras en el período, el motor toma el tope entero.
 */
export function recomendar(pedido: PedidoRecomendar, op: Opciones = {}): RespuestaRecomendar {
  const opciones: OpcionDePago[] = [];
  const descartadas: Descarte[] = [];
  for (const medio of mediosDeclarados) {
    const promo = promoDe(medio);
    if (!promo || CATEGORIA_DE_RUBRO[promo.rubro] !== pedido.categoriaId) continue;
    const base = baseMotor(promo, op);
    const disp = op.sinCompras ? promo.nominal : (disponible(promo) ?? promo.nominal);
    if (!aplicaHoy(promo)) {
      descartadas.push({ promocionId: promo.id, causa: "dia", base: null, motivo: `Hoy no aplica: la promo es ${promo.diasTexto}` });
      continue;
    }
    if (disp === 0) {
      descartadas.push({ promocionId: promo.id, causa: "tope_agotado", base, motivo: "Tope agotado" });
      continue;
    }
    const ahorro = pedido.monto === null ? 0 : Math.min(Math.round((pedido.monto * promo.porcentaje) / 100), disp);
    opciones.push({
      medioDePagoId: medio.id,
      ahorroEstimado: ahorro,
      promociones: [{ promocionId: promo.id, ahorroEstimado: ahorro, topeRestanteTrasCompra: disp - ahorro, base }],
      motivo: motivoOpcion(promo),
    });
  }
  const pct = (o: OpcionDePago) => promos.find((p) => p.id === o.promociones[0]?.promocionId)?.porcentaje ?? 0;
  opciones.sort((x, y) => y.ahorroEstimado - x.ahorroEstimado || pct(y) - pct(x));
  const [mejor = null, ...alternativas] = opciones;
  return { mejor, alternativas, descartadas };
}

export function topes(compras: Compra[], op: Opciones = {}): ResumenTopes {
  const lista: TopeMedio[] = mediosDeclarados.flatMap((medio) => {
    const promo = promoDe(medio);
    if (!promo) return [];
    const disp = op.sinCompras ? null : disponible(promo);
    return [
      {
        medio,
        rubro: promo.rubro,
        promo: `${promo.porcentaje}% en ${nombreRubro[promo.rubro]} · ${promo.diasTexto}`,
        nominal: promo.nominal,
        periodo: promo.periodo,
        disponible: disp,
        estado: estadoTope(disp, promo.nominal),
        base: op.sinCompras ? baseSinCompras(promo) : baseDe(promo),
        reinicio: promo.reinicio,
        consejo: op.sinCompras ? null : (consejos[medio.id] ?? null),
      },
    ];
  });
  return {
    mes: MES,
    devolvieron: devolvieron(compras),
    mediosConTope: lista.filter((t) => t.estado === "disponible" || t.estado === "queda-poco").length,
    reinicioMensualEnDias: DIAS_PARA_REINICIO,
    medios: lista,
  };
}

function diaDeSemana(fechaIso: string): number {
  const [y, m, d] = fechaIso.split("-").map(Number);
  return new Date(Date.UTC(y ?? 2026, (m ?? 1) - 1, d ?? 1)).getUTCDay();
}

function cuandoTexto(fechaIso: string): string {
  const dia = diaDeSemana(fechaIso);
  if (fechaIso === HOY) return `hoy ${NOMBRE_DIA[dia]}`;
  const [, m, d] = fechaIso.split("-").map(Number);
  return `${NOMBRE_DIA[dia]} ${d}/${m}`;
}

type Opcion = {
  quien: { nombre: string; esVos: boolean; orden: number };
  medio: string;
  razon: string;
  reintegro: number;
  conBase: boolean;
  base: Base;
};

/**
 * Desempate del mock: mayor reintegro; a igual reintegro, el estimado con base le gana al
 * que no tiene; después quien pide (ADR-008 §5) y el orden de los contactos. El desempate
 * real lo define el motor (#56).
 */
/** "Te devolvieron" y su base, sobre la misma lista de compras en todas las pantallas. */
export function devolvieron(compras: Compra[]): { monto: number; base: Base } {
  return { monto: compras.reduce((s, c) => s + (c.reintegro ?? 0), 0), base: textoBase(compras.length, "mes", MES) };
}

/** Lo que gastó el usuario en el mes (Mis compras). */
export function gastado(compras: Compra[]): number {
  return compras.reduce((s, c) => s + c.monto, 0);
}

/** Reintegro estimado que el servidor le asigna a una compra registrada. */
export function reintegroDeCompra(comercio: Comercio, monto: number, medioId: string): number | null {
  if (comercio.categoriaId === null) return null;
  const r = recomendar({ comercio: comercio.nombre, categoriaId: comercio.categoriaId, monto, canal: "presencial" });
  return r.mejor?.medioDePagoId === medioId ? r.mejor.ahorroEstimado : null;
}

export function recomendarGrupo(
  pedido: { nombre: string | null; comercio: Comercio; monto: number; fecha: string; integrantes: IntegranteGrupo[] },
): RecomendacionGrupo {
  const { nombre, comercio, monto, fecha, integrantes } = pedido;
  const dia = diaDeSemana(fecha);
  const n = Math.max(1, integrantes.length);
  const rubro = nombreRubro[comercio.rubro];
  const opciones: Opcion[] = [];
  const filas: FilaIntegrante[] = [];

  integrantes.forEach((i, orden) => {
    if (i.tipo === "vos") {
      let mejorPropia: Opcion | null = null;
      let detalle = `Tus medios no tienen promo en ${rubro} ese día`;
      for (const medio of mediosDeclarados) {
        const promo = promoDe(medio);
        if (!promo || promo.rubro !== comercio.rubro) continue;
        if (promo.dias !== null && !promo.dias.includes(dia)) {
          detalle = `Tu ${medio.nombre}: la promo es ${promo.diasTexto}`;
          continue;
        }
        const disp = disponible(promo);
        if (disp === 0) {
          detalle = `Tu ${medio.nombre}: tope agotado`;
          continue;
        }
        const reintegro = Math.min(Math.round((monto * promo.porcentaje) / 100), disp ?? promo.nominal);
        const base = baseDe(promo);
        const op: Opcion = {
          quien: { nombre: "Vos", esVos: true, orden: -1 },
          medio: `tu ${medio.nombre}`,
          razon: porcentajeTexto(promo),
          reintegro,
          conBase: disp !== null,
          base,
        };
        if (!mejorPropia || op.reintegro > mejorPropia.reintegro) mejorPropia = op;
        detalle =
          disp === null
            ? `Tu ${medio.nombre}: ${promo.porcentaje}% ${promo.diasTexto}, sin base esta semana`
            : `Tu ${medio.nombre}: ${aprox(reintegro)} de reintegro, ${base.texto}`;
      }
      if (mejorPropia) opciones.push(mejorPropia);
      filas.push({ nombre: "Vos", iniciales: null, esVos: true, detalle });
      return;
    }
    if (i.tipo === "sin-cuenta") {
      filas.push({
        nombre: i.nombre,
        iniciales: i.nombre.trim().charAt(0).toUpperCase() || "?",
        esVos: false,
        detalle: "Sin cuenta: no conocemos su tope",
      });
      return;
    }
    const c = contactos.find((x) => x.id === i.contactoId);
    const s = contactoServidor[i.contactoId];
    const nombreC = c?.nombre ?? "Contacto";
    let mejor: Opcion | null = null;
    for (const m of s?.medios ?? []) {
      if (m.rubro !== comercio.rubro) continue;
      if (m.dias !== null && !m.dias.includes(dia)) continue;
      if (m.disponible === 0) continue;
      const reintegro = Math.min(Math.round((monto * m.porcentaje) / 100), m.disponible ?? m.nominal);
      const op: Opcion = {
        quien: { nombre: nombreC, esVos: false, orden },
        medio: `su ${m.nombre}`,
        razon: `${m.porcentaje}% en ${rubro} ${m.diasTexto}`,
        reintegro,
        conBase: Boolean(s?.tieneCompras) && m.disponible !== null,
        base: s?.tieneCompras
          ? { tipo: "contacto", texto: `según las compras que registró ${nombreC}` }
          : { tipo: "contacto", texto: `${nombreC} no tiene compras registradas: sin base` },
      };
      if (!mejor || op.reintegro > mejor.reintegro) mejor = op;
    }
    if (mejor) opciones.push(mejor);
    // ADR-008 §3: de un contacto no se nombra ningún medio salvo el que se recomienda usar.
    filas.push({
      nombre: nombreC,
      iniciales: c?.iniciales ?? null,
      esVos: false,
      detalle: mejor
        ? `${aprox(mejor.reintegro)} si paga ${nombreC} · ${mejor.base.texto}`
        : s?.tieneCompras
          ? "Sin reintegro en esta compra"
          : `Sin reintegro en esta compra · ${nombreC} no tiene compras registradas: sin base`,
    });
  });

  opciones.sort(
    (a, b) =>
      b.reintegro - a.reintegro ||
      Number(b.conBase) - Number(a.conBase) ||
      a.quien.orden - b.quien.orden,
  );
  const elegida = opciones[0];

  if (elegida) {
    const fila = filas.find((f) => f.nombre === elegida.quien.nombre);
    if (fila) fila.detalle = `Paga con ${elegida.medio}`;
  }

  return {
    nombre,
    comercio,
    cuando: cuandoTexto(fecha),
    monto,
    quienPaga: elegida ? { nombre: elegida.quien.nombre, esVos: elegida.quien.esVos } : null,
    medio: elegida?.medio ?? null,
    razon: elegida?.razon ?? null,
    reintegro: elegida?.reintegro ?? null,
    base: elegida?.base ?? null,
    partePorPersona: Math.round((monto - (elegida?.reintegro ?? 0)) / n),
    integrantes: filas,
  };
}
