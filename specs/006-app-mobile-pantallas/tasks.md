# Tasks: App mobile base y las 18 pantallas de diseño

**Input**: `specs/006-app-mobile-pantallas/` (plan, spec, research, data-model, contracts, quickstart)

**Tests**: la spec pide tests de la capa de datos y del tema (SC-003, SC-004, FR-023); no hay tests de
render. Rutas relativas a la raíz del repo.

**Antes de cada tarea de UI**: leer `.claude/skills/impeccable/reference/craft-floor.md` y comparar con
`scratchpad/stitch/<NN>-*.png` (respaldo: `docs/design/screens/`). El HTML de Stitch es referencia de
copy y espaciado, no se copia.

**Entrega** (plan §Entrega): un solo PR que cierra #39, con un commit por fase: Fases 1–2 (base),
Fase 3 (onboarding), Fases 4–6 (compra y topes), Fase 7 (perfil y contactos), Fase 8 (pulido y docs).

## Phase 1: Setup

- [x] T001 Crear la app con `create-expo-app` (SDK 58, plantilla en blanco TS) y moverla a `apps/mobile/`, con `name: "@vuelto/mobile"` y scripts `start`, `lint`, `typecheck` (`tsc --noEmit`), `test` (`vitest run`) en `apps/mobile/package.json`; verificar que **no** figure `@vuelto/motor`
- [x] T002 Instalar con `npx expo install` las dependencias del plan (Technical Context) en `apps/mobile/package.json`, y `vitest` como devDependency
- [x] T003 [P] Configurar `apps/mobile/tsconfig.json` extendiendo `../../tsconfig.base.json` y `expo/tsconfig.base` (con `jsx`, `lib` DOM-free y `types` de expo), strict
- [x] T004 [P] Configurar `apps/mobile/app.json`: `name: "Vuelto"`, `slug`, `scheme: "vuelto"`, `userInterfaceStyle: "light"` (y en `ios`/`android`), `ios.supportsTablet: false`, plugins `expo-router`, `expo-font`, `expo-splash-screen` con fondo Blanco Hueso
- [x] T005 [P] Generar `apps/mobile/assets/icon.png` (1024), `adaptive-icon.png` y `splash-icon.png` desde `docs/presentacion/assets/logo-dark.svg` / `logo-light.svg` con un script en el scratchpad (no se commitea el script)
- [x] T006 [P] Agregar `apps/mobile/.env.example` con `EXPO_PUBLIC_SUPABASE_URL=` y `EXPO_PUBLIC_SUPABASE_ANON_KEY=`, y `.env`, `.expo/`, `apps/mobile/ios`, `apps/mobile/android` al `.gitignore` raíz
- [x] T007 Extender `eslint.config.js` con un bloque para `apps/mobile/**/*.{ts,tsx}`: globals de RN, `eslint-plugin-react-hooks` y `no-restricted-syntax` contra literales `#[0-9a-fA-F]{3,8}` y `rgb(` fuera de `apps/mobile/src/theme.ts`
- [x] T008 [P] Crear `apps/mobile/vitest.config.ts` (entorno node, `include: ["src/**/*.test.ts"]`)
- [x] T009 Correr `npm ci && npm run lint && npm run typecheck && npm run test` desde la raíz y dejarlo verde con la app vacía

## Phase 2: Foundational

