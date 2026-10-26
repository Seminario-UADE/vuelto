# Implementation Plan: Motor — topes compartidos, períodos del tope y promociones acumulables

**Branch**: `claude/motor-topes-37` | **Date**: 2026-10-25 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/003-motor-topes-acumulables/spec.md`

## Summary

Generalizar el tope del motor de la issue #36: el cálculo pasa a **saldos** (propios o compartidos
por un grupo) con período mensual o semanal, el tope por compra se aplica compra a compra, y las
promos acumulables de un mismo medio se combinan en una sola opción que reparte el saldo sin
superarlo. La opción de pago pasa a llevar una lista de promociones aplicadas. Se mide la
cobertura del motor en el CI (≥ 90%).

## Technical Context

**Language/Version**: TypeScript 6 (strict, `NodeNext`), Node ≥ 22.13

**Primary Dependencies**: ninguna de runtime; devDependencies `vitest` 5.0.4 y, nueva,
`@vitest/coverage-v8` 5.0.x

**Storage**: N/A

**Testing**: Vitest con cobertura v8, umbral 90% de líneas

**Target Platform**: Edge Function de Supabase (Deno) en producción; Node en tests y CI

**Project Type**: librería (paquete del monorepo)

**Performance Goals**: se mantiene < 1 s para 2.000 promociones y 100 compras (SC-006)

**Constraints**: las de la issue #36 (sin `dependencies`, sin red, sin reloj, sin `?:`, sin
`Intl` ni `localeCompare`)

**Scale/Scope**: corpus de MODO (≈2.000 promociones), 1 usuario por llamada

## Constitution Check

| Principio | Cómo se cumple | Estado |
|---|---|---|
| I. Decisión, no listado | Mejora la decisión "con qué pago" con topes reales y combinaciones | ✅ |
| II. Motor determinístico | Funciones puras; reparto y desempates con orden fijo (R5, R7); motivos por plantilla | ✅ |
| III. Null explícito | `PromocionAplicada` sin `?:`; `null` explícito en restante y base | ✅ |
| IV. Secretos y privacidad | No aplica | ✅ N/A |
| V. Topes estimados con base | Cada promo aplicada con tope acumulable lleva su base; las que comparten saldo, la del grupo. La excepción del tope por compra de $0 está enmendada en la spec (FR-015) | ✅ |
| VI. Test-first | Cubre las dos dimensiones de RF-04 que la issue #36 dejó asignadas: tope compartido vs. exclusivo y acumulabilidad con `null` como no acumulable. Cobertura medida | ✅ |

Re-check post-diseño: sin cambios. `@vitest/coverage-v8` es devDependency: `packages/motor`
sigue sin `dependencies` (§II).

## Project Structure

### Documentation (this feature)

```text
specs/003-motor-topes-acumulables/
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
packages/motor/
├── package.json          # + @vitest/coverage-v8; script test con --coverage
├── vitest.config.ts      # nuevo: cobertura v8, umbral 90% líneas
└── src/
    ├── tipos.ts          # OpcionDePago con promociones[]; PromocionAplicada
    ├── fecha.ts          # + inicioDelPeriodo (mensual / semanal lun-dom)
    ├── fecha.test.ts
    ├── tope.ts           # estadoDeTope → calcularSaldos (propios y de grupo)
    ├── tope.test.ts      # reescrito sobre saldos
    ├── motivos.ts        # + motivo por compra, motivo combinado y de ahorro $0
    ├── motivos.test.ts
    ├── recomendar.ts     # opciones por medio: combinadas e individuales, reparto
    └── recomendar.test.ts  # adaptado al contrato nuevo + US1 a US3

package-lock.json         # por la devDependency nueva
specs/002-motor-recomendar/contracts/recomendar.md  # nota: forma de la opción actualizada por la issue #37
docs/bitacora-prompts.md
```

**Structure Decision**: todo dentro de `packages/motor`, igual que la issue #36. `elegibilidad.ts`
no cambia. El CI no cambia: el job `test` ya corre `npm run test`, que pasa a incluir la cobertura.

## Complexity Tracking

Sin violaciones que justificar.
