/**
 * Validador del archivo del corpus (`supabase/seed/promociones.json`), research D7.
 *
 * Un JSON importado no tiene las uniones literales de TypeScript, así que todo
 * se comprueba en runtime. Además de las reglas de la base (`check` de la
 * tabla `promociones`) agrega las del dominio: un tope sin período, un grupo
 * de tope sin registrar o un campo de letra chica sin su fragmento.
 *
 * No lanza: devuelve todos los hallazgos juntos, con el `fuenteId` y la regla
 * rota, para corregir el archivo de una pasada.
 */
import { CATEGORIAS_MODO, camposFaltantes, camposInvalidos, normalizar } from "@vuelto/motor";
import type { BorradorPromocion } from "@vuelto/motor";
import {
  ALCANCES,
  CANALES,
  DIAS,
  JURISDICCIONES_DEL_CORPUS,
  PERIODOS,
  REDES,
  esFechaISO,
} from "./dominio.ts";
import { esObjeto } from "./crudo.ts";
import type { Objeto } from "./crudo.ts";
import { CLAVES_ENTRADA, FUENTE_CORPUS, MOTIVOS_EXCLUSION } from "./tipos.ts";
import type { Exclusion, GruposTope } from "./tipos.ts";

export interface Hallazgo {
  /** `null` si el hallazgo no es de una entrada en particular. */
  fuenteId: string | null;
  regla: string;
  mensaje: string;
}

export interface ResultadoValidacion {
  errores: Hallazgo[];
  avisos: Hallazgo[];
}

export interface ContextoValidacion {
  /** Ids (UUID) del catálogo de bancos de MODO. */
  catalogoBancos: readonly string[];
  gruposTope: GruposTope;
  exclusiones: readonly Exclusion[];
}

const tiene = (o: Objeto, clave: string): boolean => Object.hasOwn(o, clave);
const esTexto = (x: unknown): x is string => typeof x === "string" && x.trim() !== "";
const esNumero = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);
const sinRepetidos = (lista: readonly unknown[]): boolean => new Set(lista).size === lista.length;

function enLista(lista: readonly string[], valor: unknown): boolean {
  return typeof valor === "string" && lista.includes(valor);
}

/** Cada clave obligatoria de las entradas y de los objetos anidados. */
const CLAVES_ANIDADAS: Record<string, readonly string[]> = {
  tarjetas: ["debito", "credito"],
  vigencia: ["desde", "hasta", "dias"],
  tope: ["monto", "periodo", "alcance", "grupoTopeId"],
  revision: ["verificadaEl", "revisor", "notas"],
};

