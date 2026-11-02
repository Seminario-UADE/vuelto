# Research: App — motor en el dispositivo y store de Redux

## R1. Cómo resuelve Metro `@vuelto/motor`

- **Medición (01/11/2026)**: con `dist/` compilado, `expo export` para iOS, Android y web empaqueta
  el motor sin `metro.config.js` (Expo SDK 58 detecta el monorepo de npm workspaces). Sin `dist/`
  (checkout limpio, como EAS y el CI, porque `dist/` está en `.gitignore`) falla:
  `Unable to resolve "@vuelto/motor"… main module field that could not be resolved (dist/index.js)`.
- **Decision**: `"prepare": "npm run build"` en `packages/motor`. `npm ci` corre `prepare` de cada
  workspace, así que local, CI y EAS (que instala desde la raíz del monorepo) terminan con `dist/`.
  Verificado: con `dist/` borrado, `npm ci` lo regenera y el bundle de Android sale.
- **Rationale**: respeta ADR-010 (el paquete se consume compilado), no agrega configuración de Metro
  y arregla también el typecheck y los tests de `apps/mobile` en el CI, que necesitan
  `dist/index.d.ts`. Decisión del PO.
- **Alternatives considered**: condición `"source"` en `exports` → `src/index.ts` con un
  `metro.config.js` que la active, más `paths` en tsconfig y alias en Vitest (como hace `supabase/`).
  Funciona sin `dist/` (verificado en iOS y web) y da hot reload del motor, pero la app no consumiría
  el paquete compilado que dice el ADR. Hook `eas-build-post-install`: arregla solo EAS.
- **Costo aceptado**: un cambio en el motor se ve en la app después de `npm run build -w
  @vuelto/motor` (o `npx tsc -p tsconfig.build.json --watch` en `packages/motor`).

## R2. Dónde vive `ahora`

- **Decision**: campo `sesion.ahora` (ISO con zona), no persistido. Lo despacha `useReloj` con una
  fuente inyectable: al montar, en `AppState` → `active`, y con un timer a la próxima medianoche de
  Argentina. Con los datos de ejemplo, la fuente devuelve siempre `2026-10-14T12:00:00-03:00`.
- **Rationale**: la issue fija seis slices; `ahora` es de la sesión de uso. El mediodía evita que un
  corrimiento de zona cambie el día (`fechaArgentina`).
- **Alternatives**: slice `reloj` propio (un séptimo slice, fuera de lo que pide la issue);
  `new Date()` en el selector (prohibido por FR-005).

## R3. Forma de los selectores

- **Decision**: `selectEntradasMotor` (createSelector sobre `perfil.medios`, `corpus.promociones`,
  `compras.lista`, `sesion.ahora`) arma `{ perfil, promociones, compras, ahora: Date }` del motor.
  `selectRecomendacion` = createSelector(entradas, simulación) → `calculo.recomendacionVista(...)`.
  `selectTopes` = createSelector(entradas, escenario) → `calculo.topesVista(...)`. Revisá tu compra
  necesita la recomendación para *otro* comercio y monto sin tocar la simulación de la pantalla de
  abajo: usa `recomendacionVista` con `useMemo` sobre `selectEntradasMotor`.
- **Rationale**: un cambio en el monto no reconstruye las entradas (misma referencia), así que solo
  corre `recomendar()`; un estado idéntico no corre nada (SC-003).
- **Alternatives**: una fábrica de selectores con argumentos (`makeSelectRecomendacion`), más
  ceremonia para un solo uso.

## R4. Promos de otra categoría

- **Decision**: se pasa el corpus completo al motor y la vista descarta los `Descarte` con causa
  `categoria`.
- **Rationale**: la Edge Function filtraba el corpus por categoría antes de llamar al motor. Eso
  rompe un tope compartido (`grupoTopeId`) entre categorías, porque el saldo se calcula con las
  promos que entran. Filtrar en la vista da la misma pantalla sin ese riesgo.

## R5. Reintegro de una compra guardada

- **Decision**: `promocionId` = la promo de la opción del medio elegido; `reintegroEsperado` = su
  `ahorroEstimado`; `descuentoObtenido = null`. El motor calcula el consumo con el porcentaje y la
  base cuenta la compra como "sin descuento informado".
- **Rationale**: el usuario no informó cuánto le devolvieron; guardar el estimado en
  `descuentoObtenido` haría pasar una estimación por dato. `reintegroEsperado` es exactamente "lo
  que esperamos que devuelvan".

## R6. Persistencia sin `redux-persist`

- **Decision**: `createListenerMiddleware` con un predicado que compara las referencias de `perfil`,
  `corpus`, `compras` y `sesion.cuenta`, y escribe con un almacenamiento inyectable (AsyncStorage en
  la app, un `Map` en los tests). `rehidratar(almacenamiento)` es un thunk que lee, valida por parte y
  despacha `sesion/rehidratado(partes)`, que cada slice atiende en `extraReducers`.
- **Rationale**: ADR-010 pide evitar `redux-persist`; son ~60 líneas y quedan testeables.
- **Escrituras**: no se debouncea: las acciones persistentes son por toque (guardar compra, elegir
  medio), no por tecla. `simulacion` (lo que cambia por tecla) no dispara escrituras.

## R7. Qué queda en `api.ts`

- **Decision**: catálogos (`getMediosDisponibles`, `getCatalogoComercios`, `buscarComercios`,
  `getComercio`), `leerTicket`, invitaciones (`crearInvitacion`, `verInvitacion`,
  `aceptarInvitacion`, `quitarContacto`) y `recomendarGrupo`. Salen: `recomendar`, `getTopes`,
  `getCompras`, `getPerfil`, `getComerciosFrecuentes`, `getContactos`, `guardarCompra`,
  `setPreferencias`, `getHoy`, `setEscenario`/`getEscenario` y su estado de módulo.
- `aceptarInvitacion` y `quitarContacto` siguen siendo asíncronas (en producción son RPC); la pantalla
  despacha al slice con lo que devuelven.