- [x] T010 Crear `apps/mobile/src/theme.ts`: tokens semánticos con los hex de DESIGN.md §2 (`canvas`, `surface`, `surfaceStrong`, `divider`, `ink`, `inkSecondary`, `controlBorder`, `accent`, `onAccent`, `accentOnDark`, `warningText`, `warningBg`, `error`, `successBg`, `decisionBg`, `onDecision`, `onDecisionMuted`, `shadow`), escala tipográfica de §3 (display 40/44 … caption 12/16, tracking), espacios (grilla 4, margen 20), radios (20/14/999/8/28) y `hitSlop` 44
- [x] T011 [P] Test `apps/mobile/src/theme.test.ts`: contraste ≥4,5:1 de los pares texto/fondo declarados y que ningún archivo de `app/` ni `src/components/` contenga literales hex o `rgb(` (SC-003)
- [x] T012 [P] Crear `apps/mobile/src/lib/format.ts` (`pesos(24500) → "$24.500"`, `aprox(4900) → "≈$4.900"`, `fechaCorta("2026-10-14") → "14/10"`, `Intl.NumberFormat("es-AR")` hoisteado) y `apps/mobile/src/lib/format.test.ts`
- [x] T013 [P] Crear `apps/mobile/src/lib/supabase.ts`: `createClient` con `process.env.EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`, storage AsyncStorage, `detectSessionInUrl: false`; si faltan las variables exporta `null` y la app abre igual (FR-042). Sin queries
- [x] T014 Crear `apps/mobile/src/data/contracts.ts` con los tipos de `data-model.md` tal cual: todos los campos requeridos, ausentes como `T | null` (nunca `?:`); `Compra.origen: "ticket" | "excepcion" | "manual"`; `Contacto = { id; nombre; iniciales }` sin otros campos
- [x] T015 Crear `apps/mobile/src/data/fixtures.ts`: reloj fijo `HOY = "2026-10-14"` (miércoles), medios, comercios (Coto, Jumbo, Farmacity, YPF, Carrefour + catálogo de búsqueda), topes de DESIGN.md §9 con Santander `queda-poco`, compras de octubre 2026 (9 compras, devolvieron ≈$15.200), contactos Lucía y Mateo, invitaciones `demo-lucia|demo-vencida|demo-usada|demo-propia|demo-contacto`, grupo "Cena del sábado", fixtures de borde (YPF sin promo, Farmacity agotado, ticket ilegible, mes vacío)
- [x] T016 Crear `apps/mobile/src/data/servidor-simulado.ts` (cabecera: "reemplazo temporal de la Edge Function, lo importa solo api.ts, se borra con #43/#45"): `recomendacionPara(comercioId, monto)` y `estadoTope(disponible, nominal)` con umbral ≤30%
- [x] T017 Crear `apps/mobile/src/data/api.ts` con las 14 funciones de `contracts/edge-functions.md`, `async`, demora de 250 ms, leyendo fixtures + `servidor-simulado.ts` + sesión
- [x] T018 Crear `apps/mobile/src/data/sesion.ts`: store con `useSyncExternalStore` para compras guardadas, contactos quitados y contactos aceptados (solo memoria)
- [x] T019 [P] Crear `apps/mobile/src/data/perfil-local.ts` (AsyncStorage: `onboardingCompleto`, `medios`, `comercios`, `cuenta`)
- [x] T020 Test `apps/mobile/src/data/api.test.ts`: Coto sin monto no trae `reintegro`; con 24500 trae 4900, 19600 y tope después 1600 `queda-poco`; YPF `sin-promo`; Farmacity con Macro en alternativas `agotado`; todo estimado con `base`; `sin-base` ⇒ `disponible === null`; fechas en 2026; ResumenTopes sin total agregado; contactos y grupo sin claves `tope|compras|medios` (FR-023); ticket con `medio: null`
- [x] T021 [P] Crear `apps/mobile/src/components/Text.tsx`: variantes de la escala (`display`…`caption`), peso → familia Hanken, `tone` por token, `tabular` → `fontVariant: ["tabular-nums"]`, sin bloquear `allowFontScaling`
- [x] T022 [P] Crear `apps/mobile/src/components/Icon.tsx`: mapa semántico `{ sf, md }` (rubros, volver, cerrar, cámara, buscar, info, editar, check, chevron, agregar, compartir, persona, grupo, tope, casa, bolsa); `SymbolView` en iOS y `MaterialIcons` en Android; `accessibilityLabel` obligatorio si es botón
- [x] T023 [P] Crear `apps/mobile/src/components/Button.tsx`: primario (píldora Salvia, 56 pt mín, 17/600, escala 0.98 al toque, crece en alto con fontScale), secundario (texto Salvia o borde `controlBorder`), deshabilitado con contraste suficiente
- [x] T024 [P] Crear `apps/mobile/src/components/FixedFooter.tsx` y `Screen.tsx`: footer fijo con safe area inferior que mide su alto (`onLayout`) y lo expone para que `Screen` agregue ese padding al final del ScrollView (P1 #3, P2 #7/#9)
- [x] T025 [P] Crear `apps/mobile/src/components/TopeBar.tsx` (SVG: tramo sólido + tramo rayado final, color por `EstadoTope`, sin porcentajes) y `TopeRow.tsx` (cifra ≈, base, estado en texto, "sin base" sin cifra)
- [x] T026 [P] Crear `apps/mobile/src/components/DecisionCard.tsx` (Verde Bosque: "Te conviene", medio con Avatar Champán, razón, cifra display, base; variante sin monto; cruce de opacidad de 150 ms en la cifra con Reanimated, respetando reducir movimiento)
- [x] T027 [P] Crear `Chip.tsx`, `Avatar.tsx` (iniciales neutras / Salvia seleccionado / Champán sobre oscuro / "Vos" sin inicial), `OptionRow.tsx` (radio con borde `controlBorder`, seleccionado con borde 2 pt Salvia), `Card.tsx` (Lino, radio 20), `SectionHeader.tsx`, `EmptyState.tsx`, `Toast.tsx`, `SheetHeader.tsx` (título + X de 44 pt), `Field.tsx` (etiqueta arriba, lápiz, error en Óxido), `Badge.tsx` (≥12 pt) en `apps/mobile/src/components/`
- [x] T028 [P] Crear `apps/mobile/src/hooks/useColumns.ts` (1 columna si `fontScale > 1.2`) y `useAsync.ts` (estado cargando/listo/error con esqueleto)
- [x] T029 Crear `apps/mobile/app/_layout.tsx`: `useFonts` (4 pesos Hanken), splash retenido hasta cargar, `SafeAreaProvider`, Stack raíz con `(onboarding)`, `(tabs)`, `(auth)/login` (formSheet), `comercio/[id]`, `mis-compras`, `escanear` (fullScreenModal), `revisa` (formSheet), `contactos/invitar`, `contactos/quitar` (formSheet), `i/[token]`, `grupo/armar`, `grupo/resultado`; headers nativos con fuente Hanken y tint `ink`; redirección a `(onboarding)` si `onboardingCompleto` es falso
- [x] T030 Crear `apps/mobile/app/(tabs)/_layout.tsx`: Tabs Inicio · Comprar · Topes · Perfil con `Icon`, fondo `canvas`, sombra flotante del tema, activo `ink` relleno, inactivo `inkSecondary`, `maxFontSizeMultiplier` 1,4 en etiquetas
- [x] T031 Crear las 18 rutas de `plan.md` como placeholders con su título, navegables entre sí, en `apps/mobile/app/`
- [x] T032 Completar `docs/architecture/03-frontend.md` (navegación, estado, capa de datos, tema, íconos, dónde vive cada cosa, cómo se reemplaza el mock) y `docs/architecture/02-api-routes.md` (tabla de `contracts/edge-functions.md`)
- [x] T033 Verificar en Expo Go que la app abre y navega las 18 rutas; lint/typecheck/test verdes

**Checkpoint**: commit "base".

## Phase 3: User Story 3 — Onboarding (P1)

**Goal**: los 5 pasos hasta Inicio. **Independent Test**: app recién instalada → Inicio; reabrir → Inicio directo.

- [x] T034 [US3] Bienvenida en `apps/mobile/app/(onboarding)/index.tsx` (ref. `stitch/01-bienvenida`): propuesta en una línea, primario "Empezar", secundario "Ya tengo cuenta" → `(auth)/login?modo=entrar`
- [x] T035 [US3] Medios en `apps/mobile/app/(onboarding)/medios.tsx` (ref. `02-medios`): barra de 2 segmentos sin texto con label accesible "Configuración, paso 1 de 2"; `OptionRow` multiselección por banco; Mercado Pago con nota "Todavía no tenemos promos de este medio"; "Continuar" deshabilitado con motivo si no hay medio con cobertura; guarda en `perfil-local`
- [x] T036 [US3] Comercios en `apps/mobile/app/(onboarding)/comercios.tsx` (ref. `03-comercios`): buscador sin borde interior (P3), chips de frecuentes, "Saltar" en el header, "Continuar" único primario en `FixedFooter`
- [x] T037 [US3] Primera respuesta en `apps/mobile/app/(onboarding)/primera-respuesta.tsx` (ref. `04-primera-respuesta`): `DecisionCard` de Coto sin monto desde `api.recomendar`; primario "Guardar mi perfil" → sheet
- [x] T038 [US3] Sheet Guardar perfil en `apps/mobile/app/(auth)/login.tsx` (ref. `05-guardar-perfil`): email sin contraseña, "Continuar con Apple" solo iOS con estilo de borde, "Ahora no"; modo `entrar`; al completar marca `onboardingCompleto` y `router.replace("/(tabs)")`

## Phase 4: User Story 1 — Saber con qué pagar (P1)

**Goal**: respuesta en 1 toque. **Independent Test**: quickstart recorridos 2, 3 y 6.

- [x] T039 [US1] Inicio en `apps/mobile/app/(tabs)/index.tsx` (ref. `06-inicio` + auditoría P1 #1, #2, P2 #13, #14, #17): "Hola, Martín" sin campana; tarjeta Lino "¿Dónde vas a comprar?" con buscador y chips; al tocar un chip, `DecisionCard` inline (aparición con opacidad+translateY corto) con campo de monto opcional (`number-pad`) y "Ver detalle"; topes en grilla de 2 columnas con `useColumns`; "Últimas compras"; estado vacío del fixture de mes vacío
- [x] T040 [US1] Con qué pagar en `apps/mobile/app/comercio/[id].tsx` (ref. `08-con-que-pagar` + P2 #7, #8): header nativo con nombre y rubro; `DecisionCard`; monto opcional; alternativas compactas con motivo; "¿Pagan entre varios?" → `grupo/armar`; `FixedFooter` "Usar <nombreCorto>" → `revisa?modo=excepcion&comercio=…&monto=…&medio=…`
- [x] T041 [US1] Bordes en `apps/mobile/app/comercio/[id].tsx` e Inicio: `sin-promo` (YPF) con `proximaPromo`, agotado (Farmacity), monto vacío sin "≈$0"

## Phase 5: User Story 2 — Registrar una compra (P1)

**Goal**: ticket, recomendación y manual terminan en Mis compras. **Independent Test**: quickstart recorridos 3 y 4.

- [x] T042 [US2] Nueva compra en `apps/mobile/app/(tabs)/comprar.tsx` (ref. `07-nueva-compra` + P2 #15): buscador de comercio + frecuentes → `comercio/[id]`; filas "Escanear ticket" y "Cargar a mano"; "Últimas compras" + "Ver todas" → `mis-compras`
- [x] T043 [US2] Escanear en `apps/mobile/app/escanear.tsx` (ref. `09-escanear`): visor dibujado oscuro con guías, X de 44 pt, disparador → `api.leerTicket()` (esqueleto mientras lee) → `router.replace("/revisa?modo=ticket")`; error del fixture con "Cargar a mano". Sin `expo-camera` ni archivos (FR-015)
- [x] T044 [US2] Revisá tu compra en `apps/mobile/app/revisa.tsx` (ref. `10-revisa` + P1 #3): `SheetHeader`; ticket dibujado; `Field` comercio/fecha/monto; aviso "El ticket no dice el medio de pago"; "¿Con qué pagaste?" con `OptionRow` sin preselección en `ticket`/`manual` y con el medio marcado en `excepcion`; `FixedFooter` "Guardar compra" deshabilitado hasta medio y monto; al guardar `api.guardarCompra`, háptico leve, cierra y muestra `Toast` "Compra guardada · la ves en Mis compras"

## Phase 6: User Story 4 — Topes y Mis compras (P2)

**Goal**: los cuatro estados de tope con base. **Independent Test**: quickstart recorrido 5.

- [x] T045 [US4] Topes en `apps/mobile/app/(tabs)/topes.tsx` (ref. `11-topes` + P1 #2, #4): resumen Lino "Te devolvieron ≈$15.200 · según 10 compras de octubre", "2 medios con tope disponible", "Los mensuales se reinician en 18 días"; chips por rubro; `TopeRow` por medio con consejo opcional; Provincia "se reinicia el lunes"; nota "Los topes son estimados…"; acceso a Mis compras
- [x] T046 [US4] Mis compras en `apps/mobile/app/mis-compras.tsx` (ref. `12-mis-compras` + P2 #16): header nativo; resumen Lino con "Te devolvieron"; segmented control Todas · Ticket · Recomendación · Manual; filas con `Badge` ≥12 pt y fechas 2026; compras de la sesión primero

## Phase 7: User Story 5 — Perfil, contactos y grupo (P3)

**Goal**: ADR-008 navegable. **Independent Test**: quickstart recorridos 7 y 8.

- [x] T047 [US5] Perfil en `apps/mobile/app/(tabs)/perfil.tsx` (ref. `13-perfil` + P1 #2, P2 #13): encabezado Lino con nombre; medios y comercios declarados; Contactos (lista con quitar → `contactos/quitar?id=`, "Invitar contacto") o "Para vincular contactos, guardá tu perfil" sin cuenta; "Guardá tu perfil" si no hay cuenta; privacidad; "Cerrar sesión" (sustituto)
- [x] T048 [P] [US5] Invitar en `apps/mobile/app/contactos/invitar.tsx` (ref. `14-invitar`): link `vuelto.app/i/…`, QR (SVG) del link, "Vence en 24 h · sirve una sola vez", qué se comparte, `FixedFooter` "Compartir link" con `Share` del sistema
- [x] T049 [P] [US5] Aceptar en `apps/mobile/app/i/[token].tsx` (ref. `15-aceptar` + P2 #9): `api.verInvitacion(token)`; válida: quién invita, comparte / no comparte, "lo que se puede deducir", "Solo aceptá si conocés a quien te mandó el link"; footer con "Aceptar" y "Ahora no" del mismo peso; estados vencida/usada/propia/ya-contacto con "Volver"; sin onboarding guarda el token y vuelve al terminar
- [x] T050 [P] [US5] Quitar en `apps/mobile/app/contactos/quitar.tsx` (ref. `16-quitar`): sheet de confirmación "Se rompe para los dos", primario destructivo en Óxido, "Cancelar"
- [x] T051 [US5] Armar grupo en `apps/mobile/app/grupo/armar.tsx` (ref. `17-armar-grupo` + P2 #7, #11): nombre opcional, monto, "Vos" fijo, contactos con check, "Agregar alguien sin cuenta" (solo nombre), `FixedFooter` "Ver quién conviene que pague"
- [x] T052 [US5] Gasto en grupo en `apps/mobile/app/grupo/resultado.tsx` (ref. `18-gasto-grupo` + P2 #10, #11, #12): `DecisionCard` de grupo; filas por integrante con `detalle` del servidor; "Cada uno pone ≈$9.000"; sentence case; sin estados de cobro

## Phase 8: Polish & cross-cutting

- [x] T053 Actualizar `docs/design/DESIGN.md` (FR-043): superficie oscura, íconos por plataforma, solo claro, píldora fuera del botón, umbral 30%, reglas de ≈, sin agregado de topes, sin campana
- [ ] T054 Capturas en simulador de las 18 pantallas en claro y con texto máximo, comparadas con `stitch/*.png` y la auditoría (máximo dos rondas de arreglos)
- [ ] T055 `rules-guardian` y `/code-review` sobre el diff; `test-runner`
- [ ] T056 Entrada en `docs/bitacora-prompts.md` y PR con capturas en el cuerpo

## Dependencies & Execution Order

- Fase 1 → Fase 2 → (Fase 3 ∥ Fase 4 → Fase 5 → Fase 6) → Fase 7 → Fase 8.
- US1 y US3 solo dependen de Fase 2. US2 usa `comercio/[id]` de US1 para el modo recomendación. US5 usa Con qué pagar (US1) para entrar a grupo.
- T029 antes de T030/T031. T014 → T015 → T016 → T017 → T020.

## Parallel Opportunities

- Fase 2: T011, T012, T013, T019, T021–T028 en paralelo (archivos distintos) una vez hecho T010.
- Fase 7: T048, T049, T050 en paralelo.

## Implementation Strategy

MVP = Fases 1–2 + US3 + US1 (onboarding y respuesta en 1 toque). Después US2, US4, US5. Cada fase
termina con lint/typecheck/test verdes y un recorrido del quickstart.