function validarEntrada(
  e: Objeto,
  id: string,
  ctx: ContextoValidacion,
  errores: Hallazgo[],
  fuentesVistas: Set<string>,
): void {
  const error = (regla: string, mensaje: string) => errores.push({ fuenteId: id, regla, mensaje });

  // Claves: ausente no es lo mismo que null (constitución §III).
  for (const clave of CLAVES_ENTRADA) {
    if (!tiene(e, clave)) error("clave-ausente", `falta la clave "${clave}"`);
  }
  for (const [padre, hijas] of Object.entries(CLAVES_ANIDADAS)) {
    const objeto = e[padre];
    if (!esObjeto(objeto)) continue;
    for (const hija of hijas) {
      if (!tiene(objeto, hija)) error("clave-ausente", `falta la clave "${padre}.${hija}"`);
    }
  }

  if (tiene(e, "fuente") && e.fuente !== FUENTE_CORPUS) {
    error("fuente", `la fuente del corpus es "${FUENTE_CORPUS}", no ${JSON.stringify(e.fuente)}`);
  }
  if (tiene(e, "fuenteId")) {
    if (!esTexto(e.fuenteId)) error("fuente-id", "fuenteId tiene que ser un texto no vacío");
    else {
      if (fuentesVistas.has(e.fuenteId)) error("fuente-id-duplicado", `fuenteId repetido: ${e.fuenteId}`);
      fuentesVistas.add(e.fuenteId);
      if (ctx.exclusiones.some((x) => esObjeto(x) && x.slug === e.fuenteId)) {
        error("exclusion-duplicada", `${e.fuenteId} está a la vez en el corpus y en las exclusiones`);
      }
    }
  }
  if (tiene(e, "titulo") && !esTexto(e.titulo)) error("titulo", "titulo tiene que ser un texto no vacío");

  if (tiene(e, "bancoId") && !(typeof e.bancoId === "string" && ctx.catalogoBancos.includes(e.bancoId))) {
    error("banco", `bancoId no está en el catálogo de bancos de MODO: ${JSON.stringify(e.bancoId)}`);
  }
  if (tiene(e, "categoriaId") && !CATEGORIAS_MODO.some((c) => c.id === e.categoriaId)) {
    error("categoria", `categoriaId no es una de las categorías de MODO: ${JSON.stringify(e.categoriaId)}`);
  }
  if (tiene(e, "comercio") && e.comercio !== null && !esTexto(e.comercio)) {
    error("comercio", "comercio tiene que ser un texto no vacío o null");
  }
  if (tiene(e, "porcentaje") && !(esNumero(e.porcentaje) && e.porcentaje > 0 && e.porcentaje <= 100)) {
    error("porcentaje", `porcentaje tiene que estar entre 0 (sin incluir) y 100: ${JSON.stringify(e.porcentaje)}`);
  }
  if (tiene(e, "montoMinimo") && e.montoMinimo !== null && !(esNumero(e.montoMinimo) && e.montoMinimo >= 0)) {
    error("monto-minimo", "montoMinimo tiene que ser un número mayor o igual a 0, o null");
  }
  if (tiene(e, "jurisdiccion") && e.jurisdiccion !== null && !enLista(JURISDICCIONES_DEL_CORPUS, e.jurisdiccion)) {
    error(
      "jurisdiccion",
      e.jurisdiccion === "otra_provincia"
        ? "otra_provincia no entra al corpus: la promo se excluye (decisión 2)"
        : `jurisdiccion fuera del enum: ${JSON.stringify(e.jurisdiccion)}`,
    );
  }
  if (tiene(e, "canal") && e.canal !== null && !enLista(CANALES, e.canal)) {
    error("canal", `canal fuera del enum: ${JSON.stringify(e.canal)}`);
  }
  if (tiene(e, "acumulable") && e.acumulable !== null && typeof e.acumulable !== "boolean") {
    error("acumulable", "acumulable tiene que ser true, false o null");
  }
  if (tiene(e, "fixture") && typeof e.fixture !== "boolean") error("fixture", "fixture tiene que ser un booleano");

  validarTarjetas(e, error);
  validarVigencia(e, error);
  validarTope(e, ctx, error);
  validarFragmentos(e, error);
  validarRevision(e, error);
  validarPublicable(e, id, error);
}

type Informar = (regla: string, mensaje: string) => void;

function validarTarjetas(e: Objeto, error: Informar): void {
  const t = e.tarjetas;
  if (!esObjeto(t)) {
    if (tiene(e, "tarjetas")) error("tarjetas", "tarjetas tiene que ser un objeto { debito, credito }");
    return;
  }
  let total = 0;
  for (const tipo of ["debito", "credito"] as const) {
    if (!tiene(t, tipo)) continue;
    const redes = t[tipo];
    if (!Array.isArray(redes) || !redes.every((r) => enLista(REDES, r))) {
      error("tarjetas", `tarjetas.${tipo} tiene que ser una lista de redes conocidas`);
      continue;
    }
    if (!sinRepetidos(redes)) error("tarjetas", `tarjetas.${tipo} repite una red`);
    total += redes.length;
  }
  if (tiene(t, "debito") && tiene(t, "credito") && total === 0) {
    error("tarjetas", "tiene que haber al menos una red entre débito y crédito");
  }
}

