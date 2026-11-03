/**
 * Mapeo del detalle de una promo de MODO a las promociones que publica la
 * ingesta (`specs/011-corpus-promociones-seed/data-model.md` §Mapeo, ADR-011).
 *
 * Todo lo que MODO ya trae estructurado se mapea por código. Lo que solo está
 * en la letra chica (acumulabilidad, jurisdicción) queda en `null` hasta que lo
 * lea el extractor de #51: esta función no interpreta la prosa y no usa ningún
 * modelo de lenguaje (constitución §III). Lo que no se puede representar sin
 * sobrestimar el reintegro se descarta solo, con su motivo.
 *
 * Un campo que no reconoce no se ignora: lanza `ErrorDeMapeo` con la ruta del
 * campo, así una promo con un formato nuevo no entra a medias.
 */
import type { Dia, Red } from "@vuelto/motor";
import { contrastar } from "./bancos.ts";
import { bancoDeLaTarjeta, comercioDeLaTarjeta, esObjeto } from "./crudo.ts";
import type { Objeto } from "./crudo.ts";
import { CANALES, DIAS, REDES, esFechaISO } from "./dominio.ts";
import { FUENTE_INGESTA } from "./tipos.ts";
import type { BancoCatalogo, Descarte, MotivoDescarte, PromocionIngestada } from "./tipos.ts";

/** Lo que se guarda en `capturas_crudas`: la tarjeta del listado y el detalle, tal cual (RNF-08). */
export interface Crudo {
  capturadoEl: string;
  url: string;
  /** Tarjeta del listado, tal cual. */
  tarjeta: unknown;
  /** Detalle de la promo, tal cual. */
  detalle: unknown;
}

export interface OpcionesMapeo {
  /** Ids de categoría que se publican: una promo de otras categorías no se emite. */
  categorias: readonly number[];
  /** Fecha ISO de hoy: una promo que ya terminó se descarta aunque MODO la siga listando. */
  hoy: string;
  /** Catálogo de bancos de MODO, para contrastar el nombre del listado con el banco del detalle. `null` = no contrasta. */
  catalogoBancos: readonly BancoCatalogo[] | null;
}

export interface ResultadoMapeo {
  promociones: PromocionIngestada[];
  descartes: Descarte[];
  /** Lo que conviene mirar sin frenar la publicación (una red ignorada, un banco que no cuadra con el listado). */
  avisos: string[];
}

export class ErrorDeMapeo extends Error {
  readonly ruta: string;
  constructor(ruta: string, mensaje: string) {
    super(`${ruta}: ${mensaje}`);
    this.name = "ErrorDeMapeo";
    this.ruta = ruta;
  }
}

function objeto(x: unknown, ruta: string): Objeto {
  if (!esObjeto(x)) throw new ErrorDeMapeo(ruta, "se esperaba un objeto");
  return x;
}

function lista(x: unknown, ruta: string): unknown[] {
  if (!Array.isArray(x)) throw new ErrorDeMapeo(ruta, "se esperaba una lista");
  return x;
}

function texto(x: unknown, ruta: string): string {
  if (typeof x !== "string" || x.trim() === "") throw new ErrorDeMapeo(ruta, "se esperaba un texto no vacío");
  return x;
}

function numeroOCero(x: unknown, ruta: string): number {
  if (x === undefined || x === null) return 0;
  if (typeof x !== "number" || !Number.isFinite(x) || x < 0) throw new ErrorDeMapeo(ruta, "se esperaba un número mayor o igual a 0");
  return x;
}

const DIA_DE_MODO: Readonly<Record<string, Dia>> = {
  monday: "lun",
  tuesday: "mar",
  wednesday: "mie",
  thursday: "jue",
  friday: "vie",
  saturday: "sab",
  sunday: "dom",
};

/** Señales de un nivel de cliente en el nombre, el rótulo del banco o la descripción interna de la promo. */
const NIVEL_DE_CLIENTE = /selecta|\b(?:platinum|black|signature|infinite|nivel\s*\d)\b/i;

/**
 * Los reinicios de tope que el motor representa. `day` y `promo` existen en MODO pero no se
 * aproximan: un tope diario tratado como «por compra» o como semanal puede sobrestimar el
 * saldo (el motor no acumula consumo entre compras del mismo día), así que esas promos se
 * descartan (`tope_no_representable`). Lo mismo una promo con tope por período y
 * además tope por transacción: `Tope` guarda uno solo.
 */
const PERIODO_DE_MODO = { month: "mensual", week: "semanal" } as const;

