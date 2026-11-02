# Frontend

App mobile en `apps/mobile` (`@vuelto/mobile`): Expo SDK 58, React Native 0.88, Expo Router y
TypeScript strict. Se prueba en Expo Go (QR). Por ADR-010 la app **importa `@vuelto/motor`** y calcula
la recomendación y los topes en el dispositivo, sobre el estado de Redux (RNF-02). Specs:
`specs/006-app-mobile-pantallas/` (pantallas) y `specs/008-motor-app-redux/` (motor y store, issue #81).

## Dónde vive cada cosa

```
apps/mobile/
├── app.json              scheme "vuelto", solo modo claro, ícono y splash con el logo
├── .env.example          EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY
└── src/
    ├── app/              rutas (Expo Router). Cada archivo es una pantalla
    ├── components/       piezas de UI reutilizables (sin datos propios)
    ├── data/             contratos, fixtures, cálculo con el motor, api (lo que sale a la red)
    ├── store/            Redux Toolkit: slices, selectores, thunks y persistencia
    ├── hooks/            useReloj (escribe `ahora`), useAsync (lo asíncrono), useColumns (Dynamic Type)
    ├── lib/              supabase.ts, format.ts, haptics.ts, rubros.ts (catálogo único de rubros),
    │                     textos.ts (texto de la base de un estimado, en un solo lugar)
    ├── navigation/       opciones compartidas del header nativo
    └── theme.ts          el ÚNICO archivo con colores, tipografía, espacios y radios
```

Regla: las pantallas (`src/app/`) componen componentes de `src/components/` con datos de los
selectores del store (y de `src/data/api.ts` para lo que sale a la red). Ninguna pantalla ni
componente calcula reintegros, topes ni recomendaciones por su cuenta: el cálculo vive en el motor,
detrás de un selector.

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
| `i/[token]` | Aceptar invitación | Stack, header nativo; deep link `vuelto://i/<token>` (en Expo Go `exp://…/--/i/<token>`) |
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

Un solo store de Redux Toolkit (`src/store/`), con **solo datos de entrada**. La recomendación y
los topes se **derivan** con selectores memoizados; nunca se guardan en el store ni en el
dispositivo (ADR-010, spec 008).

| Slice | Qué guarda | Se persiste |
|---|---|---|
| `sesion` | Cuenta, `ahora` (reloj del cálculo), aviso pendiente, escenario de desarrollo, `hidratado`, `epoca` (sube con cada cierre de sesión) | Solo la cuenta |
| `perfil` | Nombre, onboarding completo, medios y comercios elegidos, invitación pendiente | Sí |
| `corpus` | Promociones con la forma del motor, `marca` (la mayor `actualizada_en`, texto exacto del servidor), `sincronizadoEn` y `descartadas`. Sin sincronizar: las de ejemplo y `marca: null` | Sí, en su propia clave `vuelto.corpus.v1`, y solo el que viene de una sincronización |
| `compras` | Compras con la forma del motor (`promocionId`, `descuentoObtenido`, `reintegroEsperado`) | Sí |
| `simulacion` | Comercio elegido y monto opcional de «¿Con qué pago?» | No |
| `contactos` | Contactos (solo lo de ADR-008 §3) y grupo en armado | No |

```
selectEntradasMotor  = perfil.medios + corpus + compras + sesion.ahora → { perfil, promociones, compras, ahora }
selectRecomendacion  = entradas + simulacion → recomendar() del motor → vista
selectTopes          = entradas → estimarTopes() + formatearEstimacion() → vista
selectResumenCompras = compras + ahora → «Mis compras» del mes en curso
```

- **En vivo**: tipear el monto cambia `simulacion.monto`; las entradas del motor no se
  reconstruyen (misma referencia) y solo corre `recomendar()`. Sin botón, sin debounce, sin red y
  sin estado de carga. Un estado idéntico devuelve el mismo objeto sin correr el motor.
- **Otro comercio sin tocar la simulación** (Revisá tu compra, Primera respuesta):
  `useRecomendacionPara(comercioId, monto)`, la misma función con `useMemo`.
- **Reloj**: ningún selector lee el reloj del sistema. `useReloj` escribe `sesion.ahora` al abrir,
  al volver a primer plano y a cada medianoche de Argentina. Mientras `corpus.marca` es `null` (datos
  de ejemplo, compras de octubre de 2026) la fuente es fija, `2026-10-14T12:00:00-03:00`; con un
  corpus sincronizado es `new Date()`. El cambio ocurre en la misma acción que fija la marca
  (`rehidratado` o `sincronizado` llevan `ahora`), así no hay un render con el reloj equivocado. Los
  parámetros de la sincronización salen siempre del reloj real, nunca de `sesion.ahora`.
- **Guardar una compra**: el thunk `guardarCompra` la evalúa con el motor al mediodía de su fecha;
  si el medio elegido tiene opción, guarda `promocionId` y `reintegroEsperado`, con
  `descuentoObtenido: null` (el usuario no informó el descuento). Topes, Mis compras y la próxima
  recomendación la ven al instante.
- **Persistencia** (`store/persistencia.ts`, sin `redux-persist`): un listener escribe
  `vuelto.store.v1` (perfil, compras y cuenta) cada vez que cambian, y otro escribe el corpus en
  `vuelto.corpus.v1`, ambos solo después de rehidratar (no pisan lo guardado). El corpus va aparte
  para que un corpus que no entra no se lleve el perfil ni las compras pendientes, y lleva la marca
  adentro: si no se pudo guardar, la marca guardada no avanza. Al disco llegan las compras del
  período. Al abrir, `rehidratar()` valida cada parte por
  separado (una corrupta vuelve sola a su inicio; un corpus guardado ilegible queda vacío con la
  marca en `null`) y migra `vuelto.perfil.v1`, la clave del viejo `perfil-local.ts`. `vuelto.store.v1`
  sigue en `version: 1`: un guardado anterior a la spec 009 se lee como «nunca sincronizó». El splash
  espera a `sesion.hidratado`.
- **Sincronización** (`src/sync/`, spec 009, issue #42): `useSincronizacion` despacha
  `sincronizar("apertura")` al abrir (ya rehidratado) y `sincronizar("primer-plano")` al volver a primer
  plano. El thunk lee del `RepositorioSincronizacion` inyectado en `Extra` (supabase-js con la sesión
  del usuario; en los tests, uno en memoria), páginas de 500 por cursor `(actualizada_en, id)`, con
  un margen de relectura de 10 minutos y un timeout de 15 s por pedido; aplica todo con **una** acción
  (`sincronizado`) o nada. La primera sincronización reemplaza el corpus de ejemplo; una que trae cero
  promos no cambia nada. Las bajas quedan en el corpus como promos vencidas (su consumo sigue contando en
  el tope compartido, Principio V). Descarta el resultado si se cerró la sesión (`sesion.epoca`) o
  cambió el usuario mientras volaba. Cerrar sesión vuelve **todo** al modo de ejemplo (corpus, compras y reloj)
  y borra `vuelto.corpus.v1`. La leyenda «Promos actualizadas hace X» sale de `selectFrescura`. La mezcla de
  las compras del servidor con las locales es `reconciliarCompras` (`sync/compras.ts`), la única costura con
  #44: la escritura de compras y la cola de subida son de esa issue y `EstadoCompras` sigue siendo `{ lista }`.
- **Lo asíncrono** (catálogos, ticket, invitaciones, grupo) sigue en `api.ts` con `useAsync`.
- La sesión de Supabase (`src/lib/supabase.ts`, AsyncStorage) la usa la sincronización; sin variables
  de entorno o sin sesión no se sincroniza y la app sigue con lo guardado. El login es #40.

## Capa de datos

- `contracts.ts`: la forma de las respuestas del servidor. Todos los campos son requeridos y lo
  ausente es `null` (Principio III). Los tipos de contacto y grupo solo tienen lo que ADR-008 §3 deja
  ver.
- `fixtures.ts`: los datos de DESIGN.md §9 (Martín, octubre de 2026) con la **forma del motor**:
  medios con banco, tipo y red, promociones como `Promocion` y compras con su promo y descuento
  (tabla en `specs/008-motor-app-redux/data-model.md`). Son el estado inicial del store hasta la primera sincronización.
  Mercado Pago no entra al motor: es una billetera sin banco ni red (Principio III).
- `calculo.ts`: núcleo funcional de la app. Llama a `recomendar()` y `estimarTopes()` y arma lo
  que pintan las pantallas. Funciones puras, con `ahora` por parámetro. Sin monto, consulta con
  monto 0 hasta que #43 agregue `monto: null` al motor. Las promos de otra categoría no se muestran
  como alternativa (se filtra en la vista, no el corpus, para no romper un tope compartido).
- `vista-recomendacion.ts`: traduce la respuesta del motor (ids, `motivo`,
  `base.comprasRegistradas`) a lo que pintan las pantallas. No calcula.
- `grupo-simulado.ts`: **reemplazo local de la Edge Function de grupo** (#54/#56). Evalúa a cada
  integrante con el motor sobre sus datos de ejemplo, con el reloj en la fecha del grupo; la app
  recibe solo lo de ADR-008 §3. Lo importa solo `api.ts`.
- `api.ts`: lo que sale a la red, con la firma del cliente real (`02-api-routes.md`): catálogos,
  ticket, invitaciones y grupo.
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
npm run build -w @vuelto/motor         # después de cambiar el motor, para verlo en la app
```

**Cómo resuelve Metro el motor.** `@vuelto/motor` se consume compilado (`dist/`, en `.gitignore`).
El motor tiene `"prepare": "npm run build"`, así que `npm ci` lo compila en local, en el CI y en
EAS (que instala desde la raíz del monorepo). Expo SDK 58 detecta el monorepo de npm workspaces y
no hace falta `metro.config.js`. Sin `dist/`, Metro falla con *Unable to resolve "@vuelto/motor"*
(research R1 de la spec 008).

## Publicación (sin computadora prendida)

Proyecto de Expo: `joaconzs-team/vuelto` (`extra.eas.projectId` en `app.json`). Hace falta
estar logueado (`npx eas-cli@latest login`) con una cuenta del equipo.

| Qué | Para quién | Cómo se publica |
|---|---|---|
| **Web** en https://vuelto.expo.app (EAS Hosting) | Cualquier teléfono desde el navegador, incluido el jurado | `npx expo export --platform web` y después `npx eas-cli@latest deploy --prod` (desde `apps/mobile`) |
| **APK de Android** (perfil `preview` de `eas.json`, distribución interna) | Android, app nativa | `npx eas-cli@latest build --platform android --profile preview`; el link de descarga queda en expo.dev |
| Expo Go con el servidor local | Desarrollo, iPhone nativo | `npm run start -w @vuelto/mobile` (con `-- --tunnel` si no están en la misma red) |

- En la web los íconos son Material (SF Symbols es solo iOS nativo) y los sheets se ven como
  pantallas.
- iPhone nativo sin computadora requiere una cuenta de Apple Developer (US$ 99/año), fuera del
  costo $0 del proyecto.
- Cada publicación sale de lo que haya en el directorio en ese momento: publicar desde `main`.

## Dónde se guarda el corpus (decisión de la issue #42)

**Decisión**: AsyncStorage, en una clave propia (`vuelto.corpus.v1`), sin filtrar por rubros ni medios del
usuario. `expo-sqlite` solo si la medición real lo pide.

> **PROYECCIÓN con promos de ejemplo, no una medición.** Las 4 promos de `fixtures.ts` pesan ~450 bytes
> cada una serializadas (máximo 455). Extrapolado a 2.000 promos (la estimación de la issue): ~880 KB, o
> sea ~14 % del tope de ~6 MB de AsyncStorage en Android y ~43 % de los ~2 MB que se asumen como límite
> de un solo valor (el corpus es un valor). A 4.000 promos: ~1,7 MB, ~86 % de ese límite.

- **La medición real está pendiente de #35** (el corpus sembrado). `npm run medir:corpus -w @vuelto/mobile`
  la hace con la misma lectura que usa la app, con la anon key y un usuario de prueba (nunca la
  service role). Criterio: si el corpus real supera ~1,5 MB (75 % de los 2 MB), pasar a filtrar por los
  rubros y medios del usuario o a `expo-sqlite`; la clave aparte hace que ese cambio no toque el perfil
  ni las compras.
- El límite de ~2 MB por valor en Android es una suposición prudente que **falta verificar en un
  dispositivo**; el de ~6 MB sale de la documentación de AsyncStorage.
- Las promos reales pueden pesar más que las de ejemplo (títulos largos); por eso la proyección es solo
  un orden de magnitud.
