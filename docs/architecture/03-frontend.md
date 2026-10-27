# Frontend

App mobile en `apps/mobile` (`@vuelto/mobile`): Expo SDK 58, React Native 0.88, Expo Router y
TypeScript strict. Se prueba en Expo Go (QR) y no importa `@vuelto/motor`: el motor corre solo en la
Edge Function (ADR-001 §Actualización, RNF-02). Spec, plan y decisiones:
`specs/006-app-mobile-pantallas/`.

## Dónde vive cada cosa

```
apps/mobile/
├── app.json              scheme "vuelto", solo modo claro, ícono y splash con el logo
├── .env.example          EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY
└── src/
    ├── app/              rutas (Expo Router). Cada archivo es una pantalla
    ├── components/       piezas de UI reutilizables (sin datos propios)
    ├── data/             capa de datos: contratos, fixtures, servidor simulado, api, sesión
    ├── hooks/            useAsync (carga), useColumns (Dynamic Type)
    ├── lib/              supabase.ts, format.ts, haptics.ts, rubros.ts (catálogo único de rubros),
    │                     textos.ts (texto de la base de un estimado, en un solo lugar)
    ├── navigation/       opciones compartidas del header nativo
    └── theme.ts          el ÚNICO archivo con colores, tipografía, espacios y radios
```

Regla: las pantallas (`src/app/`) componen componentes de `src/components/` con datos de
`src/data/api.ts`. Ninguna pantalla ni componente calcula reintegros, topes ni recomendaciones.

## Navegación

| Ruta | Pantalla | Presentación |
|---|---|---|
| `(onboarding)/bienvenida` | Bienvenida | Stack, sin header |
| `(onboarding)/medios` | Tus medios de pago | Stack, header nativo con barra de 2 pasos |
| `(onboarding)/comercios` | Comercios habituales | Stack, "Saltar" en el header |
| `(onboarding)/primera-respuesta` | Primera respuesta | Stack |
| `(auth)/login` | Guardar perfil / Entrar | Page sheet (`modal`) |
| `(tabs)/index` | Inicio (respuesta inline) | Pestaña |
| `(tabs)/comprar` | Nueva compra | Pestaña |
| `(tabs)/topes` | Tus topes | Pestaña |
| `(tabs)/perfil` | Perfil | Pestaña |
| `comercio/[id]` | Con qué pagar | Stack, header nativo |
| `mis-compras` | Mis compras | Stack, header nativo |
| `escanear` | Escanear ticket | Modal a pantalla completa |
| `revisa` | Revisá tu compra | Page sheet (`modal`) |
| `contactos/index` | Contactos | Stack, header nativo |
| `contactos/invitar` | Invitar contacto | Stack, header nativo |
| `contactos/quitar` | Quitar contacto | Sheet que se ajusta al contenido |
| `i/[token]` | Aceptar invitación | Modal; deep link `vuelto://i/<token>` (en Expo Go `exp://…/--/i/<token>`) |
| `grupo/armar` | Armar grupo | Stack, header nativo |
| `grupo/resultado` | Gasto en grupo | Stack, header nativo |

- **Tab bar**: Inicio · Comprar · Topes · Perfil (DESIGN.md §5). Son las tabs JS de Expo Router con
  el estilo de DESIGN.md: necesitamos el alto exacto de la barra para los pies fijos, y las tabs
  nativas de iOS 26 usan vidrio (research R2 de la spec 006).
- **Conciliación con la issue #39**: `index` es Inicio ("¿Con qué pago?" vive ahí), `registrar` es
  `comprar`, y `(auth)/login` es el sheet Guardar perfil.
- **Onboarding**: el layout de las tabs redirige a `/bienvenida` si `onboardingCompleto` es falso,
  y el del onboarding redirige a `/` si es verdadero. Se probó `Stack.Protected` y se descartó:
  con la pestaña Inicio bloqueada, el router abría el sheet de cuenta como primera pantalla.
- **Sheets**: Revisá tu compra y Guardar perfil tienen scroll, así que van como page sheet
  (`presentation: "modal"`). En iOS 27 el `formSheet` con detents no pinta un `ScrollView`
  (verificado en el simulador). Quitar contacto, que no scrollea, sí es `formSheet` ajustado al
  contenido.
- Las pantallas hijas van en el stack raíz, encima de las tabs: back y swipe del sistema, y el único
  primario queda pegado al área segura sin competir con la tab bar.

## Estado

