/**
 * Última barrera antes de publicar una promo (research D7, ADR-011).
 *
 * El mapeo ya devuelve tipos del motor, pero los valores salen de una API de
 * terceros: acá se comprueban los rangos y las reglas que la base exige con
 * `check` (y algunas que no), más `esPromocionPublicable` del motor (RF-16). Una
 * promo que no pasa se descarta sola, con la lista de reglas rotas: no hay
 * revisión humana (ADR-005).
 */
import { CATEGORIAS_MODO, camposFaltantes, camposInvalidos } from "@vuelto/motor";
import type { BorradorPromocion } from "@vuelto/motor";
import { ALCANCES, CANALES, DIAS, JURISDICCIONES_DEL_CORPUS, PERIODOS, REDES, esFechaISO } from "./dominio.ts";
import { FUENTE_INGESTA } from "./tipos.ts";
import type { PromocionIngestada } from "./tipos.ts";

const esTexto = (x: unknown): x is string => typeof x === "string" && x.trim() !== "";
const esNumero = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);
const sinRepetidos = (lista: readonly unknown[]): boolean => new Set(lista).size === lista.length;
const enLista = (lista: readonly string[], valor: unknown): boolean => typeof valor === "string" && lista.includes(valor);

/** Las reglas que rompe la promo, como `regla: mensaje`. Vacía = se puede publicar. */
export function validarPromocion(p: PromocionIngestada, bancos: ReadonlySet<string>): string[] {
  const errores: string[] = [];
  const error = (regla: string, mensaje: string) => errores.push(`${regla}: ${mensaje}`);

  if (p.fuente !== FUENTE_INGESTA) error("fuente", `la fuente de la ingesta es "${FUENTE_INGESTA}", no ${JSON.stringify(p.fuente)}`);
  if (!esTexto(p.fuenteId)) error("fuente-id", "fuenteId tiene que ser un texto no vacío");
  if (!esTexto(p.titulo)) error("titulo", "titulo tiene que ser un texto no vacío");
  if (p.bancoId === null || !bancos.has(p.bancoId)) {
    error("banco", `bancoId no está en el catálogo de bancos de MODO: ${JSON.stringify(p.bancoId)}`);
  }
  if (!CATEGORIAS_MODO.some((c) => c.id === p.categoriaId)) {
    error("categoria", `categoriaId no es una de las categorías de MODO: ${JSON.stringify(p.categoriaId)}`);
  }
  if (p.comercio !== null && !esTexto(p.comercio)) error("comercio", "comercio tiene que ser un texto no vacío o null");
  if (!(esNumero(p.porcentaje) && p.porcentaje > 0 && p.porcentaje <= 100)) {
    error("porcentaje", `porcentaje tiene que estar entre 0 (sin incluir) y 100: ${JSON.stringify(p.porcentaje)}`);
  }
  if (p.montoMinimo !== null && !(esNumero(p.montoMinimo) && p.montoMinimo >= 0)) {
    error("monto-minimo", "montoMinimo tiene que ser un número mayor o igual a 0, o null");
  }
  if (p.jurisdiccion !== null && !enLista(JURISDICCIONES_DEL_CORPUS, p.jurisdiccion)) {
    error("jurisdiccion", `jurisdiccion fuera del alcance del MVP: ${JSON.stringify(p.jurisdiccion)}`);
  }
  if (p.canal !== null && !enLista(CANALES, p.canal)) error("canal", `canal fuera del enum: ${JSON.stringify(p.canal)}`);

  // Tarjetas.
  let redes = 0;
  for (const tipo of ["debito", "credito"] as const) {
    const lista = p.tarjetas[tipo];
    if (!lista.every((r) => enLista(REDES, r))) error("tarjetas", `tarjetas.${tipo} tiene una red desconocida`);
    if (!sinRepetidos(lista)) error("tarjetas", `tarjetas.${tipo} repite una red`);
    redes += lista.length;
  }
  if (redes === 0) error("tarjetas", "tiene que haber al menos una red entre débito y crédito");

  // Vigencia.
  const { desde, hasta, dias } = p.vigencia;
  if (!esFechaISO(desde) || !esFechaISO(hasta)) error("vigencia-fecha", "vigencia.desde y vigencia.hasta tienen que ser fechas ISO");
  else if (desde > hasta) error("vigencia-orden", `vigencia.desde (${desde}) es posterior a vigencia.hasta (${hasta})`);
  if (dias !== null && (dias.length === 0 || !dias.every((d) => enLista(DIAS, d)) || !sinRepetidos(dias))) {
    error("dias", "vigencia.dias tiene que ser null o una lista no vacía de días sin repetir");
  }

  // Tope: sin período el motor usaría «mensual» en silencio; sin monto no hay a qué aplicarlo.
  const t = p.tope;
  if (t.monto !== null && !(esNumero(t.monto) && t.monto > 0)) error("tope-monto", `tope.monto tiene que ser mayor que 0, o null`);
  if (t.periodo !== null && !enLista(PERIODOS, t.periodo)) error("tope-periodo", `tope.periodo fuera del enum: ${JSON.stringify(t.periodo)}`);
  if ((t.monto === null) !== (t.periodo === null)) error("tope-periodo", "tope.monto y tope.periodo van juntos");
  if (t.alcance !== null && !enLista(ALCANCES, t.alcance)) error("tope-alcance", `tope.alcance fuera del enum: ${JSON.stringify(t.alcance)}`);
  if ((t.alcance === "compartido") !== (t.grupoTopeId !== null)) {
    error("tope-grupo", "alcance compartido y grupoTopeId van juntos (si no, el motor ignora el grupo)");
  }

  // Lo que sale de la letra chica tiene que decir de dónde salió.
  const deProsa: [string, unknown][] = [
    ["acumulable", p.acumulable],
    ["jurisdiccion", p.jurisdiccion],
    ["tope.alcance", t.alcance],
  ];
  for (const [campo, valor] of deProsa) {
    if (valor !== null && !esTexto(p.fragmentosFuente[campo])) {
      error("fragmento", `${campo} no tiene su fuente en fragmentosFuente`);
    }
  }

  const borrador = { ...p, id: p.fuenteId } as unknown as BorradorPromocion;
  const noPublicable = [...camposFaltantes(borrador), ...camposInvalidos(borrador)];
  if (noPublicable.length > 0) error("publicable", `no pasa esPromocionPublicable del motor: ${noPublicable.join(", ")}`);
  return errores;
}
