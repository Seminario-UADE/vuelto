/**
 * Gasto en grupo (spec 016, ADR-008 §5): quién de nosotros conviene que pague
 * esta compra, con qué medio, y cuánto pone cada uno. Función pura sobre una
 * foto de los integrantes: no lee la base, no usa la red ni el reloj.
 *
 * Cada integrante con cuenta se evalúa con `recomendar()`, las mismas reglas y
 * el mismo cálculo de topes que la compra individual, con el tope de su dueño
 * (FR-003). Lo propio del grupo es lo que se agrega acá: el redondeo de lo que
 * se muestra, el desempate, la base de cuatro casos y la división.
 */
import { aCentavos } from "./dinero.ts";
import { dividir } from "./division.ts";
import { GrupoInvalidoError } from "./errores.ts";
import { textoPromo } from "./motivos.ts";
import { compararIds } from "./orden.ts";
import { recomendar } from "./recomendar.ts";
import type {
  BaseDeGrupo,
  CompraDeGrupo,
  Descarte,
  IntegranteDeGrupo,
  OpcionDeGrupo,
  OpcionDePago,
  Promocion,
  RecomendacionDeGrupo,
  ResultadoDeIntegrante,
} from "./tipos.ts";

/** Integrantes en total, incluidos quien pide y los sin cuenta (FR-010). */
export const MAXIMO_INTEGRANTES = 12;

type ConCuenta = Extract<IntegranteDeGrupo, { tipo: "cuenta" }>;
type SinCuenta = Extract<IntegranteDeGrupo, { tipo: "sin_cuenta" }>;

/** Centavos → pesos enteros, los 50 centavos suben. En enteros: igual en Node y en Deno. */
function alPeso(centavos: number): number {
  return Math.floor((centavos + 50) / 100);
}

/** Centavos → múltiplo de $100 más cercano, los $50 suben (D9: el reintegro de un contacto). */
function alEscalon(centavos: number): number {
  return Math.floor((centavos + 5000) / 10000) * 100;
}

/** Id canónico (FR-004): en minúsculas, comparado por código de carácter. */
function canonico(id: string): string {
  return id.toLowerCase();
}

function validar(compra: CompraDeGrupo, integrantes: IntegranteDeGrupo[]): void {
  if (!Number.isInteger(compra.monto) || compra.monto <= 0) throw new GrupoInvalidoError("monto");
  if (integrantes.length < 2) throw new GrupoInvalidoError("pocos_integrantes");
  if (integrantes.length > MAXIMO_INTEGRANTES) throw new GrupoInvalidoError("demasiados");
  const piden = integrantes.filter((i) => i.tipo === "cuenta" && i.pide).length;
  if (piden === 0) throw new GrupoInvalidoError("sin_quien_pide");
  if (piden > 1) throw new GrupoInvalidoError("varios_piden");
  const ids = new Set<string>();
  const posiciones = new Set<number>();
  for (const i of integrantes) {
    if (i.tipo === "cuenta") {
      const id = canonico(i.id);
      if (ids.has(id)) throw new GrupoInvalidoError("repetidos");
      ids.add(id);
    } else {
      if (!Number.isInteger(i.posicion) || i.posicion < 0) throw new GrupoInvalidoError("posicion");
      if (posiciones.has(i.posicion)) throw new GrupoInvalidoError("repetidos");
      posiciones.add(i.posicion);
    }
  }
}

/** Orden del desempate (FR-004, FR-006): quien pide, los demás con cuenta por id, los sin cuenta por posición. */
function ordenar(integrantes: IntegranteDeGrupo[]): IntegranteDeGrupo[] {
  const conCuenta = integrantes.filter((i): i is ConCuenta => i.tipo === "cuenta");
  const quienPide = conCuenta.filter((i) => i.pide);
  const otros = conCuenta.filter((i) => !i.pide).sort((a, b) => compararIds(canonico(a.id), canonico(b.id)));
  const sinCuenta = integrantes.filter((i): i is SinCuenta => i.tipo === "sin_cuenta").sort((a, b) => a.posicion - b.posicion);
  return [...quienPide, ...otros, ...sinCuenta];
}

/** La base de la promo principal (FR-008, D10). */
function baseDe(opcion: OpcionDePago, promo: Promocion): BaseDeGrupo {
  const principal = opcion.promociones[0];
  if (!principal || principal.base === null || principal.periodo === null) {
    return promo.tope.periodo === "por_compra" && promo.tope.monto !== null
      ? { tipo: "tope_por_compra" }
      : { tipo: "sin_tope_informado" };
  }
  const { comprasRegistradas } = principal.base;
  return comprasRegistradas > 0
    ? { tipo: "con_compras", comprasRegistradas, periodo: principal.periodo }
    : { tipo: "sin_compras", periodo: principal.periodo };
}

