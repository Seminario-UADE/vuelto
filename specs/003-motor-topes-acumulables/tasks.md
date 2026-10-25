---

description: "Tareas para topes semanales, compartidos y promos acumulables (issue #37)"
---

# Tasks: Motor — topes compartidos, períodos del tope y promociones acumulables

**Input**: `specs/003-motor-topes-acumulables/` (spec.md, plan.md, research.md, data-model.md, contracts/recomendar.md, quickstart.md)

**Tests**: obligatorios (constitución §VI, FR-017). En cada historia, los tests van antes que el código y tienen que fallar primero.

**Organización**: por historia de usuario. La migración del contrato va en la fase base, porque las tres historias la usan.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede hacer en paralelo (otro archivo, sin depender de tareas sin terminar)
- **[Story]**: US1 (períodos), US2 (acumulables), US3 (tope compartido)
- El código vive en `packages/motor/src/`.

---

## Phase 1: Setup

- [ ] T001 Sumar `@vitest/coverage-v8` `5.0.x` como devDependency de `packages/motor/package.json` (`npm install -D -w @vuelto/motor @vitest/coverage-v8@~5.0.4`, actualiza `package-lock.json`); crear `packages/motor/vitest.config.ts` con `coverage: { provider: "v8", include: ["src/**/*.ts"], exclude: ["src/**/*.test.ts", "src/test/**"], thresholds: { lines: 90 } }`; cambiar el script `test` del motor a `vitest run --coverage`. Verificar que la suite actual pasa y anotar la cobertura de partida (research R8).

---

## Phase 2: Foundational (bloquea las historias)

**Purpose**: contrato nuevo de la opción y saldos, sin cambiar todavía el comportamiento de la issue #36.

- [ ] T002 Cambiar el contrato en `packages/motor/src/tipos.ts` según `data-model.md`: nueva `interface PromocionAplicada { promocionId: string; ahorroEstimado: number; topeRestanteTrasCompra: number | null; base: BaseEstimacion | null }`; `OpcionDePago` pasa a `{ medioDePagoId: string; ahorroEstimado: number; promociones: PromocionAplicada[]; motivo: string }` (salen `promocionId`, `topeRestanteTrasCompra` y `base`). Sin `?:`.
- [ ] T003 Adaptar `packages/motor/src/recomendar.ts` al contrato nuevo sin cambiar el comportamiento: cada opción lleva una sola `PromocionAplicada`; desempate por `medioDePagoId` y luego por los ids de `promociones` ordenados y unidos con `","` (research R7). Adaptar `packages/motor/src/recomendar.test.ts` y `elegibilidad.test.ts` (accesos a `mejor.promocionId`, `topeRestanteTrasCompra`, `base` → `mejor.promociones[0]...`). Toda la suite de la issue #36 tiene que seguir en verde.
- [ ] T004 [P] Escribir en `packages/motor/src/fecha.test.ts` los tests de `inicioDelPeriodo(periodo, hoy)`: `("mensual", "2026-10-21") → "2026-10-01"`; `("semanal", "2026-10-21") → "2026-10-19"` (miércoles → lunes); `("semanal", "2026-10-19") → "2026-10-19"` (lunes); `("semanal", "2026-10-25") → "2026-10-19"` (domingo); `("semanal", "2026-11-01") → "2026-10-26"` (cruza de mes).
- [ ] T005 Implementar `inicioDelPeriodo(periodo: "mensual" | "semanal", hoy: FechaISO): FechaISO` en `packages/motor/src/fecha.ts` con `Date.UTC` sobre la `FechaISO` (domingo = 0 retrocede 6 días), sin `Intl` (research R3). Hace pasar T004.
- [ ] T006 Reescribir `packages/motor/src/tope.ts` sobre saldos (research R1): `interface Saldo { tope: number | null; periodo: "mensual" | "semanal"; consumido: number; restante: number | null; base: BaseEstimacion | null }` en centavos y `calcularSaldos(promociones, compras, hoy): Map<string, Saldo>` (clave = id de promoción), por ahora solo con saldos propios y período mensual (`"semanal"` y `"por_compra"` se suman en US1, grupos en US3). Compras del saldo: mismo `promocionId` y `inicioDelPeriodo ≤ fecha ≤ hoy`. Mismas reglas de consumo que la issue #36. Reescribir `packages/motor/src/tope.test.ts` sobre `calcularSaldos` con los casos actuales y adaptar `recomendar.ts` para usarlo. Suite en verde.

**Checkpoint**: lint, typecheck y tests en verde, mismo comportamiento que la issue #36 con el contrato nuevo.

---

## Phase 3: User Story 1 — Que el tope se renueve cuando corresponde (P1) 🎯 MVP

**Goal**: topes semanales y por compra.

