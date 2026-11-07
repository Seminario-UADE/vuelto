# Implementation Plan: Flujo directo — compra por confirmar, tres tabs y onboarding con primera respuesta real

**Branch**: `012-flujo-directo` | **Date**: 2026-11-05 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/012-flujo-directo/spec.md`

## Summary

Este plan cambia el flujo de la app sin tocar el motor ni la forma de una compra confirmada. Son cuatro bloques, que se entregan en este orden y en PRs separados:

1. **Compra por confirmar (US1 + US2, P1)**:
   - un slice nuevo `porConfirmar`, persistido en su propia clave;
   - funciones puras para el borrador, el origen y el cruce con el ticket;
   - `guardarCompra` con un `id` opcional, para que confirmar sea idempotente;
   - «Usar [medio]» en la tarjeta de Inicio;
   - la tarjeta `PorConfirmarCard`;
   - los cambios en `revisa` y `escanear`.
2. **Tres tabs (US3, P2)**: Compras · Inicio · Topes; Perfil pasa a ruta de stack con avatar; se borra Comprar; tab bar nativa con el `tint` del acento; zonas seguras y barra de estado. El diseño visual sigue `DESIGN.md` v6, y sus temas se implementan en #115, que va antes de la parte visual.
3. **Primera respuesta y nombre (US4, P2)**:
   - el componente `SelectorComercios`;
   - `primera-respuesta` interactiva y se borra `comercios`;
   - el nombre en el alta y en Perfil;
   - `perfilInicial.nombre = null`;
   - una migración de largo del nombre.
4. **Cuenta al final (US5, P3, condicional)**: lectura `anon` de catálogos y promociones; `perfil.borrador`; `guardarBorradorEnCuenta`; guards nuevos; la pantalla de confirmar email.

Las decisiones están en [research.md](research.md), las entidades en [data-model.md](data-model.md) y las rutas en [contracts/rutas.md](contracts/rutas.md).

## Technical Context

**Language/Version**: TypeScript 6 strict (monorepo, Node ≥ 22.13), React Native 0.88 / Expo SDK 58, Expo Router.

**Primary Dependencies**: Redux Toolkit 2, `react-redux` 9, `@supabase/supabase-js`, `@vuelto/motor`, `react-native-safe-area-context`, `expo-status-bar` (todas ya están). **Ninguna nueva.**

**Storage**:
- En el dispositivo (AsyncStorage): clave nueva `vuelto.por-confirmar.v1`. `vuelto.store.v1` suma la parte opcional `perfil.borrador` (US5), que se valida por parte y no cambia la versión.
- En Supabase: `perfiles.nombre_para_mostrar` (ya existe) con un check de largo nuevo. En US5, permisos de lectura de `anon` sobre `bancos`, `categorias` y `promociones`.

**Testing**:
- Vitest en `apps/mobile`, con `storeDePrueba`, el reloj controlado, almacenamiento en memoria y `DatosPerfil` en memoria.
- pgTAP (`supabase test db`) para las dos migraciones.
- Pantallas: manual en el simulador de iOS y en Android, según [quickstart.md](quickstart.md).

**Target Platform**: iOS y Android (Expo Go, APK de EAS) y web.

**Project Type**: mobile-app con backend Supabase.

**Performance Goals**: crear, confirmar y descartar una compra por confirmar se refleja en menos de 1 s y sin red. Igual que hoy, la recomendación se recalcula con cada tecla del monto.

**Constraints**:
- Modo avión funcional en US1.
- Las compras por confirmar nunca llegan a `selectEntradasMotor`.
- Nada de `new Date()` en la lógica: todo con `sesion.ahora`.
- Ninguna imagen de ticket se persiste.

**Scale/Scope**:
- 1 slice nuevo y 4 funciones puras.
- 3 pantallas nuevas (`(tabs)/compras`, `descartar-por-confirmar`, `(auth)/confirmar-email`).
- 2 pantallas que se borran (`(tabs)/comprar`, `(onboarding)/comercios`) y 1 que se mueve (`perfil`).
- 7 pantallas que cambian (`index`, `comercio/[id]`, `revisa`, `escanear`, `primera-respuesta`, `bienvenida`, `registro`).
- 2 migraciones.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Cómo se cumple | Estado |
|---|---|---|
| **I. El producto decide, no lista** | Cada cambio acorta el camino a la decisión (un «Usar» en Inicio) o hace que los topes sean ciertos. No se agrega ningún listado de promociones. | ✅ |
| **II. Motor determinístico, en la app** | El motor no cambia. La recomendación de la primera respuesta y de Inicio sale de los mismos selectores (`useRecomendacionPara`, `selectRecomendacion`). Las compras por confirmar no entran al motor. El reloj es `sesion.ahora`. | ✅ |
| **III. Salida estructurada, `null` explícito, nunca inferir** | Si el ticket no trae medio, el borrador queda con `medioId: null` y el usuario elige con un toque. La sugerencia no preselecciona (FR-008, research R4). El cruce con el ticket es una función pura y determinística. | ✅ |
| **IV. Secretos y privacidad** | No hay secretos nuevos. Las compras por confirmar y el borrador viven en el dispositivo, con dueño y vencimiento, y quedan declarados en `privacidad.md` (FR-037). La lectura `anon` es solo de datos públicos de MODO, y su test pgTAP prueba que `anon` no lee ni escribe tablas de usuarios. La migración nueva trae su RLS en el mismo archivo. | ✅ |
| **V. Topes estimados, con su base** | Una compra sin confirmar no modifica ningún tope (FR-003, SC-003, con tests). Las bases no cambian de texto. | ✅ |
| **VI. Test-first en el motor** | No se toca el motor. Las funciones puras y el slice nuevos se escriben con sus tests antes que las pantallas. | ✅ |
| **Flujo de trabajo** | Feature L: spec-kit completo. Se divide en 4 PRs, uno por issue, con `Closes #N`. `rules-guardian` es obligatorio en los PRs que tocan `revisa`/`escanear` (ticket) y en las migraciones. | ✅ |