function validarVigencia(e: Objeto, error: Informar): void {
  const v = e.vigencia;
  if (!esObjeto(v)) {
    if (tiene(e, "vigencia")) error("vigencia-fecha", "vigencia tiene que ser un objeto { desde, hasta, dias }");
    return;
  }
  for (const lado of ["desde", "hasta"] as const) {
    if (tiene(v, lado) && !esFechaISO(v[lado])) {
      error("vigencia-fecha", `vigencia.${lado} no es una fecha ISO válida: ${JSON.stringify(v[lado])}`);
    }
  }
  if (esFechaISO(v.desde) && esFechaISO(v.hasta) && v.desde > v.hasta) {
    error("vigencia-orden", `vigencia.desde (${v.desde}) es posterior a vigencia.hasta (${v.hasta})`);
  }
  if (tiene(v, "dias") && v.dias !== null) {
    const dias = v.dias;
    if (!Array.isArray(dias) || dias.length === 0 || !dias.every((d) => enLista(DIAS, d)) || !sinRepetidos(dias)) {
      error("dias", "vigencia.dias tiene que ser null o una lista no vacía de días sin repetir");
    }
  }
}

function validarTope(e: Objeto, ctx: ContextoValidacion, error: Informar): void {
  const t = e.tope;
  if (!esObjeto(t)) {
    if (tiene(e, "tope")) error("tope-monto", "tope tiene que ser un objeto");
    return;
  }
  if (tiene(t, "monto") && t.monto !== null && !(esNumero(t.monto) && t.monto > 0)) {
    error("tope-monto", `tope.monto tiene que ser un número mayor que 0, o null: ${JSON.stringify(t.monto)}`);
  }
  if (tiene(t, "periodo") && t.periodo !== null && !enLista(PERIODOS, t.periodo)) {
    error("tope-periodo", `tope.periodo fuera del enum: ${JSON.stringify(t.periodo)}`);
  }
  if (tiene(t, "alcance") && t.alcance !== null && !enLista(ALCANCES, t.alcance)) {
    error("tope-alcance", `tope.alcance fuera del enum: ${JSON.stringify(t.alcance)}`);
  }
  // Sin período el motor usaría "mensual" en silencio; sin monto no hay a qué aplicarlo.
  if (tiene(t, "monto") && tiene(t, "periodo")) {
    if (t.monto !== null && t.periodo === null) error("tope-periodo", "tope.monto sin tope.periodo");
    if (t.monto === null && t.periodo !== null) error("tope-periodo", "tope.periodo sin tope.monto");
  }
  if (tiene(t, "alcance") && tiene(t, "grupoTopeId")) {
    const compartido = t.alcance === "compartido";
    if (compartido && t.grupoTopeId === null) error("tope-grupo", "alcance compartido sin grupoTopeId");
    if (!compartido && t.grupoTopeId !== null) {
      error("tope-grupo", "grupoTopeId sin alcance compartido: el motor lo ignoraría");
    }
    if (typeof t.grupoTopeId === "string" && !Object.hasOwn(ctx.gruposTope, t.grupoTopeId)) {
      error("tope-grupo", `grupoTopeId no está en grupos-tope.json: ${t.grupoTopeId}`);
    }
  }
}

/** Los campos que solo salen de la letra chica tienen que traer el fragmento de donde salen. */
function validarFragmentos(e: Objeto, error: Informar): void {
  const f = e.fragmentosFuente;
  if (!tiene(e, "fragmentosFuente")) return;
  if (!esObjeto(f) || !Object.values(f).every((v) => v === null || typeof v === "string")) {
    error("fragmento", "fragmentosFuente tiene que ser un objeto { campo: texto | null }");
    return;
  }
  const tope = esObjeto(e.tope) ? e.tope : {};
  const deProsa: [string, unknown][] = [
    ["acumulable", e.acumulable],
    ["jurisdiccion", e.jurisdiccion],
    ["tope.alcance", tope.alcance],
  ];
  for (const [campo, valor] of deProsa) {
    if (valor !== undefined && valor !== null && !esTexto(f[campo])) {
      error("fragmento", `${campo} sale de la letra chica y no tiene su fragmento en fragmentosFuente`);
    }
  }
}

