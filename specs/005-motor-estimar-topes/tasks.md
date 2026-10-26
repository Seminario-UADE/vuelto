---

description: "Tareas para estimar el tope restante, con su base (issue #38)"
---

# Tasks: Motor — estimar el tope restante, con su base

**Input**: `specs/005-motor-estimar-topes/` (spec.md, plan.md, research.md, data-model.md, contracts/estimar-topes.md, quickstart.md)

**Tests**: obligatorios (constitución §VI, FR-015). En cada historia, los tests van antes que el código y tienen que fallar primero.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede hacer en paralelo (otro archivo, sin depender de tareas sin terminar)
- **[Story]**: US1 (estimación), US2 (textos)
- El código vive en `packages/motor/src/`.

---

## Phase 1: Foundational — unificar la regla del tope (FR-012, FR-013)

**Purpose**: dejar en un solo lugar la regla de qué tipo de tope tiene cada promo, sin cambiar ningún resultado.

- [X] T001 [P] Escribir en `packages/motor/src/tope.test.ts` los tests de `clasificarTope(promo)`: `monto: null` ⇒ `{ tipo: "sin_tope" }`; `periodo: "por_compra"` con $3.000 ⇒ `{ tipo: "por_compra", monto: 300000 }`; mensual de $5.000 propio ⇒ `{ tipo: "acumulable", monto: 500000, periodo: "mensual", grupo: null }`; `periodo: null` ⇒ `periodo: "mensual"`; semanal compartido con grupo ⇒ `grupo: "galicia-super"`; mismo `grupoTopeId` con `alcance` `"exclusivo"` o `null` ⇒ `grupo: null`; `"por_compra"` con grupo ⇒ `{ tipo: "por_compra", ... }`.
- [X] T002 Implementar en `packages/motor/src/tope.ts` `export type ClaseDeTope` y `export function clasificarTope(promo): ClaseDeTope` según `data-model.md`, y usarla en `calcularSaldos` (reemplaza `grupoDe` y las lecturas de `promo.tope.*`). Sumar `grupoTopeId: string | null` a `Saldo` (research R2). Hace pasar T001.
- [X] T003 Usar `clasificarTope` en `packages/motor/src/recomendar.ts` (cálculo de `topePorCompra`) y en `packages/motor/src/motivos.ts` (`motivoOpcion`: "no informa tope" y "hasta $X por compra"). Exportar `pesos()` desde `motivos.ts` (research R5).
- [X] T004 Verificar FR-012 y FR-013: `grep -nE "tope\.(monto|periodo|alcance|grupoTopeId)" packages/motor/src/*.ts` fuera de tests solo encuentra `clasificarTope`; la suite de las issues #36 y #37 pasa sin cambios en sus expectativas.

**Checkpoint**: misma suite en verde, regla del tope en un solo lugar.

---

## Phase 2: User Story 1 — Saber cuánto tope me queda en cada uno (P1) 🎯 MVP

**Goal**: `estimarTopes()` con una estimación por saldo aplicable.

**Independent Test**: promos y compras fijas y una fecha ⇒ lista de estimaciones con sus valores.

- [X] T005 [P] [US1] Escribir en `packages/motor/src/fecha.test.ts` los tests de `finDelPeriodo` (`("mensual", "2026-10-21") → "2026-10-31"`, `("mensual", "2026-02-10") → "2026-02-28"`, `("semanal", "2026-10-21") → "2026-10-25"`, `("semanal", "2026-10-01") → "2026-10-04"`), `diaSiguiente` (`"2026-10-31" → "2026-11-01"`, `"2026-12-31" → "2027-01-01"`) y `nombreDelMes` (`"2026-10-21" → "octubre"`).
- [X] T006 [US1] Implementar `finDelPeriodo`, `diaSiguiente` y `nombreDelMes` en `packages/motor/src/fecha.ts` con aritmética UTC sobre la `FechaISO` y una tabla de 12 nombres, sin `Intl` (research R3). Hace pasar T005.
- [X] T007 [US1] Sumar a `packages/motor/src/tipos.ts` `EstimacionTope`, `EstadoTope` y `TextoEstimacion` según `data-model.md`. Sin `?:`.
- [X] T008 [P] [US1] Escribir `packages/motor/src/estimar.test.ts` con US1-1 a US1-9: estimación propia mensual con sus valores en pesos y el medio del usuario; grupo de dos promos vigentes que aparece una vez con las dos listadas; período semanal 19/10–25/10; promo de otro banco con perfil (no aparece) y sin perfil (aparece con `mediosDePagoIds: []`); perfil sin medios ⇒ `[]`; sin tope, por compra, vencida y que todavía no empezó ⇒ sin estimación propia; grupo cuyo único miembro aplicable está vencido ⇒ no aparece; consulta del 1/10 semanal ⇒ 28/9–4/10 con la compra del 29/9 en la base; mismo resultado con las listas en otro orden. Además: banco `null` si los miembros vigentes son de bancos distintos, y orden de la lista por grupo o id (FR-006).
- [X] T009 [US1] Implementar `estimarTopes(promociones, comprasDelPeriodo, perfil, ahora)` en `packages/motor/src/estimar.ts`: `calcularSaldos` una vez; agrupar las promos por el objeto `Saldo`; quedarse con los saldos que tienen promos vigentes (`vigenteEn`) aplicables al perfil (`mediosCompatibles`), o todas si `perfil === null`; armar cada `EstimacionTope` en pesos con su período (`inicioDelPeriodo`, `finDelPeriodo`); ordenar por `grupoTopeId ?? id de la promo` con `compararIds`. Exportar desde `packages/motor/src/index.ts`. Hace pasar T008.

