/**
 * Qué días se pueden elegir como fecha de la compra (spec 014, FR-010).
 * Las fechas son `AAAA-MM-DD` del día local, como en el resto de la app.
 */

export type RangoDeDias = {
  /** El día de la simulación, si hay compra por confirmar; `null` si no la hay. */
  desde: string | null;
  hoy: string;
};

export type DiaDelCalendario = {
  dia: string;
  /** 0 = domingo … 6 = sábado. */
  diaDeLaSemana: number;
  permitido: boolean;
};

function dosDigitos(n: number): string {
  return String(n).padStart(2, "0");
}

function existe(dia: string): boolean {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dia);
  if (!partes) return false;
  const [anio, mes, d] = [Number(partes[1]), Number(partes[2]), Number(partes[3])];
  const fecha = new Date(Date.UTC(anio, mes - 1, d));
  return fecha.getUTCFullYear() === anio && fecha.getUTCMonth() === mes - 1 && fecha.getUTCDate() === d;
}

/** Entre la simulación y hoy (incluidos); sin simulación, cualquier día hasta hoy. Nunca uno futuro. */
export function diaPermitido(dia: string, { desde, hoy }: RangoDeDias): boolean {
  if (!existe(dia) || dia > hoy) return false;
  return desde === null || dia >= desde;
}

/** Los días de un mes (`AAAA-MM`) para el calendario, con los que se pueden elegir. */
export function diasDelMes(mes: string, rango: RangoDeDias): DiaDelCalendario[] {
  const [anio, numero] = mes.split("-").map(Number) as [number, number];
  const cantidad = new Date(Date.UTC(anio, numero, 0)).getUTCDate();
  return Array.from({ length: cantidad }, (_, i) => {
    const dia = `${mes}-${dosDigitos(i + 1)}`;
    return {
      dia,
      diaDeLaSemana: new Date(Date.UTC(anio, numero - 1, i + 1)).getUTCDay(),
      permitido: diaPermitido(dia, rango),
    };
  });
}
