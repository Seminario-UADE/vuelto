# Implementation Plan: App — sincronizar el corpus y las compras del período

**Branch**: `claude/magical-knuth-39fc08` | **Date**: 2026-11-02 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/009-sincronizar-corpus/spec.md` (issue #42, ADR-010 paso 5)

## Summary

La app baja el corpus de promos y las compras del período al store de Redux al abrirse y al volver a primer plano, con
una lectura paginada por cursor `(actualizada_en, id)` detrás de una interfaz inyectada, y guarda el corpus en su propia
clave de AsyncStorage. Las bajas se mapean a promos vencidas (el consumo del tope compartido sigue contando), la primera
sincronización reemplaza el corpus de ejemplo y recién ahí el reloj pasa a ser el real. El motor no cambia. Se agrega la
leyenda "Promos actualizadas hace X", un script de medición del corpus y la decisión de persistencia, medida o
proyectada y rotulada.

## Technical Context

**Language/Version**: TypeScript 6 strict, Node ≥ 22.13 (`.nvmrc`)

**Primary Dependencies**: Expo SDK 58 / React Native 0.88, Redux Toolkit (`@reduxjs/toolkit`, `react-redux`),
`@supabase/supabase-js` 2.x (ya están), `@vuelto/motor` (sin cambios). **Sin dependencias nuevas.**

**Storage**: AsyncStorage (dos claves: `vuelto.store.v1` y `vuelto.corpus.v1`); la decisión de pasar a `expo-sqlite`
queda para cuando haya medición real (#35)

**Testing**: Vitest (`apps/mobile`, entorno node, sin red). Repositorio en memoria para toda la lógica. Una prueba de
integración de las consultas contra un Supabase local (Docker), fuera del CI si no hay Docker

**Target Platform**: iOS y Android (Expo Go y APK de EAS) y web de verificación

**Project Type**: mobile-app (monorepo npm workspaces)

**Performance Goals**: la sincronización no bloquea la UI ni la recomendación; el cálculo en vivo no cambia (sin red al
tipear, SC-004)

**Constraints**: sin red la app sigue igual (RNF-02); ningún pedido > 15 s; nada derivado se guarda; solo anon key y la
sesión del usuario; las compras solo del dueño y del período

**Scale/Scope**: ~2.000 promos (estimación, sin medir), decenas de compras del período, un usuario por sesión

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.* Constitución 3.0.0.

| Principio | Cumple | Cómo |
|---|---|---|
| I. Regla de oro | Sí | No agrega pantallas de promos. La leyenda es una línea discreta en Inicio; no lista promociones |
| II. Motor determinístico | Sí | El motor no se toca. La recomendación y los topes siguen derivados por selectores; `marca`, `sincronizadoEn` y `descartadas` son datos de entrada, no derivados. `ahora` entra como valor del store; los reducers no leen el reloj |
| III. Null explícito | Sí | `marca: string \| null`, `sincronizadoEn: string \| null`; ningún campo opcional (`?:`). El mapeo de filas no inventa: lo ausente es `null` |
| IV. Secretos y privacidad | Sí | Solo la anon key y la sesión del usuario (RLS). La medición usa un usuario de prueba, nunca la service role. **Una excepción acotada**: la prueba de integración usa la clave de servicio de DEMO de un Supabase local, solo para sembrar y limpiar promos (hace de ingesta), se salta si la URL no es localhost y no corre en el CI Al dispositivo llegan el corpus (público) y las compras propias del período. No hay tablas nuevas |
| V. Topes estimados con su base | Sí | Las bajas se mapean a vencidas para que sus compras sigan descontando; el restante no sube (US4). Sin compras, la base lo dice como hoy |
| VI. Test-first en el motor | N/A | No se toca el motor. La lógica nueva se escribe con tests Vitest antes o junto con el código, sin red |

Stack y costo: $0, sin servicios ni dependencias nuevas. Flujo: issue M ⇒ spec-kit completo + `rules-guardian` antes del PR.

**Re-evaluación tras el diseño (Phase 1)**: sin violaciones. Dos decisiones se apartan del texto de la issue (no de la
constitución) y quedan marcadas para el PO en la spec: ventana = período en lugar de "últimos N días", y el corpus en
una clave aparte.

## Project Structure

### Documentation (this feature)

```text
specs/009-sincronizar-corpus/
├── spec.md
├── critica.md           # spec-critic
├── plan.md              # este archivo
├── research.md          # R1–R10, con las consultas verificadas contra un Supabase local
├── data-model.md        # slices, claves de persistencia, repositorio, contrato con #44
├── quickstart.md        # cómo validar de punta a punta
├── contracts/
│   ├── repositorio.md   # interfaz RepositorioSincronizacion y reglas del thunk
│   └── postgrest.md     # las consultas exactas (verificadas)
├── checklists/requirements.md
└── tasks.md             # lo genera /speckit-tasks
```

### Source Code (repository root)

```text
apps/mobile/
├── scripts/
│   └── medir-corpus.ts            # runner del script de medición (anon + usuario de prueba)
└── src/
    ├── sync/                       # NUEVO: núcleo funcional + capa imperativa de la sincronización
    │   ├── contratos.ts            # RepositorioSincronizacion, FilaPromocion, FilaCompra, Cursor
    │   ├── ventana.ts              # desde/hoy del período con inicioDelPeriodo de @vuelto/motor
    │   ├── mapeo.ts                # filaAPromocion (con baja → vencida), filaACompra; descarta lo inválido
    │   ├── corpus.ts               # reemplazar/mezclar, podar, reconciliar ids (puro)
    │   ├── paginar.ts              # leerTodo con cursor (puro sobre el repositorio)
    │   ├── sincronizar.ts          # thunk: espera, exclusión, timeout, atomicidad, época/usuario
    │   ├── medicion.ts             # medirCorpus + proyección
    │   ├── repositorio-memoria.ts  # para los tests
    │   ├── repositorio-supabase.ts # supabase-js con la sesión del usuario
    │   └── *.test.ts
    ├── hooks/
    │   ├── use-reloj.ts            # elige la fuente por corpus.marca
    │   └── use-sincronizacion.ts   # NUEVO: apertura y AppState → dispatch(sincronizar)
    ├── lib/frescura.ts (+ test)    # textoFrescura (puro)
    ├── store/
    │   ├── acciones.ts             # EstadoCorpus nuevo, `sincronizado`, `Rehidratado.ahora`
    │   ├── corpus.ts, compras.ts, sesion.ts   # campos y reducers nuevos
    │   ├── persistencia.ts         # dos claves y normalización
    │   ├── index.ts                # Extra: repositorio, reloj, coordinación
    │   └── selectores.ts           # selectFrescura
    └── app/
        ├── _layout.tsx             # arma el repositorio y llama useSincronizacion
        └── (tabs)/index.tsx        # la leyenda
