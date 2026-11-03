/**
 * "Promos actualizadas hace X" (spec 009 FR-019): función pura sobre `ahora` y la fecha de la última
 * sincronización exitosa. Con datos de ejemplo (nunca sincronizó) no hay leyenda.
 */
const MINUTO = 60_000;
const HORA = 60 * MINUTO;
const DIA = 24 * HORA;

export function textoFrescura(ahora: Date, sincronizadoEn: string | null): string | null {
  if (sincronizadoEn === null) return null;
  const instante = Date.parse(sincronizadoEn);
  if (Number.isNaN(instante)) return null;
  // Una diferencia negativa (el teléfono cambió la hora) se trata como cero.
  const ms = Math.max(0, ahora.getTime() - instante);
  if (ms < HORA) return "Promos actualizadas hace unos minutos";
  if (ms < DIA) {
    const horas = Math.floor(ms / HORA);
    return `Promos actualizadas hace ${horas} ${horas === 1 ? "hora" : "horas"}`;
  }
  const dias = Math.floor(ms / DIA);
  return `Promos actualizadas hace ${dias} ${dias === 1 ? "día" : "días"}`;
}
