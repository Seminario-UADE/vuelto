---

description: "Tareas para implementar el motor de recomendación (issue #36)"
---

# Tasks: Motor — recomendar el medio de pago óptimo para una compra

**Input**: `specs/002-motor-recomendar/` (spec.md, plan.md, research.md, data-model.md, contracts/recomendar.md, quickstart.md)

**Tests**: obligatorios. La constitución §VI exige test-first en el motor y FR-025 pide un test por regla. En cada fase, los tests se escriben antes que el código y tienen que fallar primero.

**Organización**: por historia de usuario, en el orden de prioridad de la spec.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede hacer en paralelo (otro archivo, sin depender de tareas sin terminar)
- **[Story]**: historia a la que pertenece (US1, US2, US3)
- Todas las rutas son relativas a la raíz del repo; el código vive en `packages/motor/src/`.

---

## Phase 1: Setup

- [ ] T001 Verificar que el workspace arranca limpio: `npm ci` y `npm run test -w @vuelto/motor` en verde antes de tocar nada (`packages/motor/`)

---

## Phase 2: Foundational (bloquea todas las historias)

**Purpose**: contrato de tipos y utilidades puras que usan las tres historias.

- [ ] T002 Ampliar el contrato en `packages/motor/src/tipos.ts` según `data-model.md`: `Jurisdiccion` suma `"otra_provincia"`; nuevo `CausaDescarte` = `"categoria" | "comercio" | "vigencia" | "dia" | "canal" | "jurisdiccion" | "monto_minimo" | "medio_de_pago" | "tope_agotado"`; nueva `interface BaseEstimacion { comprasRegistradas: number; comprasSinDescuentoInformado: number }`; `OpcionDePago` suma `base: BaseEstimacion | null`; `Descarte` suma `causa: CausaDescarte` y `base: BaseEstimacion | null`; reescribir el comentario de `topeRestanteTrasCompra` para que apunte a `base` (ya no "la suma la issue #36"). Sin `?:`.
- [ ] T003 [P] Crear `packages/motor/src/errores.ts` con `export class PerfilSinMediosError extends Error` y `name = "PerfilSinMediosError"` (research R7). Es la única clase del motor.
- [ ] T004 [P] Escribir `packages/motor/src/dinero.test.ts`: `aCentavos(0.29) === 29`, `aCentavos(10000) === 1000000`, `aCentesimosDePunto(20) === 2000`, `aCentesimosDePunto(33.3) === 3330`, `aplicarPorcentaje(1000000, 2000) === 200000`, `aplicarPorcentaje(300, 3330) === 99` (redondea hacia abajo), `aPesos(150) === 1.5`.
- [ ] T005 Implementar `packages/motor/src/dinero.ts` (research R3): `aCentavos(pesos) = Math.round(pesos * 100)`, `aCentesimosDePunto(p) = Math.round(p * 100)`, `aplicarPorcentaje(centavos, cp) = Math.floor(centavos * cp / 10000)`, `aPesos(centavos) = centavos / 100`. Hace pasar T004.
- [ ] T006 [P] Escribir `packages/motor/src/fecha.test.ts`: `new Date("2026-11-01T02:30:00Z")` (23:30 del 31/10 en Argentina) ⇒ fecha `"2026-10-31"`, día `"sab"`, mes `"2026-10"`; `new Date("2026-10-21T03:00:00Z")` ⇒ `"2026-10-21"`, `"mie"`.
- [ ] T007 Implementar `packages/motor/src/fecha.ts` (research R4): `fechaArgentina(ahora: Date): FechaISO` (instante −3 h, `toISOString().slice(0, 10)`), `diaArgentina(ahora: Date): Dia` (`getUTCDay()` del instante desplazado, 0 = `"dom"`), `mesDe(fecha: FechaISO): string` (`slice(0, 7)`). Sin `Intl`. Hace pasar T006.

**Checkpoint**: `npm run typecheck` y `npm run test -w @vuelto/motor` en verde (los tests existentes de `publicable.test.ts` siguen pasando con el contrato ampliado).

---

## Phase 3: User Story 1 — Saber con qué medio de pago conviene pagar (P1) 🎯 MVP

**Goal**: `recomendar()` devuelve la mejor opción y las alternativas ordenadas, para todas las reglas de elegibilidad, con ahorro = monto × porcentaje (el tope se suma en US3).

**Independent Test**: perfil, compra, promociones y `ahora` fijos ⇒ mejor opción y orden esperados, sin red.