| Qué | Dónde | Dura |
|---|---|---|
| Datos del servidor | `src/data/api.ts` + `useAsync` en cada pantalla | Lo que dura la pantalla |
| Escrituras de la sesión (compras guardadas, contactos quitados o aceptados, grupo en armado, aviso) | `src/data/sesion.ts` (`useSyncExternalStore`, sin librería) | Hasta cerrar la app |
| Perfil del dispositivo (onboarding completo, medios, comercios, cuenta, invitación pendiente) | `src/data/perfil-local.ts` (AsyncStorage) | Persistente |
| Sesión de Supabase | `src/lib/supabase.ts` (AsyncStorage) | Persistente (todavía sin uso) |

No hay Redux ni React Query: con datos de ejemplo alcanza `useAsync`, que mantiene el dato anterior
mientras recarga (la cifra no parpadea al tipear el monto).

## Capa de datos

- `contracts.ts`: la forma de las respuestas del servidor. Todos los campos son requeridos y lo
  ausente es `null` (Principio III). Los tipos de contacto y grupo solo tienen lo que ADR-008 §3 deja
  ver.
- `fixtures.ts`: los datos de DESIGN.md §9 (Martín, octubre de 2026, reloj fijo en el miércoles
  14/10).
- `servidor-simulado.ts`: **reemplazo temporal** de las Edge Functions. Arma la recomendación para
  cualquier monto mientras no existe el endpoint. Lo importa solo `api.ts`, tiene tests y se borra
  con #43/#45 y #56 (excepción al Principio II aprobada por el PO en la spec 006).
- `vista-recomendacion.ts`: traduce la respuesta real de la Edge Function `recomendar`
  (forma del motor: ids, `motivo`, `base.comprasRegistradas`) a lo que pintan las pantallas.
  No calcula: nombra ids con los catálogos y arma el texto de la base.
- `api.ts`: las funciones que usan las pantallas, con la firma del cliente real
  (`02-api-routes.md`). Para conectar el backend se cambia solo el cuerpo de cada función.
- Escenarios de prueba (solo desarrollo, en Perfil): mes sin compras y ticket ilegible, para ver los
  estados vacíos y de error.

## Tema, tipografía e íconos

- `src/theme.ts` define roles (`canvas`, `surface`, `ink`, `accent`, `decisionBg`…) con los valores
  de DESIGN.md §2. ESLint y un test fallan si aparece un color escrito a mano en otro archivo.
- **Solo modo claro** (`userInterfaceStyle: "light"`). Los tokens son semánticos: una apariencia
  oscura futura cambia solo `theme.ts`.
- **Hanken Grotesk** (400–700) con `@expo-google-fonts/hanken-grotesk`, cargada en el layout raíz
  con el splash retenido. `<Text>` mapea peso → familia y usa `tabular-nums` en montos.
- **Dynamic Type**: nada bloquea `allowFontScaling`; cada nivel tiene un tope de escala
  (`maxFontScale` en `theme.ts`: display ×1,4, títulos ×1,6–1,8, cuerpo ×2) para que con el texto
  más grande de accesibilidad no se corten palabras. Las etiquetas de la tab bar casi no escalan,
  como las del sistema. `useColumns()` pasa la grilla de topes de Inicio a una columna con
  `fontScale > 1.2`.
- **Íconos**: `<Icon name>` con nombres semánticos. SF Symbols (`expo-symbols`) en iOS y Material
  (`@expo/vector-icons`) en Android y web.

## Componentes clave

| Componente | Para qué |
|---|---|
| `Screen` | Scroll de pantalla. Si recibe `footer`, lo fija abajo, mide su alto y lo reserva al final del contenido: nada queda tapado |
| `DecisionCard` / `RecomendacionCard` | La única superficie oscura: Inicio con comercio elegido, Con qué pagar, Primera respuesta y Gasto en grupo |
| `TopeBar`, `TopeResumen`, `TopeDetalle` | Tope con ≈, base y tramo rayado final (SVG). Sin porcentajes |
| `MontoInput` | Monto opcional con teclado numérico del sistema |
| `OptionRow`, `Chip`, `Avatar`, `Badge` | Controles de DESIGN.md §5 |
| `Toast` | Confirmación ("Compra guardada · la ves en Mis compras") anunciada al lector de pantalla. En iOS va en `FullWindowOverlay` para quedar encima del stack nativo |

## Privacidad en el cliente

- Solo variables `EXPO_PUBLIC_*`. Nunca la service role key ni la de Gemini.
- No hay cámara en esta versión: Escanear muestra un ticket de ejemplo y no crea archivos de
  imagen. La captura real se diseña con la Edge Function del ticket (Principio IV).

## Comandos

```bash
npm run start -w @vuelto/mobile        # Expo (QR para Expo Go)
npm run web -w @vuelto/mobile          # verificación rápida en el navegador
npm run lint && npm run typecheck && npm run test   # desde la raíz, como el CI
```
