# Research: estimar el tope restante

Sin `NEEDS CLARIFICATION`: las decisiones de producto se cerraron con el usuario y `spec-critic`.
Siguen vigentes las decisiones técnicas de las issues #36 y #37 (centavos, hora de Argentina sin
`Intl`, comparación por código de carácter, saldos calculados una vez por consulta).

## R1. `clasificarTope` (FR-012)

- **Decisión**: en `tope.ts`, `clasificarTope(promo): ClaseDeTope` con
  `{ tipo: "sin_tope" } | { tipo: "por_compra"; monto } | { tipo: "acumulable"; monto; periodo;
  grupo }` (monto en centavos; `periodo` `null` → `"mensual"`; `grupo` = `grupoTopeId` solo si
  es miembro según FR-001 de la issue #37). La usan `calcularSaldos`, `recomendar` (tope por
  compra) y `motivoOpcion` (texto "por compra" y "no informa tope").
- **Rationale**: hoy la misma regla se lee en cuatro lugares (revisión de la issue #37). Con una
  unión discriminada, TypeScript obliga a cubrir los tres casos en cada uso.
- **Verificación**: `grep "tope\.\(monto\|periodo\|alcance\|grupoTopeId\)"` en `src/*.ts` sin
  tests solo debe encontrar la función.

## R2. Saldo con su grupo

- **Decisión**: `Saldo` suma `grupoTopeId: string | null`. Para encontrar las promos de un saldo,
  `estimarTopes` recorre las promociones y agrupa por el objeto `Saldo` al que apuntan (los
  miembros de un grupo comparten el mismo objeto desde la issue #37).
- **Rationale**: no hace falta guardar la lista de miembros en el saldo; el `Map` ya la da.

## R3. Fechas del período y del texto

- **Decisión**: `fecha.ts` suma `finDelPeriodo(periodo, hoy)` (último día del mes con
  `Date.UTC(año, mes + 1, 0)`, o el domingo = inicio + 6 días), `diaSiguiente(fecha)` y
  `nombreDelMes(fecha)` con una tabla de los 12 nombres en español (sin `Intl`).
- **Rationale**: mismo criterio que `inicioDelPeriodo`: aritmética UTC sobre la `FechaISO`, que
  ya está en hora de Argentina.

## R4. `formatearEstimacion(estimacion)` sin `ahora`

- **Decisión**: el mes del texto sale de `estimacion.periodo.desde`, así la función no necesita
  `ahora` (se ajustó FR-007 de la spec).
- **Rationale**: un parámetro que no cambia el resultado sería un parámetro de más; el período
  de la estimación ya es el de la consulta.

## R5. Umbral y cifra en centavos

- **Decisión**: el estado se calcula con `aCentavos` de restante y tope (`restante × 5 ≤ tope`);
  la cifra con `Math.floor(restanteCentavos / 10000) × 100` pesos, formateada con el mismo
  `pesos()` de `motivos.ts` (que pasa a exportarse). Si da 0: "menos de $100".
- **Rationale**: FR-008 y FR-009; evita que "≈$2.000" de $10.000 se lea como 20%.

## R6. Dónde viven las funciones nuevas

- **Decisión**: `estimar.ts` con `estimarTopes` y `formatearEstimacion`; tipos públicos
  (`EstimacionTope`, `EstadoTope`, `TextoEstimacion`) en `tipos.ts`; `index.ts` exporta las dos
  funciones.
- **Rationale**: un módulo por caso de uso, como `recomendar.ts`. `tope.ts` sigue siendo el
  cálculo compartido.