docs/
├── architecture/03-frontend.md, 04-infrastructure.md   # decisión de persistencia, contrato de márgenes
└── product/pendientes.md
```

**Structure Decision**: un directorio nuevo `apps/mobile/src/sync/` que sigue ADR-009 (núcleo funcional: `ventana`,
`mapeo`, `corpus`, `paginar`, `medicion`, `frescura`; capa imperativa: `sincronizar`, los repositorios y los hooks).
El store solo recibe datos de entrada. No hay Edge Function ni cambios en `packages/motor` ni en `supabase/`.

## Complexity Tracking

Sin violaciones de la constitución. Dos puntos que merecen ojo del PO, no de la constitución:

| Decisión | Por qué | Alternativa descartada |
|---|---|---|
| Ventana de compras = período (mes o semana, el más temprano), no "últimos N días del mes" | Coincide con `privacidad.md`, ADR-010 y `comprasDelPeriodo`; evita guardar un mes de más | N días: el store en línea y el reabierto tendrían ventanas distintas, y baja más de lo que la privacidad declara |
| Corpus en una clave de AsyncStorage aparte | Un corpus que no entra no se lleva el perfil ni las compras; la marca viaja con las promos | Una sola clave: pierde datos del usuario sin avisar si el corpus supera 2 MB |