/**
 * El descarte que explica por qué quien pide no tiene opción: el primero (en el
 * orden de ids de `recomendar`) de una promo que aplicaba a alguno de sus
 * medios y que no se descartó por rubro.
 */
function descartePrincipal(descartadas: Descarte[]): Descarte | null {
  return descartadas.find((d) => d.mediosDePagoIds.length > 0 && d.causa !== "categoria") ?? null;
}

interface Evaluacion {
  opcion: OpcionDeGrupo | null;
  propia: { opcion: OpcionDePago | null; descarte: Descarte | null } | null;
}

function evaluar(compra: CompraDeGrupo, i: ConCuenta, promociones: Promocion[], porId: Map<string, Promocion>, ahora: Date): Evaluacion {
  // Sin medios no se llama a `recomendar` (lanzaría PerfilSinMediosError): queda sin reintegro (FR-009).
  if (i.mediosDePago.length === 0) return { opcion: null, propia: i.pide ? { opcion: null, descarte: null } : null };

  const perfil = { nombreParaMostrar: null, mediosDePago: i.mediosDePago, comerciosHabituales: [] };
  const r = recomendar(compra, perfil, promociones, i.consumos, ahora);
  const propia = i.pide ? { opcion: r.mejor, descarte: r.mejor ? null : descartePrincipal(r.descartadas) } : null;

  const mejor = r.mejor;
  const principal = mejor?.promociones[0];
  const promo = principal ? porId.get(principal.promocionId) : undefined;
  if (!mejor || !principal || !promo) return { opcion: null, propia };

  const centavos = aCentavos(mejor.ahorroEstimado);
  const reintegroMostrado = i.pide ? alPeso(centavos) : alEscalon(centavos);
  // Menos de $1 a la vista es "sin reintegro": nunca se nombra el medio (FR-004, FR-009).
  if (reintegroMostrado < 1) return { opcion: null, propia };

  return {
    opcion: {
      medioDePagoId: mejor.medioDePagoId,
      promocionId: promo.id,
      // Sin el tope ni la variante "sin saldo": no dice nada de lo que le queda (FR-021).
      queDa: textoPromo(promo, false, false),
      reintegroMostrado,
      base: baseDe(mejor, promo),
    },
    propia,
  };
}

export function recomendarGrupo(
  compra: CompraDeGrupo,
  integrantes: IntegranteDeGrupo[],
  promociones: Promocion[],
  ahora: Date,
): RecomendacionDeGrupo {
  validar(compra, integrantes);
  // `recomendar` ya es independiente del orden de las promos; se ordenan igual
  // para que nada dependa del orden en que llegan (FR-005).
  const corpus = [...promociones].sort((a, b) => compararIds(a.id, b.id));
  const porId = new Map(corpus.map((p) => [p.id, p]));
  const ordenados = ordenar(integrantes);

  const evaluaciones = new Map<string, Evaluacion>();
  for (const i of ordenados) {
    if (i.tipo === "cuenta") evaluaciones.set(i.id, evaluar(compra, i, corpus, porId, ahora));
  }

  // El mayor reintegro mostrado; ante un empate, el primero del orden (quien pide, después por id).
  let quienPaga: string | null = null;
  let reintegro: number | null = null;
  for (const i of ordenados) {
    if (i.tipo !== "cuenta") continue;
    const opcion = evaluaciones.get(i.id)?.opcion;
    if (opcion && (reintegro === null || opcion.reintegroMostrado > reintegro)) {
      quienPaga = i.id;
      reintegro = opcion.reintegroMostrado;
    }
  }

  const total = Math.max(0, compra.monto - (reintegro ?? 0));
  const partes = dividir(total, ordenados.length);

  const resultado: ResultadoDeIntegrante[] = ordenados.map((i, k) => {
    const parte = partes[k] ?? 0;
    if (i.tipo === "sin_cuenta") return { tipo: "sin_cuenta", posicion: i.posicion, parte };
    const e = evaluaciones.get(i.id);
    return { tipo: "cuenta", id: i.id, pide: i.pide, opcion: e?.opcion ?? null, parte, propia: e?.propia ?? null };
  });

  return { quienPaga, reintegro, total, integrantes: resultado };
}