### Tests de US1 (primero, tienen que fallar)

- [ ] T008 [P] [US1] Escribir `packages/motor/src/elegibilidad.test.ts`, caso feliz: una promoción que cumple las 9 reglas aplica a un medio compatible; `normalizar("  COTO  ") === normalizar("Coto")` y `normalizar("Café") === "cafe"`; `JURISDICCIONES_VALIDAS` es `["nacional", "caba", "pba"]`; promoción con `jurisdiccion: null` aplica; primer y último día de la vigencia son válidos (Edge Cases).
- [ ] T009 [P] [US1] Escribir `packages/motor/src/recomendar.test.ts` con US1-1 (Galicia crédito Visa 20% y Santander débito Mastercard 10%, compra de $10.000 ⇒ `mejor` Galicia con `ahorroEstimado: 2000`, alternativa Santander con `1000`), US1-2 (empate ⇒ orden por `medioDePagoId` y luego `promocionId`, comparando por código y no con `localeCompare`), US1-3 / SC-001 (dos llamadas iguales en profundidad, y lo mismo con `promociones`, `perfil.mediosDePago` y `comprasDelPeriodo` en otro orden), US1-4 (perfil sin medios ⇒ `toThrow(PerfilSinMediosError)`), US1-5 (ninguna aplica ⇒ `mejor: null`, `alternativas: []`, todas en `descartadas`), Edge Cases "misma promoción, varios medios" y "mismo medio, varias promociones" (cada par es una opción), y que `recomendar` no muta sus argumentos.

### Implementación de US1

- [ ] T010 [US1] Implementar `packages/motor/src/elegibilidad.ts` (research R2, R5, R8): `export const JURISDICCIONES_VALIDAS: readonly Jurisdiccion[] = ["nacional", "caba", "pba"]`; `normalizar(s)` = NFD, sin marcas (`/\p{M}/gu`), minúsculas, `trim`, espacios colapsados; `REGLAS_DE_PROMOCION`: lista ordenada `{ causa: CausaDescarte; cumple(promo, compra, fecha, dia): boolean }` con `categoria`, `comercio` (promo con comercio y compra sin comercio ⇒ no cumple), `vigencia` (`desde ≤ fecha ≤ hasta`, comparando `FechaISO` como strings), `dia` (`dias === null` o incluye el día), `canal` (`null`, `"ambos"` o igual), `jurisdiccion` (`null` o en la lista), `monto_minimo` (`null` o `monto ≥ mínimo`); `mediosCompatibles(promo, perfil)`: mismo `bancoId` y `red` incluida en `promo.tarjetas[medio.tipo]`. Hace pasar T008.
- [ ] T011 [P] [US1] Crear `packages/motor/src/motivos.ts` con `motivoOpcion(promo, sinTope: boolean): string` por plantilla (ej. "20% en Supermercados"; si `sinTope`, agregar que la promo no informa tope). Usa el nombre de `CATEGORIAS_MODO`. Nunca vacío; sin LLM (constitución §II).
- [ ] T012 [US1] Implementar `packages/motor/src/recomendar.ts`: firma `recomendar(compra: CompraPropuesta, perfil: Perfil, promociones: Promocion[], comprasDelPeriodo: Compra[], ahora: Date): Recomendacion` (contracts/recomendar.md); lanza `PerfilSinMediosError` si `perfil.mediosDePago.length === 0`; por cada promoción aplica `REGLAS_DE_PROMOCION` y `mediosCompatibles`, genera una `OpcionDePago` por par (medio, promoción) con `ahorroEstimado` calculado en enteros con `dinero.ts` y devuelto en pesos; ordena por ahorro desc y desempata por `medioDePagoId` y `promocionId` con `(a, b) => a < b ? -1 : a > b ? 1 : 0` (research R6); `mejor` = primera o `null`. Las promociones que no aplican van a `descartadas` (causa y base se completan en US2 y US3; mientras tanto `causa` de la primera regla que falla y `base: null`). Hace pasar T009.
- [ ] T013 [US1] Exportar desde `packages/motor/src/index.ts`: `recomendar`, `PerfilSinMediosError` y `JURISDICCIONES_VALIDAS` (no los helpers internos de `dinero.ts`, `fecha.ts`, `elegibilidad.ts`, `tope.ts`, `motivos.ts`).

**Checkpoint**: US1 funciona sola: recomendación correcta sin topes.

---

## Phase 4: User Story 2 — Entender por qué una promoción no me sirve (P2)

