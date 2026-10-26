# Implementation Plan: Motor — estimar el tope restante, con su base

**Branch**: `claude/motor-estimar-topes-38` | **Date**: 2026-10-26 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/005-motor-estimar-topes/spec.md`

## Summary

Agregar a `@vuelto/motor` `estimarTopes(promociones, comprasDelPeriodo, perfil, ahora)`, que
devuelve una estimación por cada saldo de la issue #37 con promos vigentes aplicables al usuario,
y `formatearEstimacion(estimacion)`, que arma estado, cifra y base con los textos de
`DESIGN.md`. Antes, unificar en `clasificarTope(promo)` la regla de qué tipo de tope tiene cada
promo, sin cambiar ningún resultado de las issues #36 y #37.

## Technical Context

**Language/Version**: TypeScript 6 (strict, `NodeNext`), Node ≥ 22.13

**Primary Dependencies**: ninguna de runtime; Vitest 5 y `@vitest/coverage-v8` (dev)

**Storage**: N/A

**Testing**: Vitest con cobertura (umbral 90% de líneas)

**Target Platform**: Edge Function `GET /topes` (Deno, issue #45); Node en tests y CI

**Project Type**: librería (paquete del monorepo)

**Performance Goals**: lineal en promociones y compras (reusa `calcularSaldos`)

**Constraints**: las de las issues #36 y #37 (sin `dependencies`, sin red, sin reloj, sin `?:`,
sin `Intl` ni `localeCompare`)

**Scale/Scope**: corpus de MODO, 1 usuario por llamada

## Constitution Check

| Principio | Cómo se cumple | Estado |
|---|---|---|
| I. Decisión, no listado | Muestra cuánto tope queda de los medios del usuario, no un listado de promos: las promos sin tope o por compra no generan estimación | ✅ |
| II. Motor determinístico | Funciones puras; textos por plantilla; orden fijo (FR-006) | ✅ |
| III. Null explícito | Tipos nuevos sin `?:`; `null` explícito en grupo, banco y cifra | ✅ |
| IV. Secretos y privacidad | No aplica | ✅ N/A |
| V. Topes estimados con base | Cifra con "≈" o `null`, siempre con base (FR-011); sin compras no hay cifra; redondeo hacia abajo | ✅ |
| VI. Test-first | Tests de cada escenario de la spec; la suite anterior sin cambios | ✅ |

Re-check post-diseño: sin cambios.

## Project Structure

### Documentation (this feature)

```text
specs/005-motor-estimar-topes/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/estimar-topes.md
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
packages/motor/src/
├── tipos.ts          # + EstimacionTope, EstadoTope, TextoEstimacion
├── tope.ts           # + clasificarTope; Saldo con grupoTopeId
├── tope.test.ts
├── fecha.ts          # + finDelPeriodo, diaSiguiente, nombreDelMes
├── fecha.test.ts
├── motivos.ts        # usa clasificarTope; exporta pesos()
├── recomendar.ts     # usa clasificarTope para el tope por compra
├── estimar.ts        # nuevo: estimarTopes, formatearEstimacion
├── estimar.test.ts   # nuevo
└── index.ts          # + estimarTopes, formatearEstimacion
docs/bitacora-prompts.md
```

**Structure Decision**: todo dentro de `packages/motor`. `elegibilidad.ts` no cambia.

## Complexity Tracking

Sin violaciones que justificar.