function mapearDias(schedule: Objeto): Dia[] | null {
  const ruta = "conditions.schedule.days_of_week";
  const dias = lista(schedule.days_of_week, ruta);
  if (dias.length === 0) throw new ErrorDeMapeo(ruta, "la lista de días está vacía");
  const mapeados = new Set<Dia>();
  dias.forEach((dia, i) => {
    const mapeado = typeof dia === "string" && Object.hasOwn(DIA_DE_MODO, dia) ? DIA_DE_MODO[dia] : undefined;
    if (mapeado === undefined) throw new ErrorDeMapeo(`${ruta}[${i}]`, `día desconocido: ${JSON.stringify(dia)}`);
    mapeados.add(mapeado);
  });
  if (mapeados.size === DIAS.length) return null;
  return DIAS.filter((d) => mapeados.has(d));
}

/**
 * Redes de tarjeta que MODO usa y el contrato (`Red`) no representa. Se ignoran
 * con una nota; una red que no está ni en `Red` ni en esta lista es un error,
 * para no perder en silencio una red nueva o mal escrita.
 */
const REDES_NO_SOPORTADAS: readonly string[] = ["patagonia_365"];

interface TarjetasMapeadas {
  debito: Red[];
  credito: Red[];
  /** Redes que se ignoraron por no estar en el contrato. */
  noSoportadas: string[];
}

function mapearTarjetas(conditions: Objeto, notas: string[]): TarjetasMapeadas {
  const ruta = "conditions.payment_methods.methods";
  const metodos = lista(objeto(conditions.payment_methods, "conditions.payment_methods").methods, ruta);
  const tarjetas: TarjetasMapeadas = { debito: [], credito: [], noSoportadas: [] };
  const ignorados = new Set<string>();
  metodos.forEach((metodo, i) => {
    const m = objeto(metodo, `${ruta}[${i}]`);
    const tipo = texto(m.type, `${ruta}[${i}].type`);
    if (tipo !== "debit_card" && tipo !== "credit_card") {
      ignorados.add(tipo);
      return;
    }
    const red = m.issuer;
    if (typeof red === "string" && REDES_NO_SOPORTADAS.includes(red)) {
      if (!tarjetas.noSoportadas.includes(red)) tarjetas.noSoportadas.push(red);
      return;
    }
    if (typeof red !== "string" || !(REDES as readonly string[]).includes(red)) {
      throw new ErrorDeMapeo(`${ruta}[${i}].issuer`, `red desconocida: ${JSON.stringify(red)}`);
    }
    const destino = tipo === "debit_card" ? tarjetas.debito : tarjetas.credito;
    if (!destino.includes(red as Red)) destino.push(red as Red);
  });
  if (ignorados.size > 0) {
    notas.push(`Método de pago ignorado (no es una tarjeta): ${[...ignorados].join(", ")}.`);
  }
  if (tarjetas.noSoportadas.length > 0) {
    notas.push(`Red ignorada (el contrato no la representa): ${tarjetas.noSoportadas.join(", ")}.`);
  }
  return tarjetas;
}

/**
 * `instore` e `instore_nfc` son los pagos con MODO (QR o NFC) en el local;
 * `physical-card` es la tarjeta física, que no pasa por MODO; `all` son todos
 * los canales.
 */
function mapearCanal(conditions: Objeto): (typeof CANALES)[number] | null {
  const ruta = "conditions.payment_flow.flows";
  const flujos = lista(objeto(conditions.payment_flow, "conditions.payment_flow").flows, ruta);
  let presencial = false;
  let online = false;
  let todos = false;
  flujos.forEach((flujo, i) => {
    if (flujo === "instore" || flujo === "instore_nfc" || flujo === "physical-card") presencial = true;
    else if (flujo === "online") online = true;
    else if (flujo === "all") todos = true;
    else throw new ErrorDeMapeo(`${ruta}[${i}]`, `canal desconocido: ${JSON.stringify(flujo)}`);
  });
  if (todos || (presencial && online)) return "ambos";
  if (presencial) return "presencial";
  if (online) return "online";
  return null;
}

interface TopeMapeado {
  monto: number | null;
  periodo: "mensual" | "semanal" | "por_compra" | null;
}

/** Un tope que el motor no puede representar: la promo se descarta. */
interface TopeNoRepresentable {
  noRepresentable: string;
}