**Independent Test**: promos semanales, mensuales y por compra con compras antes y dentro del período.

- [ ] T007 [P] [US1] Ampliar `packages/motor/src/tope.test.ts`: semanal con compra del lunes 19/10 ($4.000 de $6.000 ⇒ restante $2.000, base `{1, 0}`); compra del domingo 18/10 no cuenta; semana que cruza de mes (compra del 31/10 cuenta para una consulta del 1/11 si es semanal y no si es mensual); `periodo: null` ⇒ mensual; una promo `"por_compra"` no tiene saldo en el `Map`.
- [ ] T008 [P] [US1] Ampliar `packages/motor/src/recomendar.test.ts` con US1-1 a US1-5: semanal (ahorro $2.000, restante $0, base `{1, 0}`), semana anterior (ahorro $2.000, restante $4.000, base `{0, 0}`), semanal agotado (descarte `tope_agotado` con base), por compra de $3.000 con $9.000 ya recibidos este mes (ahorro $3.000, `topeRestanteTrasCompra: null`, `base: null`, motivo con "$3.000 por compra"), mensual igual que la issue #36; y tope por compra de $0 ⇒ descarte `tope_agotado` con `base: null` (FR-015).
- [ ] T009 [P] [US1] Ampliar `packages/motor/src/motivos.test.ts`: `motivoOpcion` de una promo de 20% con tope por compra de $3.000 ⇒ `"20% en supermercados · hasta $3.000 por compra"`.
- [ ] T010 [US1] En `packages/motor/src/tope.ts`, usar el período de la promo (`"semanal"` o `"mensual"`, `null` = mensual) con `inicioDelPeriodo`, y no crear saldo para `"por_compra"` (FR-006, FR-007). Hace pasar T007.
- [ ] T011 [US1] En `packages/motor/src/motivos.ts`, agregar al motivo de opción el sufijo `" · hasta $X por compra"` cuando el tope es por compra (con el formateador `pesos` existente). En `packages/motor/src/recomendar.ts`, para promos por compra: ahorro `min(sin tope, tope por compra)`, `topeRestanteTrasCompra` y `base` `null`; tope por compra de $0 ⇒ descarte `tope_agotado` con `base: null`. Hace pasar T008 y T009.

**Checkpoint**: US1 en verde; los criterios de la issue #36 siguen pasando.

---

## Phase 4: User Story 2 — Sumar promociones acumulables (P1)

**Goal**: opciones combinadas por medio.

**Independent Test**: dos promos del mismo medio variando su acumulabilidad.

- [ ] T012 [P] [US2] Ampliar `packages/motor/src/recomendar.test.ts` con US2-1 a US2-6: A+B acumulables ⇒ una opción `ahorroEstimado: 3000` con `promociones` A 2000 y B 1000 en ese orden; B con `acumulable: null` ⇒ dos opciones (A 2000 mejor, B 1000); A+B acumulables y C no acumulable ⇒ dos opciones (A+B 3000, C 2500); A con tope agotado parcial ⇒ A 500 (`topeRestanteTrasCompra: 0`) + B 1000 (`null`); acumulables de medios distintos ⇒ no se suman; A en crédito y débito, B solo en crédito ⇒ A+B en crédito y A sola en débito. Además: SC-004 (una promo con `acumulable: null` nunca aparece en una opción con otra), una sola acumulable ⇒ opción individual, acumulable con tope agotado ⇒ descartada y las demás se combinan, `ahorroEstimado` de la opción = suma de sus promociones, y FR-003 mirando dentro de `promociones`.
- [ ] T013 [P] [US2] Ampliar `packages/motor/src/motivos.test.ts`: `motivoCombinado` une los motivos de cada promo con `" + "` en el orden recibido (FR-014).
- [ ] T014 [US2] En `packages/motor/src/motivos.ts`, agregar `motivoCombinado(promos: Promocion[]): string`. Hace pasar T013.
- [ ] T015 [US2] En `packages/motor/src/recomendar.ts`, armar las opciones por medio (research R4): las promos que aplican al medio con `acumulable === true` forman una combinada si son 2 o más; las demás, cada una la suya. Reparto dentro de la opción (research R5): ordenar por ahorro sin tope desc y luego id, recorrer con un `Map<Saldo, restante>` local, cada promo toma `min(sin tope, restante)` (por compra: `min(sin tope, tope)`; sin tope: sin tope), y al final cada promo informa el restante final de su saldo. Hace pasar T012.

**Checkpoint**: US1 y US2 en verde.

---

## Phase 5: User Story 3 — Topes compartidos entre promociones (P2)

**Goal**: saldos de grupo.

**Independent Test**: dos promos del mismo grupo y compras registradas con una de ellas.

