# Implementation Plan: App mobile base y las 18 pantallas de diseño

**Branch**: `claude/vuelto-mobile-screens-9fdae7` | **Date**: 2026-10-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/006-app-mobile-pantallas/spec.md`

## Summary

Crear `apps/mobile` (Expo SDK 58 + Expo Router + TypeScript) dentro del monorepo, con un tema de
tokens semánticos en un único archivo, Hanken Grotesk, íconos por plataforma, cliente de Supabase sin
queries y una capa de datos `src/data/` que devuelve fixtures con la forma de las respuestas de las
Edge Functions. Sobre esa base se implementan las 18 pantallas de Stitch v5 conectadas entre sí, con
las correcciones de la auditoría v5. Decisiones en [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 6 (strict, `tsconfig.base.json`), React 19 / React Native 0.88

**Primary Dependencies**: `expo@~58`, `expo-router`, `react-native-screens`, `react-native-safe-area-context`, `@expo-google-fonts/hanken-grotesk`, `expo-font`, `expo-splash-screen`, `expo-symbols`, `@expo/vector-icons`, `expo-haptics`, `react-native-svg`, `@react-native-segmented-control/segmented-control`, `@react-native-async-storage/async-storage`, `@supabase/supabase-js`, `react-native-reanimated` (solo aparición de la respuesta y cambio de cifra)

**Storage**: AsyncStorage (perfil local y sesión de Supabase). Nada de imágenes.

**Testing**: Vitest sobre módulos TS puros de `apps/mobile/src` (data, lib, theme); verificación visual por capturas

**Target Platform**: iOS 17+ y Android 10+ vía Expo Go (SDK 58)

**Project Type**: mobile-app (workspace `apps/mobile` del monorepo)

**Performance Goals**: respuesta inline visible < 300 ms tras tocar un comercio (incluida la demora simulada de 250 ms); 60 fps en scroll

**Constraints**: sin `@vuelto/motor`; solo `EXPO_PUBLIC_*`; sin cámara real; sin hex fuera de `src/theme.ts`; apariencia solo clara; Dynamic Type sin bloquear

**Scale/Scope**: 18 pantallas, ~15 componentes, 1 capa de datos con ~14 funciones

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Estado | Cómo se cumple |
|---|---|---|
| I. Decisión, no listado | ✅ (PATCH 2.0.1) | Monto opcional (auditoría P1 #1): la constitución 2.0.1 aclara que la compra concreta es el comercio elegido y el monto es opcional. Ninguna pantalla lista promociones sin un comercio elegido; Topes muestra la promo solo como contexto del tope. |
| II. Motor determinístico | ⚠️ justificado | `apps/mobile/package.json` sin `@vuelto/motor`; pantallas y componentes no calculan. `servidor-simulado.ts` dentro de `src/data/` arma la respuesta para montos arbitrarios mientras no existe la Edge Function (ver Complexity Tracking). |
| III. Null explícito | ✅ | Contratos con `T \| null`, sin campos opcionales; el ticket trae `medio: null` y se pregunta. |
| IV. Secretos y privacidad | ✅ | Solo `EXPO_PUBLIC_SUPABASE_URL` / `ANON_KEY`; sin cámara (FR-015); sin tablas nuevas (no aplica RLS). `rules-guardian` antes del PR. |
| V. Topes estimados con base | ✅ | `Base` obligatoria en cada estimado; `sin-base` sin cifra; tests de invariantes sobre fixtures. |
| VI. Test-first en el motor | N/A | No se toca el motor. Igual hay tests de la capa de datos. |
| Flujo de trabajo | ✅ | spec-kit completo (issue M), `/code-review`, `test-runner`, `rules-guardian`, bitácora. |

**Gate**: pasa. El PO aprobó el 16/10/2026 el PATCH 2.0.1 del Principio I y la excepción del servidor
simulado (Principio II, ver Complexity Tracking).

## Project Structure

### Documentation (this feature)

```text
specs/006-app-mobile-pantallas/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/edge-functions.md
├── checklists/requirements.md
└── tasks.md            # /speckit-tasks
```

### Source Code

```text
apps/mobile/
├── app.json                      # scheme "vuelto", userInterfaceStyle "light", ícono y splash
├── package.json                  # @vuelto/mobile — sin @vuelto/motor; scripts lint/typecheck/test
├── tsconfig.json                 # extiende tsconfig.base.json + expo
├── vitest.config.ts
├── .env.example                  # EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY
├── assets/                       # icon.png, splash-icon.png, adaptive-icon.png (desde logo-*.svg)
├── app/
│   ├── _layout.tsx               # fuentes, splash, providers, Stack raíz, redirección de onboarding
│   ├── (onboarding)/
│   │   ├── _layout.tsx           # Stack sin header
│   │   ├── index.tsx             # Bienvenida
│   │   ├── medios.tsx            # Tus medios de pago
│   │   ├── comercios.tsx         # Paso 2 Comercios
│   │   └── primera-respuesta.tsx
│   ├── (auth)/login.tsx          # sheet Guardar perfil (formSheet)
│   ├── (tabs)/
│   │   ├── _layout.tsx           # Tabs: Inicio · Comprar · Topes · Perfil
│   │   ├── index.tsx             # Inicio + respuesta inline
│   │   ├── comprar.tsx           # Nueva compra  (= "registrar" de la issue)
│   │   ├── topes.tsx             # Tus topes
│   │   └── perfil.tsx            # Perfil + contactos
│   ├── comercio/[id].tsx         # Con qué pagar (stack, header nativo)
│   ├── mis-compras.tsx           # stack
│   ├── escanear.tsx              # fullScreenModal
│   ├── revisa.tsx                # formSheet Revisá tu compra
│   ├── contactos/invitar.tsx     # stack
│   ├── contactos/quitar.tsx      # formSheet
│   ├── i/[token].tsx             # Aceptar invitación (deep link)
│   ├── grupo/armar.tsx           # stack
│   └── grupo/resultado.tsx       # Gasto en grupo (stack)
└── src/
    ├── theme.ts                  # ÚNICO archivo con colores, tipografía, espacios, radios
    ├── components/               # Text, Icon, Button, Card, DecisionCard, TopeBar, TopeRow, Chip,
    │                             # Avatar, OptionRow, Field, FixedFooter, Screen, SheetHeader,
    │                             # EmptyState, Toast, SectionHeader
    ├── data/
    │   ├── contracts.ts          # tipos de data-model.md
    │   ├── fixtures.ts           # DESIGN.md §9 + bordes, reloj fijo
    │   ├── servidor-simulado.ts  # reemplazo temporal de la Edge Function (solo lo importa api.ts)
    │   ├── api.ts                # funciones async con la firma de contracts/
    │   ├── sesion.ts             # store en memoria (compras guardadas, contactos quitados)
    │   ├── perfil-local.ts       # AsyncStorage
    │   └── *.test.ts
    ├── hooks/                    # useAsync, useColumns (fontScale)
    └── lib/
        ├── supabase.ts           # createClient con EXPO_PUBLIC_*; sin queries
        ├── format.ts             # $24.500, ≈$4.900, fechas es-AR (Intl hoisteado)
        └── *.test.ts
