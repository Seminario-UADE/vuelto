# Research: topes compartidos, períodos y acumulables

No hay `NEEDS CLARIFICATION`: las decisiones de producto se cerraron con el usuario y con
`spec-critic` (ver spec). Este documento registra las decisiones técnicas. Las de
`specs/002-motor-recomendar/research.md` siguen vigentes (centavos, hora de Argentina sin `Intl`,
comparación por código de carácter, `PerfilSinMediosError`).

## R1. El saldo como unidad del cálculo

- **Decisión**: `tope.ts` pasa de "estado de tope de una promo" a **saldos**. Una función
  `calcularSaldos(promociones, compras, hoy)` arma, una vez por llamada, un `Map` de cada promoción
  con saldo a su `Saldo` (`{ tope, periodo, consumido, restante, base }`, en centavos). Las
  promociones de un mismo grupo apuntan al **mismo objeto** `Saldo`; las de saldo propio, a uno
  suyo. Las promociones por compra no tienen saldo.
- **Rationale**: el saldo es lo que comparten las promos de un grupo, lo que la combinación no
  puede superar (FR-010) y lo que la issue #38 va a mostrar en «Mis topes». Calcularlo una vez
  mantiene la complejidad en O(P + C) (SC-006 de la issue #36).
- **Alternativas**: seguir calculando por promoción y sumar grupos después (duplica el consumo de
  las compras del grupo y complica el reparto de FR-010).

## R2. Miembros, monto y período de un grupo

- **Decisión**: clave de saldo = `grupo:<grupoTopeId>` si la promo es miembro (FR-001:
  `alcance === "compartido"`, `grupoTopeId !== null`, período distinto de `"por_compra"`); si no,
  `promo:<id>`. El monto del grupo es el mínimo entre los miembros vigentes en `hoy` que informan
  tope; el período, el más largo entre esos mismos (`mensual` > `semanal`, `null` = `mensual`).
  Los miembros no vigentes solo aportan compras.
- **Rationale**: FR-002 y la decisión del usuario de que las promos vencidas no achiquen el saldo.
  El prefijo evita que un `grupoTopeId` coincida por casualidad con el id de una promoción.

## R3. Período vigente

- **Decisión**: `fecha.ts` suma `inicioDelPeriodo(periodo, hoy)`: `mensual` →
  `YYYY-MM-01`; `semanal` → el lunes de la semana de `hoy`, calculado con `Date.UTC` sobre la
  `FechaISO` (`getUTCDay()`, domingo = 0 ⇒ retrocede 6 días). Una compra entra si
  `inicio ≤ fecha ≤ hoy`, comparando `FechaISO` como strings.
- **Rationale**: reemplaza la comparación `mesDe(fecha) === mesDe(hoy)` de la issue #36 por un
  rango, que sirve igual para el mes y para una semana que cruza de mes.

## R4. Armado de opciones por medio (FR-008)

- **Decisión**: después de las reglas y del tope agotado, para cada medio del perfil se toman las
  promos que le aplican. Las de `acumulable === true` forman una opción combinada si son dos o
  más (una sola es una opción individual); cada una de las demás, su propia opción.
- **Rationale**: la combinada siempre ahorra igual o más que cualquiera de sus partes, así que
  reemplazarlas no esconde ninguna opción mejor. Las no acumulables siguen compitiendo contra la
  combinada en el ranking.

## R5. Reparto del saldo dentro de una opción (FR-009, FR-010, FR-012)

- **Decisión**: las promos de la opción se ordenan por ahorro sin tope descendente y luego por id
  (ese es también el orden de la lista `promociones` y del motivo, FR-014). Se recorren con un
  `Map<Saldo, restante>` local a la opción: cada promo toma `min(ahorroSinTope, restante)` (o
  `min(ahorroSinTope, topePorCompra)` si es por compra, o el ahorro sin tope si no informa tope) y
  descuenta lo que tomó. Al final, cada promo informa como `topeRestanteTrasCompra` el restante
  final de su saldo, así las que comparten saldo informan el mismo valor.
- **Rationale**: determinístico, y respeta el saldo aunque dos promos del grupo se combinen. Una
  promo que llega con restante 0 toma $0 y queda en la opción (decisión del usuario).

## R6. Contrato nuevo de la opción

- **Decisión**: `OpcionDePago = { medioDePagoId, ahorroEstimado, promociones: PromocionAplicada[],
  motivo }` y `PromocionAplicada = { promocionId, ahorroEstimado, topeRestanteTrasCompra, base }`.
  Se eliminan `promocionId`, `topeRestanteTrasCompra` y `base` del nivel de la opción.
- **Rationale**: Key Entities de la spec. Desaparece el `promocionId: null` que la issue #36 nunca
  producía (`specs/002-motor-recomendar/research.md` R10): una opción siempre tiene al menos una
  promo. Hoy no hay consumidores del contrato (issues #43 y #38 sin empezar).

## R7. Desempate de opciones (FR-013)

- **Decisión**: ahorro total desc → `medioDePagoId` → ids de `promociones` ordenados por código y
  unidos con `,`, comparados por código.
- **Rationale**: extiende el desempate de la issue #36 a opciones con varias promos sin depender
  del orden de entrada.

## R8. Cobertura (FR-018)

- **Decisión**: `@vitest/coverage-v8` `5.0.x` (misma versión menor que `vitest` 5.0.4) como
  devDependency de `packages/motor`; `vitest.config.ts` con `coverage.provider = "v8"`,
  `include: ["src/**/*.ts"]`, `exclude` de `*.test.ts` y `src/test/**`, y
  `thresholds.lines = 90`. El script `test` del motor pasa a `vitest run --coverage`, así el job
  `test` del CI ya falla si baja la cobertura, sin un job nuevo.
- **Rationale**: un solo lugar (el script) para local y CI. `v8` no instrumenta el código.
- **Alternativas**: `@vitest/coverage-istanbul` (más lento, sin ventaja acá); un job aparte de
  cobertura (duplica `npm ci` y la corrida de tests).

## R9. Compatibilidad con la issue #38

- `calcularSaldos` se exporta desde `tope.ts` (no desde `index.ts`) para que la issue #38 la use
  dentro del motor. La issue #38 decide qué expone públicamente.
