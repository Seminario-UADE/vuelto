# Implementation Plan: Motor — recomendar el medio de pago óptimo para una compra

**Branch**: `claude/motor-recomendar-36` | **Date**: 2026-10-20 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-motor-recomendar/spec.md`

## Summary

Agregar a `@vuelto/motor` la función pura `recomendar(compra, perfil, promociones,
comprasDelPeriodo, ahora)`. Para cada promoción evalúa las 9 reglas de elegibilidad en un orden
fijo, calcula el tope consumido por promoción en el mes de `ahora` y el ahorro en enteros, y
devuelve la mejor opción, las alternativas ordenadas y los descartes con causa, motivo y base.
El contrato de la issue #33 suma `CausaDescarte`, `BaseEstimacion`, `"otra_provincia"` y
`PerfilSinMediosError`.

## Technical Context

**Language/Version**: TypeScript 6 (strict, `tsconfig.base.json`, target y lib ES2022), Node ≥ 22.13

**Primary Dependencies**: ninguna de runtime (constitución §II); Vitest 5 como devDependency

**Storage**: N/A (el motor no persiste nada; los datos los trae la Edge Function)

**Testing**: Vitest, sin red, junto a cada módulo (`*.test.ts`)

**Target Platform**: Edge Function de Supabase (Deno) en producción; Node en tests y CI

**Project Type**: librería (paquete del monorepo)

**Performance Goals**: < 1 s para 2.000 promociones y 100 compras (SC-003)

**Constraints**: sin `dependencies`, sin red, sin leer el reloj, sin `?:` en tipos, sin
`localeCompare` ni `Intl` (determinismo entre Node y Deno)

**Scale/Scope**: corpus de MODO (≈2.000 promociones), 1 usuario por llamada

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Cómo se cumple | Estado |
|---|---|---|
| I. Decisión, no listado | Resuelve "con qué medio pago esta compra"; sin compra concreta no hay salida | ✅ |
| II. Motor determinístico | Función pura; `ahora` por parámetro; sin dependencias ni red; motivos por plantilla; ids comparados por código (R6), fechas sin `Intl` (R4); solo lo importa la Edge Function | ✅ |
| III. Esquema y null explícito | Tipos nuevos sin `?:`; `null` explícito en `base` y `topeRestanteTrasCompra` | ✅ |
| IV. Secretos y privacidad | No toca secretos, tickets ni tablas | ✅ N/A |
| V. Topes estimados con base | `base` en cada opción con tope y en cada descarte `tope_agotado` (SC-005); con 0 compras, `{0, 0}`; sin tope, `null` y el motivo lo dice. Compras sin confirmar: no llegan al motor (supuesto de la spec, RF-09) | ✅ |
| VI. Test-first | Un test por cada una de las 9 reglas, incluidas jurisdicción y tope agotado. Tope compartido vs. exclusivo y acumulabilidad son dimensiones de RF-04 que **no** cubre esta issue: quedan asignadas a la issue #37, cuyos criterios ya las piden | ✅ con asignación explícita |

Re-check post-diseño: sin cambios. `PerfilSinMediosError` es una clase, pero no un dato del
dominio (research R7), así que no contradice ADR-009.

## Project Structure

### Documentation (this feature)

```text
specs/002-motor-recomendar/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/recomendar.md
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
packages/motor/src/
├── tipos.ts              # + CausaDescarte, BaseEstimacion, "otra_provincia", base/causa
├── errores.ts            # nuevo: PerfilSinMediosError
├── dinero.ts             # nuevo: centavos y centésimos de punto (R3)
├── dinero.test.ts
├── fecha.ts              # nuevo: fecha y día en hora de Argentina (R4)
├── fecha.test.ts
├── elegibilidad.ts       # nuevo: 9 reglas ordenadas, JURISDICCIONES_VALIDAS, normalizar
├── elegibilidad.test.ts
├── tope.ts               # nuevo: consumo, restante y base por promoción
├── tope.test.ts
├── motivos.ts            # nuevo: plantillas de motivo por causa y por opción
├── recomendar.ts         # nuevo: orquesta y ordena
├── recomendar.test.ts
└── index.ts              # + exports de recomendar, errores y JURISDICCIONES_VALIDAS

docs/architecture/01-data-models.md   # Jurisdicción: nacional / caba / pba / otra_provincia
docs/bitacora-prompts.md              # entrada de la sesión
```

**Structure Decision**: todo dentro de `packages/motor`, sin tocar otros workspaces. Los módulos
internos (`tope.ts` en particular) quedan listos para que las issues #37 y #38 los extiendan
(research R1). `index.ts` exporta solo `recomendar`, `PerfilSinMediosError`,
`JURISDICCIONES_VALIDAS` y los tipos.

## Complexity Tracking

Sin violaciones que justificar.