**Goal**: cada promoción descartada tiene la causa correcta según el orden fijo de FR-015 y un motivo por plantilla.

**Independent Test**: una promoción que falla exactamente una regla ⇒ descartada con esa causa.

### Tests de US2 (primero, tienen que fallar)

- [ ] T014 [P] [US2] Ampliar `packages/motor/src/elegibilidad.test.ts` con un test por regla que falla sola (SC-002, FR-025), verificando la causa: `dia` (solo viernes, consulta miércoles), `vigencia` (terminó ayer), `medio_de_pago` (banco no declarado, y red no declarada), `monto_minimo` (mínimo $20.000, compra $15.000), `canal` (solo online, compra presencial), `categoria` (otra categoría), `comercio` (otro comercio, y compra sin comercio contra promo con comercio), `jurisdiccion` (`"otra_provincia"` ⇒ descartada; `"nacional"`, `"caba"` y `"pba"` aplican). La de `tope_agotado` está en T019.
- [ ] T015 [P] [US2] Ampliar `packages/motor/src/recomendar.test.ts`: promoción que falla `categoria` y `dia` a la vez ⇒ causa `categoria` (FR-015); promoción que falla `medio_de_pago` con un medio y aplica con otro ⇒ opción, no descarte; promoción que pasa `medio_de_pago` con un medio y falla una regla posterior ⇒ causa de esa regla; `descartadas` ordenadas por `promocionId` sin importar el orden de entrada (FR-023); cada `promocion.id` está en una opción o en exactamente un descarte (FR-003, SC-004); todo `motivo` es un string no vacío.

### Implementación de US2

- [ ] T016 [US2] Agregar a `packages/motor/src/motivos.ts` `motivoDescarte(causa: CausaDescarte, promo, compra): string`, una plantilla por cada valor de `CausaDescarte` (ej. `dia`: "Hoy no aplica: la promo es los sábados"; `tope_agotado`: "Tope agotado"), en el tono de `docs/design/DESIGN.md` §8. La redacción final es de la issue #46.
- [ ] T017 [US2] En `packages/motor/src/recomendar.ts`, completar cada `Descarte` con la causa de la primera regla que falla en el orden de FR-015 (`REGLAS_DE_PROMOCION`, luego `medio_de_pago`, luego `tope_agotado`), `motivoDescarte(...)`, y ordenar `descartadas` por `promocionId` con el mismo comparador de T012. Hace pasar T014 y T015.

**Checkpoint**: US1 y US2 en verde.

---

## Phase 5: User Story 3 — Que el ahorro tenga en cuenta el tope que ya usé (P2)

**Goal**: ahorro limitado al tope restante del mes, tope restante tras la compra y base del estimado en opciones y descartes por tope.

**Independent Test**: promoción con tope y compras registradas que consumen parte o todo ⇒ ahorro, restante y base esperados.

### Tests de US3 (primero, tienen que fallar)

- [ ] T018 [P] [US3] Escribir `packages/motor/src/tope.test.ts` sobre `estadoDeTope(promo, comprasDelPeriodo, ahora)`: consumo con `descuentoObtenido` informado ($1.500 + $2.500 = $4.000 de un tope de $5.000, base `{2, 0}`); compra sin descuento de $10.000 al 20% ⇒ consumo $2.000, base `{1, 1}`; compra sin descuento de $100.000 al 20% ⇒ consumo $5.000 (techo), restante $0; compras del mes anterior y con fecha posterior a la de `ahora` no cuentan ni entran en la base; compras de otra promoción no cuentan; `descuentoObtenido` de $0 o negativo ⇒ consumo $0 y cuenta como informado; `tope.monto = 0` ⇒ agotado; `tope.periodo = null`, `"semanal"` y `"por_compra"` ⇒ mes calendario; sin compras ⇒ base `{0, 0}`; `tope.monto = null` ⇒ sin tope y base `null`; mes evaluado en hora de Argentina (compra del 31/10 con `ahora` = 23:30 del 31/10 ART cuenta).
- [ ] T019 [P] [US3] Ampliar `packages/motor/src/recomendar.test.ts` con US3-1 (ahorro $1.000, `topeRestanteTrasCompra: 0`, `base: { comprasRegistradas: 2, comprasSinDescuentoInformado: 0 }`), US3-2 (tope agotado ⇒ descarte con `causa: "tope_agotado"`, nunca `mejor`), US3-5 (descarte por techo con `base: { comprasRegistradas: 1, comprasSinDescuentoInformado: 1 }`), US3-6 (sin tope ⇒ `ahorroEstimado: 2000`, `topeRestanteTrasCompra: null`, `base: null`, motivo que lo aclara), US3-7 (base `{0, 0}`); "tope justo agotado" (restante exactamente $0 ⇒ descarte, no opción con $0); SC-005: ninguna opción con `topeRestanteTrasCompra !== null` tiene `base === null`, y todo descarte `tope_agotado` tiene `base`; descartes con otra causa tienen `base: null`.