function validarRevision(e: Objeto, error: Informar): void {
  const r = e.revision;
  if (!esObjeto(r)) {
    if (tiene(e, "revision")) error("revision", "revision tiene que ser un objeto { verificadaEl, revisor, notas }");
    return;
  }
  if (tiene(r, "verificadaEl") && !esFechaISO(r.verificadaEl)) {
    error("revision", "revision.verificadaEl no es una fecha ISO válida");
  }
  if (tiene(r, "revisor") && !esTexto(r.revisor)) error("revision", "revision.revisor no puede estar vacío");
  if (tiene(r, "notas") && !(Array.isArray(r.notas) && r.notas.every((n) => typeof n === "string"))) {
    error("revision", "revision.notas tiene que ser una lista de textos");
  }
}

/** `esPromocionPublicable` del motor (RF-16): solo si la forma mínima permite evaluarla. */
function validarPublicable(e: Objeto, id: string, error: Informar): void {
  const { tarjetas, vigencia, tope } = e;
  const evaluable =
    esObjeto(tarjetas) &&
    Array.isArray(tarjetas.debito) &&
    Array.isArray(tarjetas.credito) &&
    esObjeto(vigencia) &&
    esObjeto(tope);
  if (!evaluable) return;
  const borrador = {
    id,
    fuente: FUENTE_CORPUS,
    titulo: e.titulo,
    bancoId: e.bancoId ?? null,
    categoriaId: e.categoriaId ?? null,
    comercio: e.comercio ?? null,
    porcentaje: e.porcentaje ?? null,
    tarjetas,
    vigencia: { desde: vigencia.desde ?? null, hasta: vigencia.hasta ?? null, dias: vigencia.dias ?? null },
    tope: { monto: tope.monto ?? null, periodo: null, alcance: null, grupoTopeId: null },
    montoMinimo: null,
    jurisdiccion: null,
    canal: null,
    acumulable: null,
  } as unknown as BorradorPromocion;
  const hallazgos = [...camposFaltantes(borrador), ...camposInvalidos(borrador)];
  if (hallazgos.length > 0) {
    error("publicable", `no pasa esPromocionPublicable del motor: ${hallazgos.join(", ")}`);
  }
}

function avisarSuperposiciones(entradas: Objeto[], avisos: Hallazgo[]): void {
  const clave = (e: Objeto): string | null =>
    typeof e.bancoId === "string" && typeof e.categoriaId === "number" && esTexto(e.comercio)
      ? `${e.bancoId}|${e.categoriaId}|${normalizar(e.comercio)}`
      : null;
  const rango = (e: Objeto): [string, string] | null => {
    const v = e.vigencia;
    return esObjeto(v) && esFechaISO(v.desde) && esFechaISO(v.hasta) ? [v.desde, v.hasta] : null;
  };
  for (let i = 0; i < entradas.length; i++) {
    for (let j = i + 1; j < entradas.length; j++) {
      const a = entradas[i]!;
      const b = entradas[j]!;
      const k = clave(a);
      if (k === null || k !== clave(b) || a.fuenteId === b.fuenteId) continue;
      const ra = rango(a);
      const rb = rango(b);
      if (ra === null || rb === null || ra[0] > rb[1] || rb[0] > ra[1]) continue;
      avisos.push({
        fuenteId: String(a.fuenteId),
        regla: "comercio-superpuesto",
        mensaje: `${String(a.fuenteId)} y ${String(b.fuenteId)} son del mismo banco, categoría y comercio con vigencias que se superponen: ¿son niveles distintos o la misma promo?`,
      });
    }
  }
}