function mapearTope(oferta: Objeto): TopeMapeado | TopeNoRepresentable {
  const limites = oferta.limits === undefined || oferta.limits === null ? {} : objeto(oferta.limits, "offers[0].limits");
  const porPeriodo = limites.period_cap === undefined ? {} : objeto(limites.period_cap, "offers[0].limits.period_cap");
  const porTransaccion =
    limites.transaction_cap === undefined ? {} : objeto(limites.transaction_cap, "offers[0].limits.transaction_cap");
  const montoPeriodo = numeroOCero(porPeriodo.amount_by_period, "offers[0].limits.period_cap.amount_by_period");
  const montoTransaccion = numeroOCero(
    porTransaccion.amount_by_transaction,
    "offers[0].limits.transaction_cap.amount_by_transaction",
  );

  if (montoPeriodo > 0) {
    const reinicio = porPeriodo.reset_by;
    if (reinicio === "promo") {
      return { noRepresentable: "El tope vale para toda la duración de la promo (reset_by = promo): no se renueva por mes ni por semana." };
    }
    if (reinicio === "day") {
      return { noRepresentable: "El tope se reinicia por día (reset_by = day): el motor solo representa mensual, semanal y por compra, y aproximarlo puede sobrestimar el saldo." };
    }
    const periodo =
      typeof reinicio === "string" && Object.hasOwn(PERIODO_DE_MODO, reinicio)
        ? PERIODO_DE_MODO[reinicio as keyof typeof PERIODO_DE_MODO]
        : undefined;
    if (periodo === undefined) {
      throw new ErrorDeMapeo("offers[0].limits.period_cap.reset_by", `reinicio desconocido: ${JSON.stringify(reinicio)}`);
    }
    if (montoTransaccion > 0) {
      return {
        noRepresentable: `Tiene tope ${periodo} de $${montoPeriodo} y además tope por transacción de $${montoTransaccion}: el contrato guarda un solo tope, y quedarse con el ${periodo} sobrestima el reintegro de una compra grande.`,
      };
    }
    return { monto: montoPeriodo, periodo };
  }
  if (montoTransaccion > 0) return { monto: montoTransaccion, periodo: "por_compra" };
  return { monto: null, periodo: null };
}

