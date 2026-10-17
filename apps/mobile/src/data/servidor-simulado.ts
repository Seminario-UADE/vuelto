/**
 * REEMPLAZO TEMPORAL DE LAS EDGE FUNCTIONS — no es la lógica del producto.
 *
 * Arma, a partir de los fixtures, las mismas respuestas que van a devolver las Edge
 * Functions (`recomendar`, `topes`, `recomendar-grupo`) para que la app se pueda usar en
 * Expo Go antes de que existan. Excepción al Principio II aprobada por el PO (spec 002,
 * plan §Complexity Tracking):
 *   - Lo importa SOLO `api.ts`. Ninguna pantalla ni componente calcula reintegros.
 *   - Se borra cuando existan los endpoints del motor (#43/#45) y del grupo (#56).
 * La recomendación real sale de `@vuelto/motor`, que corre en el servidor.
 */
import type {
  Alternativa,
  Base,
  Comercio,
  EstadoTope,
  FilaIntegrante,
  IntegranteGrupo,
  MedioDePago,
  Recomendacion,
  RecomendacionGrupo,
  ResumenTopes,
  TopeMedio,
} from "./contracts";
import {
  DIA_HOY,
  HOY,
  DIAS_PARA_REINICIO,
  MES,
  comprasOctubre,
  consejos,
  contactoServidor,
  contactos,
  mediosDeclarados,
  nombreRubro,
  promos,
  type PromoFixture,
} from "./fixtures";
import { aprox } from "../lib/format";

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
  if (p.comprasEnPeriodo === 0 || p.consumido === null) {
    const periodo = p.periodo === "semana" ? "esta semana" : "este mes";
    return {
      tipo: "sin-compras",
      texto: `Sin compras registradas ${periodo}: todavía no podemos estimar cuánto te queda.`,
    };
  }
  const n = p.comprasEnPeriodo;
  const cuando = p.periodo === "mes" ? ` de ${MES}` : " esta semana";
  return {
    tipo: "compras",
    cantidad: n,
    periodo: p.periodo,
    texto: `según ${n} ${n === 1 ? "compra" : "compras"}${cuando}`,
  };
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

export function recomendar(comercio: Comercio, monto: number | null): Recomendacion {
  const montoValido = monto !== null && monto > 0 ? monto : null;
  const candidatos: { medio: MedioDePago; promo: PromoFixture; disp: number | null }[] = [];
  const alternativas: Alternativa[] = [];
  let proximaPromo: string | null = null;

  for (const medio of mediosDeclarados) {
    const promo = promoDe(medio);
    if (!promo || promo.rubro !== comercio.rubro) {
      alternativas.push({
        medio,
        motivo: `sin promo en ${nombreRubro[comercio.rubro]}`,
        estado: "sin-promo",
      });
      continue;
    }
    const disp = disponible(promo);
    if (!aplicaHoy(promo)) {
      alternativas.push({
        medio,
        motivo: `hoy no aplica, la promo es ${promo.diasTexto}`,
        estado: "no-aplica",
      });
      proximaPromo ??= `${medio.nombre}: ${promo.porcentaje}% ${promo.diasTexto}`;
      continue;
    }
    if (disp === 0) {
      alternativas.push({ medio, motivo: `tope agotado · ${promo.reinicio}`, estado: "agotado" });
      continue;
    }
    candidatos.push({ medio, promo, disp });
  }

  // Mayor reintegro estimado; sin monto, mayor porcentaje y después mayor tope disponible.
  const valor = (c: (typeof candidatos)[number]) =>
    montoValido === null
      ? c.promo.porcentaje * 1e6 + (c.disp ?? c.promo.nominal)
      : Math.min((montoValido * c.promo.porcentaje) / 100, c.disp ?? c.promo.nominal);
  candidatos.sort((a, b) => valor(b) - valor(a));
  const [elegido, ...resto] = candidatos;
  for (const c of resto) {
    alternativas.unshift({ medio: c.medio, motivo: "te devuelve menos en esta compra", estado: "no-aplica" });
  }

  const dia = `hoy ${NOMBRE_DIA[DIA_HOY]}`;
  if (!elegido) {
    return {
      comercio,
      dia,
      resultado: "sin-promo",
      medio: null,
      razon: null,
      porcentaje: null,
      topeDisponible: null,
      base: null,
      monto: montoValido,
      reintegro: null,
      teSale: null,
      topeDespues: null,
      alternativas,
      proximaPromo,
    };
  }

  const { medio, promo, disp } = elegido;
  let reintegro: number | null = null;
  let teSale: number | null = null;
  let topeDespues: Recomendacion["topeDespues"] = null;
  if (montoValido !== null) {
    const bruto = Math.round((montoValido * promo.porcentaje) / 100);
    reintegro = disp === null ? bruto : Math.min(bruto, disp);
    teSale = montoValido - reintegro;
    if (disp !== null) {
      const queda = disp - reintegro;
      topeDespues = { disponible: queda, estado: estadoTope(queda, promo.nominal) };
    }
  }

  return {
    comercio,
    dia,
    resultado: "recomendado",
    medio,
    razon: porcentajeTexto(promo),
    porcentaje: promo.porcentaje,
    topeDisponible: disp,
    base: baseDe(promo),
    monto: montoValido,
    reintegro,
    teSale,
    topeDespues,
    alternativas,
    proximaPromo: null,
  };
}

export function topes(): ResumenTopes {
  const lista: TopeMedio[] = mediosDeclarados.flatMap((medio) => {
    const promo = promoDe(medio);
    if (!promo) return [];
    const disp = disponible(promo);
    return [
      {
        medio,
        rubro: promo.rubro,
        promo: `${promo.porcentaje}% en ${nombreRubro[promo.rubro]} · ${promo.diasTexto}`,
        nominal: promo.nominal,
        periodo: promo.periodo,
        disponible: disp,
        estado: estadoTope(disp, promo.nominal),
        base: baseDe(promo),
        reinicio: promo.reinicio,
        consejo: consejos[medio.id] ?? null,
      },
    ];
  });
  const devuelto = comprasOctubre.reduce((s, c) => s + (c.reintegro ?? 0), 0);
  return {
    mes: MES,
    devolvieron: {
      monto: devuelto,
      base: {
        tipo: "compras",
        cantidad: comprasOctubre.length,
        periodo: "mes",
        texto: `según ${comprasOctubre.length} compras de ${MES}`,
      },
    },
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
            : `Tu ${medio.nombre}: ${aprox(reintegro)} de reintegro`;
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
        ? `${aprox(mejor.reintegro)} si paga ${nombreC}`
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