export function validarArchivo(archivo: unknown, ctx: ContextoValidacion): ResultadoValidacion {
  const errores: Hallazgo[] = [];
  const avisos: Hallazgo[] = [];
  if (!esObjeto(archivo) || archivo.version !== 1 || !Array.isArray(archivo.promociones)) {
    errores.push({
      fuenteId: null,
      regla: "estructura",
      mensaje: 'el archivo tiene que ser { "version": 1, "promociones": [...] }',
    });
    return { errores, avisos };
  }
  // Los registros que acompañan al archivo vienen de otros JSON: si están mal formados se informan con
  // `validarExclusiones` y `validarGruposTope`; acá se los trata como vacíos para no lanzar.
  const contexto: ContextoValidacion = {
    ...ctx,
    exclusiones: Array.isArray(ctx.exclusiones) ? ctx.exclusiones : [],
    gruposTope: esObjeto(ctx.gruposTope) ? ctx.gruposTope : {},
  };
  const objetos: Objeto[] = [];
  const fuentesVistas = new Set<string>();
  archivo.promociones.forEach((entrada: unknown, indice: number) => {
    if (!esObjeto(entrada)) {
      errores.push({ fuenteId: null, regla: "estructura", mensaje: `la entrada ${indice} no es un objeto` });
      return;
    }
    objetos.push(entrada);
    const id = esTexto(entrada.fuenteId) ? entrada.fuenteId : `#${indice}`;
    validarEntrada(entrada, id, contexto, errores, fuentesVistas);
  });
  avisarSuperposiciones(objetos, avisos);
  return { errores, avisos };
}

export function validarExclusiones(exclusiones: unknown): ResultadoValidacion {
  const errores: Hallazgo[] = [];
  if (!Array.isArray(exclusiones)) {
    errores.push({ fuenteId: null, regla: "estructura", mensaje: "exclusiones.json tiene que ser una lista" });
    return { errores, avisos: [] };
  }
  const vistos = new Set<string>();
  exclusiones.forEach((x: unknown, indice: number) => {
    if (!esObjeto(x)) {
      errores.push({ fuenteId: null, regla: "estructura", mensaje: `la exclusión ${indice} no es un objeto` });
      return;
    }
    const id = esTexto(x.slug) ? x.slug : `#${indice}`;
    const error = (regla: string, mensaje: string) => errores.push({ fuenteId: id, regla, mensaje });
    if (!esTexto(x.slug)) error("exclusion-slug", "slug tiene que ser un texto no vacío");
    else if (vistos.has(x.slug)) error("exclusion-slug", `slug repetido: ${x.slug}`);
    else vistos.add(x.slug);
    if (!enLista(MOTIVOS_EXCLUSION, x.motivo)) {
      error("exclusion-motivo", `motivo fuera del conjunto cerrado: ${JSON.stringify(x.motivo)}`);
    }
    if (x.motivo === "otro" && !esTexto(x.detalle)) error("exclusion-detalle", 'el motivo "otro" exige un detalle');
    if (!esFechaISO(x.verificadaEl) || !esTexto(x.revisor)) {
      error("exclusion-revision", "verificadaEl (fecha ISO) y revisor son obligatorios");
    }
  });
  return { errores, avisos: [] };
}

export function validarGruposTope(grupos: unknown): ResultadoValidacion {
  const errores: Hallazgo[] = [];
  if (!esObjeto(grupos)) {
    errores.push({ fuenteId: null, regla: "estructura", mensaje: "grupos-tope.json tiene que ser un objeto" });
    return { errores, avisos: [] };
  }
  for (const [id, g] of Object.entries(grupos)) {
    const error = (mensaje: string) => errores.push({ fuenteId: id, regla: "grupo", mensaje });
    if (!esObjeto(g)) {
      error("el grupo tiene que ser un objeto { banco, clave, fragmento, creadoPor }");
      continue;
    }
    if (!esTexto(g.banco) || !esTexto(g.clave) || id !== `${g.banco}:${g.clave}`) {
      error('la clave del grupo tiene que ser "<banco>:<clave>" y coincidir con sus campos banco y clave');
    }
    if (!esTexto(g.fragmento)) error("fragmento no puede estar vacío");
    if (!esTexto(g.creadoPor)) error("creadoPor no puede estar vacío");
  }
  return { errores, avisos: [] };
}