**Re-check post-diseño**: sin violaciones. No hace falta la tabla de complejidad.

## Project Structure

### Documentation (this feature)

```text
specs/012-flujo-directo/
├── spec.md
├── plan.md              # este archivo
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── rutas.md
├── checklists/
│   └── requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
apps/mobile/src/
├── app/
│   ├── _layout.tsx                      # rutas nuevas: perfil, descartar-por-confirmar, confirmar-email
│   ├── (tabs)/
│   │   ├── _layout.tsx                  # Compras · Inicio · Topes, NativeTabs (o JS) con tint del acento
│   │   ├── compras.tsx                  # NUEVA (ex mis-compras + por confirmar + acciones)
│   │   ├── index.tsx                    # avatar, PorConfirmarCard, «Usar», sin fila de escanear
│   │   ├── topes.tsx                    # enlaces a /compras
│   │   └── comprar.tsx                  # SE BORRA
│   ├── perfil.tsx                       # MOVIDA desde (tabs)/, nombre editable
│   ├── mis-compras.tsx                  # redirección a /compras
│   ├── comercio/[id].tsx                # «Usar» → porConfirmarCreada
│   ├── revisa.tsx                       # parámetro porConfirmar, medio sugerido, fechas
│   ├── escanear.tsx                     # parámetro porConfirmar, cruce
│   ├── descartar-por-confirmar.tsx      # NUEVA
│   ├── (onboarding)/
│   │   ├── _layout.tsx                  # (US5) medios y primera-respuesta sin sesión
│   │   ├── bienvenida.tsx               # (US5) «Empezar»
│   │   ├── primera-respuesta.tsx        # interactiva
│   │   └── comercios.tsx                # SE BORRA
│   └── (auth)/
│       ├── registro.tsx                 # nombre
│       └── confirmar-email.tsx          # NUEVA (US5)
├── components/
│   ├── por-confirmar-card.tsx           # NUEVO
│   ├── selector-comercios.tsx           # NUEVO (extraído de comercios.tsx)
│   ├── recomendacion.tsx                # footer «Usar»
│   ├── formulario-cuenta.tsx            # campo nombre
│   └── avatar-boton.tsx                 # NUEVO
├── store/
│   ├── por-confirmar.ts                 # NUEVO slice + persistencia propia
│   ├── por-confirmar.test.ts            # NUEVO
│   ├── thunks.ts                        # guardarCompra(id?), crear/confirmar/descartar, guardarBorradorEnCuenta
│   ├── perfil.ts                        # nombre null, borrador (US5), nombreCambiado
│   ├── perfil-remoto.ts                 # leer/guardar nombre
│   └── selectores.ts                    # selectPorConfirmarVigentes
├── data/
│   ├── por-confirmar.ts                 # NUEVO: borradorDesdePorConfirmar, origenAlConfirmar, ticketCoincide, normalizarComercio
│   ├── por-confirmar.test.ts            # NUEVO
│   └── fixtures.ts                      # ticket con fecha de hoy; «Martín» solo en escenario demo
└── perfil/datos.ts                      # guardarNombre / leerNombre

supabase/
├── migrations/
│   ├── 20261105000001_perfiles_nombre_largo.sql
│   └── 20261105000002_catalogos_lectura_anon.sql      # US5
└── tests/database/
    ├── perfiles_nombre_largo.test.sql
    └── catalogos_lectura_anon.test.sql                 # US5

docs/product/privacidad.md                  # FR-037
docs/design/ideas-ux.md                     # estado: issue
```

**Structure Decision**: es el monorepo existente. Toda la lógica nueva va en módulos puros de `apps/mobile/src/data` y `store` (ADR-009: núcleo funcional, capa imperativa), y las pantallas solo la cablean.

## Entrega en issues (una rama y un PR por issue)

| Orden | Issue | US | Depende de | Tamaño |
|---|---|---|---|---|
| 1 | #109 Compra por confirmar: modelo, «Usar» y confirmar a mano | US1 | — | M |
| 2 | #110 Confirmar la compra por confirmar con el ticket | US2 | 1 | S |
| 3 | #103 Navegación de tres tabs, Perfil desde el avatar y zonas seguras | US3 | 1 (para la tab Compras) | M |
| 4 | #111 Primera respuesta interactiva y nombre del usuario | US4 | — | M |
| 5 | #112 Probar antes de crear la cuenta | US5 | 4 | L |
| 6 | #113 Rehacer la UI en Stitch con el flujo directo | diseño | — (guía a 1, 3 y 4) | S |

Las issues 1 y 4 pueden ir en paralelo. Las issues 3 y 4 tocan `(tabs)/index.tsx` y `_layout.tsx`, así que van una después de la otra o con coordinación.

## Complexity Tracking

Sin violaciones de la constitución.