export function mapearDetalle(crudo: Crudo, opciones: OpcionesMapeo): ResultadoMapeo {
  if (!esFechaISO(opciones.hoy)) throw new Error(`hoy no es una fecha ISO: ${opciones.hoy}`);
  const detalle = objeto(crudo.detalle, "detalle");
  const slug = texto(detalle.slug, "slug");
  const titulo = texto(detalle.name, "name");

  const descartar = (motivo: MotivoDescarte, detalleTexto: string | null): ResultadoMapeo => ({
    promociones: [],
    descartes: [{ slug, motivo, detalle: detalleTexto }],
    avisos: [],
  });

  if (typeof detalle.real_status === "string" && detalle.real_status !== "RUNNING") {
    return descartar("vencida_en_la_fuente", `real_status = ${detalle.real_status}`);
  }
  if (typeof detalle.type === "string" && detalle.type !== "cashback") {
    return descartar("no_es_reintegro", `type = ${detalle.type}`);
  }
  const ofertas = lista(detalle.offers, "offers");
  if (ofertas.length !== 1) {
    return descartar("otro", `La promo tiene ${ofertas.length} ofertas: el mapeo lee una sola.`);
  }
  const oferta = objeto(ofertas[0], "offers[0]");

  const resultados = objeto(oferta.outcomes, "offers[0].outcomes");
  if (!esObjeto(resultados.cashback)) return descartar("no_es_reintegro", "la oferta no tiene cashback");
  if (resultados.cashback.amount_type !== "percent") {
    return descartar("no_es_reintegro", `cashback.amount_type = ${JSON.stringify(resultados.cashback.amount_type)}`);
  }
  const porcentaje = resultados.cashback.amount;
  if (typeof porcentaje !== "number" || !Number.isFinite(porcentaje)) {
    throw new ErrorDeMapeo("offers[0].outcomes.cashback.amount", "se esperaba un número");
  }

  const categorias = lista(oferta.categories, "offers[0].categories").map((c, i) => {
    const id = Number(c);
    if (!Number.isInteger(id)) throw new ErrorDeMapeo(`offers[0].categories[${i}]`, `categoría inválida: ${JSON.stringify(c)}`);
    return id;
  });
  if (categorias.length === 0) throw new ErrorDeMapeo("offers[0].categories", "la lista de categorías está vacía");

  // Una promo que además vale en categorías que no se publican se emite solo en las que sí.
  const propias = categorias.filter((c) => opciones.categorias.includes(c));
  if (propias.length === 0) return { promociones: [], descartes: [], avisos: [] };
  if (categorias.length > 3) {
    return descartar("transversal", `La promo vale en ${categorias.length} categorías (${categorias.join(", ")}).`);
  }

  // El perfil del usuario no distingue niveles de cliente: la promo no se puede recomendar bien.
  const rotuloDelBanco = bancoDeLaTarjeta(crudo.tarjeta);
  const descripcionInterna = typeof detalle.short_description === "string" ? detalle.short_description : "";
  const nivel = [titulo, rotuloDelBanco ?? "", descripcionInterna].join(" ").match(NIVEL_DE_CLIENTE);
  if (nivel !== null) {
    return descartar("nivel_de_cliente", `El nombre o la descripción indican un nivel de cliente («${nivel[0]}»): el perfil no lo distingue.`);
  }

  const requisitos = objeto(oferta.requirements, "offers[0].requirements");
  const bancos = lista(objeto(requisitos.banks, "offers[0].requirements.banks").list, "offers[0].requirements.banks.list").map(
    (id, i) => texto(id, `offers[0].requirements.banks.list[${i}]`),
  );
  if (bancos.length === 0) return descartar("banco_no_determinado", "la promo no lista ningún banco");

  const conditions = objeto(detalle.conditions, "conditions");
  const schedule = objeto(conditions.schedule, "conditions.schedule");
  for (const lado of ["start_date", "stop_date"] as const) {
    if (!esFechaISO(schedule[lado])) throw new ErrorDeMapeo(`conditions.schedule.${lado}`, "se esperaba una fecha ISO");
  }
  if ((schedule.stop_date as string) < opciones.hoy) {
    return descartar("vencida_en_la_fuente", `Terminó el ${schedule.stop_date as string} y MODO la sigue listando.`);
  }
  const dias = mapearDias(schedule);

  const notas: string[] = [];
  const tarjetas = mapearTarjetas(conditions, notas);
  if (tarjetas.debito.length + tarjetas.credito.length === 0 && tarjetas.noSoportadas.length > 0) {
    return descartar("otro", `Solo acepta redes que el contrato no representa: ${tarjetas.noSoportadas.join(", ")}.`);
  }
  const canal = mapearCanal(conditions);
  const tope = mapearTope(oferta);
  if ("noRepresentable" in tope) return descartar("tope_no_representable", tope.noRepresentable);

  const minimo = esObjeto(requisitos.amount_range) ? numeroOCero(requisitos.amount_range.min, "offers[0].requirements.amount_range.min") : 0;
  const comercio = comercioDeLaTarjeta(crudo.tarjeta);
  // Con un solo banco, el rótulo del listado tiene que ser ese banco; en una promo multibanco es «Bancos adheridos».
  // Si no cuadra se avisa, pero manda el id del detalle, que es el dato estructurado.
  if (opciones.catalogoBancos !== null && bancos.length === 1 && rotuloDelBanco !== null) {
    try {
      const contraste = contrastar(rotuloDelBanco, bancos[0]!, opciones.catalogoBancos);
      if (contraste.mensaje !== null) notas.push(contraste.mensaje);
    } catch (error) {
      notas.push(`No se pudo contrastar el banco: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Una promo partida (por banco o por categoría) es una sola oferta de MODO con un solo tope por usuario:
  // las partes comparten el saldo. Tratarlas como topes separados sumaría un tope por banco y sobrestimaría
  // lo que queda por recuperar (constitución §V).
  const partida = bancos.length * propias.length > 1 || categorias.length > 1;
  const compartido = partida && tope.monto !== null && tope.periodo !== "por_compra";
  const fragmentosFuente: Record<string, string | null> = compartido
    ? { "tope.alcance": `offers[0].limits: una sola oferta de MODO para ${bancos.length} banco(s) y ${categorias.length} categoría(s).` }
    : {};

  const promociones: PromocionIngestada[] = [];
  for (const bancoId of bancos) {
    for (const categoriaId of propias) {
      const partes: string[] = [];
      if (bancos.length > 1) partes.push(`b-${bancoId.slice(0, 8)}`);
      if (categorias.length > 1) partes.push(`c-${categoriaId}`);
      promociones.push({
        fuenteId: partes.length === 0 ? slug : `${slug}#${partes.join(".")}`,
        fuente: FUENTE_INGESTA,
        titulo,
        bancoId,
        categoriaId,
        comercio,
        porcentaje,
        tarjetas: { debito: [...tarjetas.debito], credito: [...tarjetas.credito] },
        vigencia: { desde: schedule.start_date as string, hasta: schedule.stop_date as string, dias },
        tope: {
          monto: tope.monto,
          periodo: tope.periodo,
          alcance: compartido ? "compartido" : null,
          grupoTopeId: compartido ? `modo:${slug}` : null,
        },
        montoMinimo: minimo > 0 ? minimo : null,
        jurisdiccion: null,
        canal,
        acumulable: null,
        fragmentosFuente: { ...fragmentosFuente },
      });
    }
  }
  return { promociones, descartes: [], avisos: notas.map((n) => `${slug}: ${n}`) };
}

export type IntentoDeMapeo = { ok: true; resultado: ResultadoMapeo } | { ok: false; ruta: string };

/** `mapearDetalle` que, ante un formato que no reconoce, devuelve la ruta del campo en vez de lanzar. */
export function intentarMapear(crudo: Crudo, opciones: OpcionesMapeo): IntentoDeMapeo {
  try {
    return { ok: true, resultado: mapearDetalle(crudo, opciones) };
  } catch (error) {
    if (!(error instanceof ErrorDeMapeo)) throw error;
    return { ok: false, ruta: error.ruta };
  }
}