### Implementación de US3

- [ ] T020 [US3] Implementar `packages/motor/src/tope.ts`: precalcular una vez por llamada un `Map<promocionId, compras>` (research R9); `estadoDeTope(...)` devuelve, en centavos, `{ tope: number | null; consumido: number; restante: number | null; base: BaseEstimacion | null }` con las reglas de FR-016/FR-017 (`data-model.md` §Reglas de cálculo): compras con el mismo `promocionId`, `mesDe(fecha) === mesDe(fechaArgentina(ahora))` y `fecha ≤ fechaArgentina(ahora)`; consumo por compra = `max(descuentoObtenido, 0)` o `min(aplicarPorcentaje(monto, %), tope)` si es `null`; consumido total `min(Σ, tope)`; restante `tope − consumido` (≥ 0). Sin tope: `restante: null`, `base: null`. Deja lugar para que la issue #37 sume grupos y períodos. Hace pasar T018.
- [ ] T021 [US3] En `packages/motor/src/recomendar.ts`, usar `estadoDeTope`: si el tope es informado y `restante === 0`, descartar con `causa: "tope_agotado"` y la `base` (FR-013, FR-020); si no, `ahorroEstimado = min(aplicarPorcentaje(monto, %), restante)` (o sin límite si no hay tope), `topeRestanteTrasCompra = restante − ahorro` en pesos o `null`, `base` del estado y `motivoOpcion(promo, sinTope)`. Hace pasar T019.

**Checkpoint**: las tres historias en verde.

---

## Phase 6: Polish & Cross-Cutting

- [ ] T022 [P] Test de rendimiento en `packages/motor/src/recomendar.test.ts` (SC-003): 2.000 promociones y 100 compras generadas, `recomendar` en menos de 1.000 ms medido con `Date.now()` en el test.
- [ ] T023 [P] Actualizar `docs/architecture/01-data-models.md`: fila Jurisdicción con los valores `nacional`, `caba`, `pba` y `otra_provincia`, y que el MVP acepta `nacional`, `caba`, `pba` y `null` (FR-012).
- [ ] T024 Correr `npm run lint`, `npm run typecheck`, `npm run test` y `npm run build` desde la raíz; verificar que `packages/motor/package.json` sigue sin `dependencies` y que no hay imports de red, de IA ni lecturas del reloj (`Date.now`, `new Date()` sin argumentos) en código no test de `packages/motor/src/`.
- [ ] T025 Agregar la entrada de la sesión en `docs/bitacora-prompts.md` (spec, dos pasadas de `spec-critic`, plan, tasks e implementación de la issue #36).

---

## Dependencies & Execution Order

- **Setup (T001)** → **Foundational (T002–T007)** → **US1 (T008–T013)** → **US2 (T014–T017)** y **US3 (T018–T021)** → **Polish (T022–T025)**.
- US2 y US3 dependen de US1 (`recomendar.ts` y `elegibilidad.ts`). Entre sí son independientes salvo que las dos editan `recomendar.ts` y `recomendar.test.ts`: hacerlas en secuencia (US2 y después US3) evita conflictos.
- Dentro de cada historia: tests → implementación → checkpoint.

## Parallel Opportunities

- Foundational: T003, T004 y T006 en paralelo; T005 después de T004, T007 después de T006.
- US1: T008 y T009 en paralelo; T011 en paralelo con T010.
- US2: T014 y T015 en paralelo.
- US3: T018 y T019 en paralelo.
- Polish: T022 y T023 en paralelo.

## Implementation Strategy

1. **MVP = US1** (T001–T013): ya hay una recomendación correcta sin topes y se puede revisar.
2. **US2**: causas y motivos de descarte (lo que hace confiable la recomendación).
3. **US3**: topes y base (el diferencial del producto).
4. **Polish**: rendimiento, docs, verificación completa y bitácora. Después, `/code-review`, `test-runner` y `rules-guardian` antes del PR.