**Checkpoint**: US1 en verde.

---

## Phase 3: User Story 2 — Leer el tope como estimado, con su base (P1)

**Goal**: `formatearEstimacion()` con los textos de `DESIGN.md`.

**Independent Test**: estimaciones fijas ⇒ estado, cifra y base exactos.

- [ ] T010 [P] [US2] Ampliar `packages/motor/src/estimar.test.ts` con US2-1 a US2-9: "≈$6.500" disponible; $1.600 de $8.000 `queda_poco`; $2.050 de $10.000 "≈$2.000" `disponible`; agotado "según 2 compras de octubre · vuelve el 1/11"; semanal sin compras con el texto exacto de "esta semana"; "según 1 compra de octubre"; semanal "según 2 compras de esta semana" y "vuelve el 5/10"; $40 ⇒ "menos de $100" `queda_poco`; agotado en diciembre ⇒ "vuelve el 1/1". Además: mensual sin compras con el texto de "este mes", tope de $0 ⇒ `agotado`, y el invariante de FR-011 sobre todas las estimaciones de T008 (cifra no `null` ⇒ base no vacía y cifra ≤ restante).
- [ ] T011 [US2] Implementar `formatearEstimacion(estimacion)` en `packages/motor/src/estimar.ts` (research R4, R5): estado en centavos (`restante === 0` → `agotado`; `comprasRegistradas === 0` → `sin_compras`; `restante × 5 ≤ tope` → `queda_poco`; si no, `disponible`); cifra con el restante redondeado hacia abajo a la centena y `pesos()`, o "menos de $100", o `null`; base con singular y plural, "de <mes>" o "de esta semana", " · vuelve el D/M" en `agotado` y el texto de sin compras. Exportar desde `index.ts`. Hace pasar T010.

**Checkpoint**: US1 y US2 en verde.

---

## Phase 4: Polish

- [ ] T012 Correr `npm run lint`, `npm run typecheck`, `npm run test` (cobertura ≥ 90%) y `npm run build` desde la raíz; verificar que el `dist/` carga en Node y exporta `estimarTopes` y `formatearEstimacion`, que el motor sigue sin `dependencies` y sin lecturas del reloj ni red fuera de los tests.
- [ ] T013 Completar la entrada del 26/10 en `docs/bitacora-prompts.md` (sacar "en curso") y mostrarla en el chat antes de proponer el commit.

---

## Dependencies & Execution Order

- **Foundational (T001–T004)** → **US1 (T005–T009)** → **US2 (T010–T011)** → **Polish (T012–T013)**.
- US2 depende de US1 (formatea las estimaciones que arma `estimarTopes`) y edita el mismo archivo.

## Parallel Opportunities

- T001 en paralelo con la lectura del código existente.
- US1: T005 y T008 en paralelo; T007 antes de T008 para que compile.
- US2: T010 se puede escribir mientras se termina T009.

## Implementation Strategy

1. **Etapa 1 = Foundational + US1** (T001–T009): regla del tope unificada y estimación por saldo. Pausa para revisión.
2. **Etapa 2 = US2 + Polish** (T010–T013): textos, verificación y bitácora. Después, `/code-review`, `test-runner` y `rules-guardian` antes del PR.
