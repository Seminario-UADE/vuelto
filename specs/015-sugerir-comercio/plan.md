# Implementation Plan: Sugerir el comercio del catálogo cuando el nombre no coincide

**Branch**: `claude/134-sugerir-comercio` | **Date**: 2026-11-15 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/015-sugerir-comercio/spec.md`

## Summary

En «Revisá tu compra», si el comercio no coincide exacto con el catálogo, un recuadro sugiere hasta 3 comercios (nombre y rubro), con «Buscar otro comercio» y «No está en la lista». Las sugerencias salen de una función pura nueva, `data/sugerir-comercio.ts`: los nombres del catálogo dentro del texto del ticket, los contenidos en el nombre limpio y los parecidos por una distancia de edición propia (research R1). La pantalla guarda el comercio y el rubro elegidos hasta que cambie el texto (R7), y el campo avisa cuando el usuario termina de escribir (R6).

## Technical Context

**Language/Version**: TypeScript 6 (strict); Expo SDK 58 (React Native, Expo Router); tests en Node ≥ 22.13 con Vitest.

**Primary Dependencies**: ninguna nueva. Se reusan `data/comercios.ts` (`claveDeComercio`, `buscarComercios`, `esComercioDeRubro`, `nombreDeRubro`) y `data/calculo.ts` (`promoPropuesta`, `detallesDeLaCompra`).

**Storage**: ninguno. La elección no se recuerda (FR-012).

**Testing**: Vitest en `apps/mobile` (`src/**/*.test.ts`) para la lógica, con un catálogo de prueba. La pantalla se prueba a mano (quickstart §2).

**Target Platform**: iOS y Android (Expo Go y EAS) y web (vuelto.expo.app).

**Project Type**: app móvil (workspace `apps/mobile`).

**Performance Goals**: menos de 100 ms con 1.000 comercios y 60 líneas de ticket (SC-005).

**Constraints**: determinístico, sin red ni modelos de lenguaje (FR-003); nunca elige solo (FR-004).

**Scale/Scope**: un módulo de lógica nuevo, un componente nuevo, un ajuste al campo de texto y uno a «Revisá tu compra».

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.* Constitución 3.0.2.

| Principio | Cómo se cumple | Estado |
|---|---|---|
| I. Regla de oro | Ayuda a elegir el comercio de una compra ya hecha; no lista promociones (las sugerencias son comercios, no promos) | ✅ |
| II. Motor determinístico | El motor no cambia; la sugerencia es código determinístico, sin LLM | ✅ |
| III. `null` explícito, nunca inferir | La sugerencia nunca se aplica sola (FR-004); los tipos nuevos usan `T \| null` | ✅ |
| IV. Secretos y privacidad | Usa el texto del ticket que ya está en la pantalla, ya tapado; no se guarda nada nuevo | ✅ |
| V. Topes estimados | Al elegir, se recalcula la promo con el texto y la base que ya tiene (issue #144) | ✅ |
| VI. Tests | La lógica en `data/sugerir-comercio.ts` con tests, incluidos los anexos de la spec | ✅ |
| Stack y costo | Sin dependencias nuevas | ✅ |

**Re-check post-diseño**: sin cambios. Nada para *Complexity Tracking*.

## Project Structure

### Documentation (this feature)

```text
specs/015-sugerir-comercio/
├── spec.md
├── plan.md
├── research.md          # R1-R7
├── data-model.md        # SugerenciaComercio, ResultadoSugerencia, estado de la pantalla
├── quickstart.md
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

Sin `contracts/`: no hay interfaces nuevas hacia afuera de la app.

### Source Code

```text
apps/mobile/src/
├── data/
│   ├── sugerir-comercio.ts / .test.ts         # nombre limpio, texto del ticket, contenido, parecido, buscador (R1-R5)
│   └── sugerir-comercio.anexos.test.ts        # medición de SC-001 y SC-002 (no se toca al ajustar)
├── components/
│   ├── field.tsx                              # + onBlur (R6)
│   └── sugerencia-comercio.tsx                # el recuadro, el buscador y la línea de confirmación
└── app/revisa.tsx                             # elegido / noEstaEnLaLista / buscadoEn (R7); el rubro elegido entra en la promo
```

**Structure Decision**: la lógica va a `data/`, junto a `comercios.ts`, porque trabaja sobre el catálogo y la usan la pantalla y sus tests; no depende del ticket (sirve también para la carga a mano).

## Orden de implementación

1. **Lógica pura** (`sugerir-comercio.ts`), tests primero: nombre limpio, texto del ticket (con nombres cortos), contenido, parecido con la lista de ajuste, dos rubros, rubros afuera, buscador, tiempo. Después, el test de los anexos.
2. **Pantalla**: `onBlur` en `Field`, el componente del recuadro y los cambios en «Revisá» (elección, rubro, cuándo buscar). Prueba a mano (quickstart §2).
3. **Cierre**: verificación completa, `rules-guardian`, `/code-review`, bitácora y PR que cierra la issue #134.

## Complexity Tracking

Sin violaciones de la constitución.
