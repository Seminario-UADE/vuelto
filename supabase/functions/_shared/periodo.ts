/**
 * Lo que las Edge Functions que recomiendan (`recomendar`, `recomendar-grupo`) necesitan para
 * juntar los datos del motor, en un solo lugar (ADR-009: lo común va en `_shared/`).
 */
import { inicioDelPeriodo, type FechaISO, type Promocion } from "@vuelto/motor";

/**
 * Desde cuándo leer compras: el inicio del mes o el de la semana de `hoy`, lo que sea anterior.
 * Si no, el tope semanal falla en las semanas que cruzan de mes (precondición del motor, #37).
 */
export function inicioDeConsumos(hoy: FechaISO): FechaISO {
  const inicioMes = inicioDelPeriodo("mensual", hoy);
  const inicioSemana = inicioDelPeriodo("semanal", hoy);
  return inicioSemana < inicioMes ? inicioSemana : inicioMes;
}

/**
 * Las promos que referencian las compras y no vinieron con el rubro (vencidas o de otro rubro):
 * el motor las necesita para descontar los topes compartidos, y las descarta (#37).
 */
export function promosReferenciadasQueFaltan(
  consumos: readonly { promocionId: string | null }[],
  yaEstan: readonly Promocion[],
): string[] {
  const ids = new Set(yaEstan.map((p) => p.id));
  const faltan = new Set<string>();
  for (const c of consumos) if (c.promocionId !== null && !ids.has(c.promocionId)) faltan.add(c.promocionId);
  return [...faltan];
}