```

**Desvíos durante la implementación**: las rutas viven en `src/app/` (convención de Expo SDK 58)
y no en `app/`; se sumó `contactos/index` (la lista de Contactos que queda detrás del sheet Quitar
contacto, como en el diseño de Stitch); los nombres de archivo de componentes van en kebab-case.

**Structure Decision**: un workspace `apps/mobile` con Expo Router file-based. Las pantallas viven en
`app/` y solo componen componentes de `src/components/` con datos de `src/data/api.ts`. Pantallas
hijas en el stack raíz (research R2). Los nombres de ruta concilian la issue: `(auth)/login`,
`(tabs)/index`, `(tabs)/topes`, `(tabs)/perfil` y `(tabs)/comprar` en lugar de `registrar`.

## Mapa de correcciones de la auditoría

| # | Dónde se resuelve |
|---|---|
| P1 #1 | `(tabs)/index.tsx` respuesta inline + monto opcional; Escanear como fila secundaria en Comprar |
| P1 #2 | `DecisionCard` solo en Inicio (con comercio), Con qué pagar, Primera respuesta, Gasto en grupo |
| P1 #3 | `revisa.tsx` con `FixedFooter` |
| P1 #4 | `topes.tsx` sin agregado; "2 medios con tope disponible" |
| P1 #5 | `userInterfaceStyle: "light"` + `theme.ts` + regla de lint/test anti-hex |
| P1 #6 | `Icon` (SF/Material) + header nativo del stack |
| P2 #7, #9 | `FixedFooter` reserva alto + safe area; pantallas hijas sin tab bar |
| P2 #8 | "Usar Galicia" una línea |
| P2 #10 | sentence case |
| P2 #11 | `Avatar` "Vos" sin inicial; dos letras si se repite |
| P2 #12 | FR-021 en fixtures + test |
| P2 #13 | "Te devolvieron" solo en Topes y Mis compras |
| P2 #14 | sin campana |
| P2 #15 | monto opcional con `keyboardType="number-pad"` |
| P2 #16 | badges ≥12 pt; filtros con segmented control |
| P2 #17 | `useColumns()` con fontScale > 1,2 |
| P2 #18 | barra de 2 segmentos sin texto; un solo primario en Comercios |
| P3 | fechas 2026; fondo de Guardar perfil = Primera respuesta; buscador sin borde interior |

## Entrega

Decisión del PO (16/10/2026): **un solo PR** que cierra #39, con un commit por fase (base, onboarding,
compra y topes, perfil y contactos). El PR incluye el PATCH 2.0.1 de la constitución.

## Verificación

- `npm run lint`, `typecheck`, `test` desde la raíz (máximo dos rondas de arreglos).
- Capturas por pantalla, en claro y con el texto más grande de accesibilidad, comparadas con
  `scratchpad/stitch/*.png` y la auditoría.
- No hay Xcode en la Mac (research R13): el PO lo instala. Mientras tanto se verifica con Expo web a
  390×844 en el navegador integrado; las capturas finales salen del iOS Simulator.
- `rules-guardian` y `/code-review` antes del PR.

## Complexity Tracking

| Violación | Por qué hace falta | Alternativa más simple descartada porque |
|---|---|---|
| Principio I, letra "(dónde y cuánto)": monto opcional | Auditoría P1 #1: la respuesta en 1 toque es el objetivo del producto en la caja | Monto obligatorio: tres pasos para la respuesta, el problema #1 de la auditoría |
| Principio II: `servidor-simulado.ts` calcula `min(%·monto, tope)` en el dispositivo | Que el campo de monto funcione en la demo de Expo Go antes de que exista la Edge Function | Fixtures fijos solo para $24.500: el campo de monto no respondería a ningún otro valor. Se aísla en `src/data/`, solo lo importa `api.ts`, tiene tests y se borra con #43/#45 |