- [ ] T016 [P] [US3] Ampliar `packages/motor/src/tope.test.ts` sobre `calcularSaldos`: dos miembros del grupo apuntan al mismo `Saldo`; compra con Coto descuenta del saldo de Día; promo exclusiva del mismo banco no se ve afectada; mismo `grupoTopeId` con `alcance` `"exclusivo"` o `null` ⇒ saldo propio; `alcance: "compartido"` sin `grupoTopeId` ⇒ saldo propio; montos $10.000 y $8.000 ⇒ $8.000; miembro vencido aporta consumo pero no monto (US3-8: vencido de $5.000 y vigente de $10.000 ⇒ $10.000); miembros vigentes semanal y mensual ⇒ período mensual; ningún miembro vigente con tope ⇒ sin tope; miembro `"por_compra"` con grupo ⇒ no es miembro; compra de una promo no recibida ⇒ no descuenta; compra sin descuento en un grupo ⇒ se estima con el porcentaje de su promo sin superar el saldo.
- [ ] T017 [P] [US3] Ampliar `packages/motor/src/recomendar.test.ts` con US3-1 a US3-8: Día con $4.000 de ahorro, restante $0 y base `{1, 0}`; exclusiva no afectada; monto menor; Coto vencida descartada por `vigencia` y su compra descontando del grupo; combinada del mismo grupo con $2.500 ⇒ A 2000 + B 500, las dos con `topeRestanteTrasCompra: 0`; grupo agotado ⇒ todas `tope_agotado` con la base del grupo; combinada con $2.000 ⇒ A 2000, B 0, motivo que dice que el tope compartido se agota y B no en descartadas; vencida aporta solo consumo. SC-002 y SC-003 (ninguna combinada supera el restante de ninguno de sus saldos).
- [ ] T018 [US3] En `packages/motor/src/tope.ts`, sumar grupos a `calcularSaldos` (research R2): miembro = `alcance === "compartido"`, `grupoTopeId !== null` y período ≠ `"por_compra"`; clave interna `grupo:<id>` / `promo:<id>`; monto = mínimo de los miembros vigentes en `hoy` con tope informado; período = el más largo de esos miembros; compras de cualquier miembro recibido, vigente o no; todos los miembros apuntan al mismo `Saldo`. Hace pasar T016.
- [ ] T019 [US3] En `packages/motor/src/motivos.ts` y `recomendar.ts`, cuando una promo de una combinada toma $0 porque otra agotó su saldo, sumar al motivo de la opción `" (el tope compartido se agota con la otra promo)"` en esa parte. Hace pasar T017.

**Checkpoint**: las tres historias en verde.

---

## Phase 6: Polish & Cross-Cutting

- [ ] T020 [P] Agregar al principio de `specs/002-motor-recomendar/contracts/recomendar.md` una nota: la forma de `OpcionDePago` cambió en la issue #37 (ver `specs/003-motor-topes-acumulables/data-model.md`).
- [ ] T021 Revisar que el test de rendimiento (SC-006) siga en menos de 1 s y que la cobertura de líneas de `packages/motor` sea de al menos 90%; si falta, sumar tests de los caminos sin cubrir, no bajar el umbral.
- [ ] T022 Correr `npm run lint`, `npm run typecheck`, `npm run test` y `npm run build` desde la raíz; verificar que `packages/motor/package.json` sigue sin `dependencies`, que el `dist/` carga en Node y que no hay imports de red, IA ni lecturas del reloj en código que no es de test.
- [ ] T023 Completar la entrada del 25/10 en `docs/bitacora-prompts.md` (sacar "en curso") y mostrarla en el chat antes de proponer el commit.

---

## Dependencies & Execution Order

- **Setup (T001)** → **Foundational (T002–T006)** → **US1 (T007–T011)** → **US2 (T012–T015)** → **US3 (T016–T019)** → **Polish (T020–T023)**.
- Las tres historias editan `recomendar.ts` y `recomendar.test.ts`: van en secuencia. US3 depende de US2 para el reparto de combinadas del mismo grupo.
- Dentro de cada historia: tests → implementación → checkpoint.

## Parallel Opportunities

- Foundational: T004 en paralelo con T002 y T003.
- US1: T007, T008 y T009 en paralelo.
- US2: T012 y T013 en paralelo.
- US3: T016 y T017 en paralelo.
- Polish: T020 en paralelo con T021.

## Implementation Strategy

1. **Etapa 1 = Setup + base + US1** (T001–T011): contrato nuevo y topes semanales y por compra, que es el caso más común en MODO. Pausa para revisión.
2. **Etapa 2 = US2**: promos acumulables. Pausa para revisión.
3. **Etapa 3 = US3 + cierre**: topes compartidos, cobertura, verificación y bitácora. Después, `/code-review`, `test-runner` y `rules-guardian` antes del PR.
