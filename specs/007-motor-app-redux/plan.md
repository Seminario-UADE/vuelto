# Implementation Plan: App — motor en el dispositivo y store de Redux

**Branch**: `claude/motor-app-redux-95593e` | **Date**: 2026-11-01 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/007-motor-app-redux/spec.md` (issue #81, ADR-010 pasos 1 y 2)

## Summary

La app deja de usar `servidor-simulado.ts` y calcula la recomendación y los topes con
`@vuelto/motor`, sobre un store de Redux Toolkit con seis slices de datos de entrada. La
recomendación y los topes son selectores memoizados (`createSelector`) que llaman al motor; el
reloj es un valor del store. El motor se compila al instalar (`prepare`), así Metro lo resuelve en
Expo Go, web y EAS sin pasos manuales. Se hace en dos commits, como el plan de ADR-010:
(1) `api.recomendar`/`getTopes` sobre el motor y los datos de ejemplo; (2) el store, los selectores
y la migración de las pantallas, que reemplaza a `api.recomendar`, `sesion.ts` y `perfil-local.ts`.

## Technical Context

**Language/Version**: TypeScript ~6.0 strict, React 19.3, React Native 0.88, Expo SDK 58

**Primary Dependencies**: `@vuelto/motor` (workspace, compilado a `dist/`), `@reduxjs/toolkit` ^2.13, `react-redux` ^9.3, `@react-native-async-storage/async-storage` 2.2 (ya estaba)

**Storage**: AsyncStorage, una clave versionada (`vuelto.store.v1`), escrita por un listener propio

**Testing**: Vitest (entorno node) en `apps/mobile`: reducers, selectores, persistencia con almacenamiento en memoria, adaptadores de vista. Manual: simulador de iOS (Expo Go), web y APK de EAS

**Target Platform**: iOS y Android (Expo Go y APK `preview`), web (`expo export`)

**Project Type**: mobile-app dentro del monorepo de npm workspaces

**Performance Goals**: recalcular la recomendación por tecla sin demora perceptible (el motor sobre ~4 promos y ~10 compras corre en < 1 ms; con el corpus real lo mide #42)

**Constraints**: sin red en el camino de la recomendación; ningún selector lee el reloj del sistema; nada derivado en el store ni en AsyncStorage

**Scale/Scope**: 22 pantallas; 9 leen `sesion.ts` o `perfil-local.ts` y se migran

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Cómo se cumple | Estado |
|---|---|---|
| I. Decisión, no listado | No se agregan pantallas; la recomendación sigue siendo para un comercio elegido. Las promos descartadas "por categoría" (otro rubro) no se muestran (R4) | ✅ |
| II. Motor determinístico | La app llama a `recomendar()`/`estimarTopes()` sin cambiar el motor. `ahora` entra por parámetro desde el store (FR-005). Resultado derivado con `createSelector`, nunca guardado (FR-010). El grupo sigue en un reemplazo de Edge Function, que usa el mismo motor (FR-012) | ✅ |
| III. Null explícito | Los tipos nuevos del store y de la persistencia no usan `?:`; lo ausente es `null`. Mercado Pago no entra al perfil del motor en vez de inventarle banco y red | ✅ |
| IV. Secretos y privacidad | No hay secretos nuevos. Se persisten compras del período en el dispositivo, como prevé ADR-010 (`privacidad.md` ya actualizado en el PR #80). No hay imágenes | ✅ |
| V. Topes estimados con base | Cifra, estado y base de cada tope salen de `formatearEstimacion()` (FR-007). Una compra sin guardar no cambia ningún tope: solo `compras/agregada` los cambia | ✅ |
| VI. Test-first en el motor | El motor no cambia. Los selectores y reducers se escriben con sus tests (SC-003) | ✅ |
| Flujo | Issue L: spec-kit completo, `/code-review`, `test-runner` y `rules-guardian` (toca el uso del motor) | ✅ |

**Post-design**: sin cambios; no hay violaciones que justificar.

## Project Structure

### Documentation (this feature)

```text
specs/007-motor-app-redux/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/store.md
└── tasks.md
```

### Source Code (repository root)

```text
packages/motor/package.json        + "prepare": "npm run build" (R1)
apps/mobile/
├── package.json                   + @vuelto/motor, @reduxjs/toolkit, react-redux
└── src/
    ├── data/
    │   ├── fixtures.ts            + corpus, perfil y compras de ejemplo con la forma del motor
    │   ├── calculo.ts             NUEVO: funciones puras motor → vista (recomendación, topes,
    │   │                          compras, reintegro de una compra). Sin React ni Redux
    │   ├── vista-recomendacion.ts se queda: traduce la respuesta del motor a la vista
    │   ├── grupo-simulado.ts      NUEVO (reemplaza la parte de grupo de servidor-simulado.ts):
    │   │                          stand-in de la Edge Function de grupo, con el motor por integrante
    │   ├── api.ts                 queda solo lo que sale a la red (catálogos, ticket,
    │   │                          invitaciones, grupo)
    │   ├── servidor-simulado.ts   BORRADO
    │   ├── sesion.ts              BORRADO
    │   └── perfil-local.ts        BORRADO
    ├── store/
    │   ├── index.ts               crearStore({ almacenamiento, reloj }), RootState, hooks tipados
    │   ├── sesion.ts · perfil.ts · corpus.ts · compras.ts · simulacion.ts · contactos.ts
    │   ├── selectores.ts          selectEntradasMotor, selectRecomendacion, selectTopes, …
    │   ├── persistencia.ts        listener que escribe, y `rehidratar` que lee
    │   └── *.test.ts
    ├── hooks/use-reloj.ts         capa imperativa: despacha `ahora` al abrir, al volver a
    │                              primer plano y a la medianoche
    └── app/**                     pantallas migradas a useAppSelector/useAppDispatch
```

**Structure Decision**: `src/store/` para Redux (slices, selectores, persistencia); el cálculo
puro queda en `src/data/calculo.ts` para que los selectores sean finos y se pueda probar sin store.

## Complexity Tracking

Sin violaciones.
