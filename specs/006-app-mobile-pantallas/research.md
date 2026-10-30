# Research: App mobile base y las 18 pantallas

Fecha: 2026-10-16. Versiones relevadas con `npm view` ese día.

## R1. Versión de Expo

- **Decision**: Expo SDK 58 (`expo@~58.0.14`, React Native 0.88, `expo-router@~58`).
- **Rationale**: es el `latest` de npm y el que corre la versión actual de Expo Go en las tiendas (Expo Go solo soporta el SDK vigente). La issue pide "Expo SDK actual".
- **Alternatives considered**: SDK 57 (`sdk-57`): estable hace más tiempo, pero el Expo Go de las tiendas ya no lo abre.

## R2. Navegación: tabs JS con estilo propio vs. tabs nativas

- **Decision**: `Tabs` de Expo Router (bottom tabs de React Navigation) con estilo de DESIGN.md, y **stack nativo** para todo lo demás. Las pantallas hijas (Con qué pagar, Mis compras, contactos y grupo) se apilan en el stack raíz, encima de las tabs, con header nativo.
- **Rationale**:
  - Los footers fijos (auditoría P1 #3, P2 #7 y #9) necesitan el alto exacto de la tab bar (`useBottomTabBarHeight`). Las tabs nativas de iOS 26 flotan con vidrio y no exponen ese alto de forma estable; además DESIGN.md pide fondo Blanco Hueso, ítem activo relleno y sin vidrio (glassmorphism está prohibido en §10).
  - Apilar las pantallas hijas encima de las tabs les da back y swipe del sistema (auditoría P1 #6) y saca la tab bar en las pantallas de decisión, así el único CTA queda pegado al área segura y no compite con la tab bar (auditoría P2 #7).
  - El stack sigue siendo nativo (`native-stack`), que es lo que pide `navigation-native-navigators`.
- **Alternatives considered**: `NativeTabs` (`expo-router/unstable-native-tabs`): más nativo, pero rompe la regla de footers y el look de DESIGN.md; se revisa cuando su API sea estable. Stacks por pestaña: más archivos y la tab bar sigue visible debajo del CTA, que es justo el problema de P2 #7.

## R3. Sheets y modal

- **Decision**: `presentation: "formSheet"` del stack nativo con `sheetGrabberVisible`, `sheetAllowedDetents` y `sheetCornerRadius: 28`, para Revisá tu compra, Guardar perfil (`(auth)/login`) y Quitar contacto. Escanear ticket con `presentation: "fullScreenModal"`.
- **Rationale**: sheets del sistema (manija, gesto, accesibilidad) en vez de un sheet JS; DESIGN.md §5 pide manija y radio 28. Al ser modales del stack raíz, la tab bar no se ve con un sheet abierto.
- **Alternatives considered**: `@gorhom/bottom-sheet`: más control del footer, pero suma Reanimated + Gesture Handler en la ruta crítica y no es el control del sistema.

## R4. Apariencia

- **Decision**: solo clara. `userInterfaceStyle: "light"` en `app.json` (iOS y Android) y tokens semánticos en un único archivo.
- **Rationale**: ver Assumptions de la spec. Declarar `light` hace que los controles del sistema (sheets, teclado, header) también sean claros, sin mezcla.
- **Alternatives considered**: tokens oscuros: 13 tokens más con contraste AA a medir, y la identidad Blanco Hueso no tiene contraparte definida.

## R5. Tipografía

- **Decision**: `@expo-google-fonts/hanken-grotesk` (400, 500, 600, 700) cargada con `useFonts` en el layout raíz, con el splash retenido hasta que carguen. Cada peso es una familia (`HankenGrotesk_600SemiBold`), así que el componente `Text` mapea peso → familia. Montos con `fontVariant: ["tabular-nums"]`.
- **Rationale**: Expo Go no aplica config plugins, así que el plugin de `expo-font` (preferido por `fonts-config-plugin`) no alcanza para Expo Go; se suma igual para los builds.
- **Dynamic Type**: no se fija `allowFontScaling={false}` en ningún lado; `maxFontSizeMultiplier` solo en la tab bar (1,4) para que las etiquetas no rompan la barra, como hace el sistema. `useWindowDimensions().fontScale > 1.2` pasa grillas de 2 columnas a 1.

## R6. Íconos

- **Decision**: componente `<Icon name>` con un mapa semántico (`supermercado`, `combustible`, `volver`…) → `{ sf, md }`. iOS: `SymbolView` de `expo-symbols`; Android: `MaterialIcons` de `@expo/vector-icons`.
- **Rationale**: auditoría P1 #6; una sola fuente de nombres asegura "mismo rubro, mismo ícono".

## R7. Barra de tope con tramo rayado

- **Decision**: `react-native-svg` con un `<Pattern>` de rayas para el tramo estimado.
- **Rationale**: RN no tiene `repeating-linear-gradient`; un patrón SVG es un dibujo estático (no anima), barato y respeta tokens.

## R8. Capa de datos y estado

- **Decision**:
  - `src/data/contracts.ts`: tipos de las respuestas (ver `contracts/edge-functions.md`).
  - `src/data/fixtures.ts`: datos de DESIGN.md §9 + fixtures de borde, reloj fijo `2026-10-14`.
  - `src/data/api.ts`: funciones `async` con la firma que tendrá el cliente de la Edge Function (`recomendar`, `getTopes`, `getCompras`, `leerTicket`, `guardarCompra`, `getContactos`, `quitarContacto`, `verInvitacion`, `aceptarInvitacion`, `recomendarGrupo`, `getPerfil`). Devuelven fixtures con 250 ms de demora simulada.
  - Estado de sesión (compras guardadas, contactos quitados): un store mínimo con `useSyncExternalStore` dentro de `src/data/`, sin dependencia nueva.
  - Persistencia local: `@react-native-async-storage/async-storage` para "onboarding completo" y medios/comercios declarados; el cliente de Supabase usa el mismo storage para la sesión.
- **Rationale**: FR-012/FR-045. Cuando llegue el backend, solo cambia el cuerpo de `api.ts`.
- **Cifras con monto**: para que el campo de monto sea útil en la demo, `src/data/servidor-simulado.ts` arma la respuesta para cualquier monto con la regla del fixture (`min(porcentaje · monto, tope disponible)`). Ese archivo es el reemplazo temporal de la Edge Function, está marcado como tal, tiene tests y lo importa **solo** `api.ts`; ninguna pantalla ni componente calcula reintegros. Se lista en Complexity Tracking del plan y se borra cuando exista el endpoint.

## R9. Tests

- **Decision**: Vitest en `apps/mobile` sobre módulos TS puros (`src/data/**`, `src/lib/format.ts`, `src/theme.ts`), sin renderizar RN.
- **Rationale**: mismo runner que el motor (la CI ya lo corre); `jest-expo` suma una segunda herramienta solo para snapshots que no aportan. La verificación visual es por capturas.
- **Tests clave**: invariantes de fixtures (todo tope con base; ≈ en estimados; fechas 2026; cuentas que cierran: 6.500 − 4.900 = 1.600), formato de dinero es-AR, contratos de contacto sin campos prohibidos (ADR-008), y un test que recorre `app/` y `src/components/` buscando literales hex (SC-003).

## R10. Lint

- **Decision**: la config raíz (`eslint.config.js`) con un bloque para `apps/mobile` que suma `eslint-plugin-react-hooks` y una regla `no-restricted-syntax` contra literales `#rrggbb`/`rgb(` fuera de `src/theme.ts`.
- **Alternatives considered**: `eslint-config-expo`: trae su propia config plana con reglas de import que chocan con la de la raíz; no hace falta para este alcance.

## R11. Cámara y Apple sign-in

- **Decision**: sin `expo-camera` ni `expo-apple-authentication` en esta feature. Escanear muestra un visor dibujado y el disparador usa el ticket de ejemplo. El botón de Apple es un `Pressable` con el estilo de borde de Apple que completa el onboarding de ejemplo.
- **Rationale**: Principio IV (la cámara estándar escribe la foto al cache) y FR-015. La captura real se diseña con la Edge Function del ticket.

## R12. Deep link de invitación

- **Decision**: `scheme: "vuelto"` en `app.json`; ruta `app/i/[token].tsx`. En Expo Go se abre con `exp://<host>:8081/--/i/demo-lucia`; en build, `vuelto://i/<token>`. Tokens de fixture: `demo-lucia` (válida), `demo-vencida`, `demo-usada`, `demo-propia`, `demo-contacto`.

## R13. Verificación en simulador — bloqueo

- **Hallazgo**: esta Mac no tiene Xcode (solo Command Line Tools; `xcrun simctl` no existe). Sin Xcode no hay iOS Simulator.
- **Opciones**: (a) instalar Xcode (App Store, ~15 GB; lo tiene que hacer el usuario) y correr Expo Go en el simulador; (b) verificar en el navegador con Expo web a 390×844 (no muestra SF Symbols, sheets nativos ni Dynamic Type real), más Expo Go en un iPhone físico para la revisión manual.
- **Decision**: pendiente del usuario (ver plan, §Verificación).
