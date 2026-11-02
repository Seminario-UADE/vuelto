# Tasks: Registrar una compra — borrar, promo aplicada y subida a la cuenta

**Input**: `specs/010-registro-compras-cola/` — [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Prerequisites**: `main` con la spec 008 (store de Redux) y la spec 007 (esquema de Supabase). **No** requiere #40, #41 ni #42: la subida real queda desconectada (FR-020).

**Tests**: se piden. La constitución §VI exige test-first en el núcleo y SC-002 se verifica con tests; cada tarea de implementación va después del test que la cubre.

**Organization**: por historia de usuario. US1 (borrar) y US2 (cola y subida) son P1; US3 (promo) es P2.

## Format: `[ID] [P?] [Story] Descripción con ruta`

- **[P]**: se puede hacer en paralelo (archivos distintos, sin depender de tareas incompletas)
- Rutas relativas a la raíz del repo. `apps/mobile/src` se abrevia `src/`.

## Phase 1: Setup

- [x] T001 Correr `npm ci` en la raíz y confirmar la línea de base: `npm run lint && npm run typecheck && npm run test` pasan en `main` antes de tocar nada
- [x] T002 Agregar `expo-crypto` a `apps/mobile/package.json` con `npx expo install expo-crypto` (versión de Expo SDK 58) y confirmar que `npm run typecheck -w @vuelto/mobile` sigue pasando
- [x] T003 [P] Crear los ayudantes de prueba en `src/data/compras/prueba.ts`: generador de UUID determinista, `repositorioDeMemoria` que puede fallar, colgarse o responder según un guion, una promo de **tope compartido** entre dos promos (M2: todas las de `fixtures.ts` son exclusivas) y una `compraDePrueba()`

## Phase 2: Foundational (bloquea a las tres historias)

**⚠️ Ninguna historia empieza antes de terminar esta fase.**

- [x] T004 [P] Escribir `src/data/compras/ejemplo.test.ts`: `esDeEjemplo(id)` es verdadero para los ids de `comprasOctubre` y falso para un UUID y para `n3`
- [x] T005 [P] Crear `src/data/compras/ejemplo.ts` con `esDeEjemplo(id: string): boolean` (criterio: pertenencia a `comprasOctubre`, R10) y `esUuid(id: string): boolean`; tiene que pasar T004
- [x] T006 [P] Crear `src/data/compras/operaciones.ts` **solo con los tipos** de `data-model.md` (`Operacion`, `EstadoOperacion`, `OperacionGuardar`, `OperacionBorrar`, `EstadoCola`); sin lógica todavía
- [x] T007 Agregar `generarId: () => string` al `Extra` de `src/store/index.ts` (con `expo-crypto` `randomUUID` en producción) y pasarlo en `crearStore`; en `src/store/prueba.ts` `storeDePrueba` usa el generador determinista de T003
- [x] T008 Cambiar `guardarCompra` en `src/store/thunks.ts` para usar `generarId()` en lugar de `n${n}`; actualizar los tests existentes de `src/store/*.test.ts` que esperan `nN` y confirmar que todos pasan

**Checkpoint**: la base está lista; las historias pueden empezar.

---

## Phase 3: User Story 1 — Borrar una compra mal cargada (P1) 🎯 MVP

**Goal**: borrar una compra desde «Mis compras», con confirmación, y ver los topes corregirse sin red.

**Independent Test**: con el store de ejemplo y la promo compartida de T003, guardar una compra, ver bajar el tope, borrarla y verificar que el tope vuelve y que «Mis compras» ya no la lista (spec US1).

### Tests (primero; deben fallar)

- [x] T009 [P] [US1] `src/store/thunks.compras.test.ts`: `eliminarCompra` saca la compra de `compras.lista`; `selectTopes` y `selectResumenCompras` vuelven al valor previo; la base baja en uno y sin compras dice que no hay base (FR-002, escenarios 1 y 3); borrar una de ejemplo la saca de la lista (el reducer no distingue)
- [x] T010 [P] [US1] `src/store/persistencia.test.ts` (agregar un caso): tras `eliminarCompra`, lo escrito en `vuelto.store.v1` ya no incluye la compra (FR-002)
- [x] T011 [P] [US1] `src/data/calculo.test.ts` (agregar): `comprasDelPeriodoVista` devuelve todas las compras del período (mes o semana, lo que empiece antes), incluida una de la semana que cruza el 1º y un ticket de otro mes dentro del período; `gastaste` y `devolvieron` siguen siendo los del mes (FR-003, escenario 6)

### Implementación

- [x] T012 [US1] Agregar el reducer `compraEliminada(id: string)` al slice `src/store/compras.ts` (cambio aditivo: la forma `{ lista }` no cambia) y exportarlo
- [x] T013 [US1] Agregar `eliminarCompra(id: string)` a `src/store/thunks.ts`: despacha `compraEliminada`; devuelve la compra eliminada o `null` si no existía
- [x] T014 [US1] Agregar `comprasDelPeriodoVista` a `src/data/calculo.ts` (exportando lo que haga falta de `compraVista`) y el selector `selectComprasDelPeriodo` en `src/store/selectores.ts`
- [x] T015 [US1] En `src/components/compra-row.tsx` agregar la acción «Borrar» (botón accesible con `accessibilityLabel` «Borrar compra de {comercio}») que recibe un `onBorrar` opcional
- [x] T016 [US1] En `src/app/mis-compras.tsx` listar con `selectComprasDelPeriodo`, pedir confirmación con `Alert.alert` («¿Borrar esta compra? Tus topes se corrigen») y despachar `eliminarCompra`; mostrar el aviso «Compra borrada» con `avisoMostrado`; el estado vacío sigue funcionando (FR-001, FR-003)

**Checkpoint**: US1 funciona sola y sin red; es el MVP.

---

## Phase 4: User Story 2 — Que lo registrado llegue a mi cuenta aunque no haya señal (P1)

**Goal**: toda compra guardada o borrada queda en una cola persistida y se sube a `public.compras` cuando hay sesión y red, sin duplicar ni perder, con la subida real desconectada hasta #40/#41/#42.

**Independent Test**: con el repositorio en memoria y el almacenamiento falso, recorrer la tabla de SC-002 (reintento tras envío que sí llegó, 3 reintentos, envío colgado y borrado, cierre entre escrituras, cierre con `enviando`) y comprobar una sola fila y lo borrado sin reaparecer.

### Tests (primero; deben fallar)

- [x] T017 [P] [US2] `src/data/compras/operaciones.test.ts`: encolar guardar; borrar compacta un guardar `pendiente` sin llamar al servidor (FR-011, SC-003); borrar con el guardar `enviando` encola el borrado detrás; `siguienteLote` solo del mismo dueño, solo por compra en orden y saltea `rechazada` y `bloqueada` (FR-009, SC-008); `aplicarResultado` según la tabla de FR-012; `descartarViejas` quita las de más de 90 días (FR-019); `adoptar` y `declinar` las de dueño `null`
- [x] T018 [P] [US2] `src/data/compras/fila.test.ts`: los casos de `contracts/fila-compras.md`; constraints verbatim: `monto > 0`, `comercio` no vacío tras recortar, `origen in ('ticket','excepcion','manual')`, `id` UUID, `medio_de_pago_id` y `promocion_id` desde el mapeo, `user_id` ausente de la fila
- [x] T019 [P] [US2] `src/data/compras/errores.test.ts`: cada fila de la tabla de `contracts/repositorio-compras.md` (red, aborto, 5xx, 429, 408, 401, `22P02`, `23514`, `23503`, `23502`, `42501`, código desconocido)
- [x] T020 [P] [US2] `src/data/compras/pendientes.test.ts`: los casos de `contracts/aplicar-pendientes.md` (pendiente se agrega una vez, ya subida no se duplica, borrado pendiente oculta la fila, rechazada se conserva, otro dueño se ignora)
- [x] T021 [P] [US2] `src/store/cola.test.ts`: el slice encola y desencola; `sesionCerrada` vacía la cola; persiste en `vuelto.cola.v1` solo si `hidratada`; una cola inválida se descarta y las `enviando` se leen como `pendiente`; **cierre entre las dos escrituras** con un almacenamiento que corta tras N `setItem`: tras reabrir no hay compra sin operación y toda operación de guardar sin compra la restaura (FR-013)
- [x] T022 [P] [US2] `src/store/thunks.cola.test.ts`: `guardarCompra` y `eliminarCompra` encolan y no encolan para ejemplo ni sin confirmar (SC-004); doble toque con el mismo `intento` produce una compra (FR-005); `vaciarCola` recorre toda la tabla de SC-002, es de un solo vaciado a la vez (FR-010), abandona a los 10 s con un reloj falso, no envía con otro dueño ni sin `userId`, y no hace nada con la subida desconectada (FR-020); `iniciarCompras` migra los `nN` una sola vez (FR-007)

### Implementación del núcleo puro (cada una después de su test)

- [x] T023 [P] [US2] Implementar en `src/data/compras/operaciones.ts` las funciones de T017 (sin React ni red); tiene que pasar T017
- [x] T024 [P] [US2] Crear `src/data/compras/fila.ts` con `compraAFila` y el tipo `FilaCompra`; tiene que pasar T018
- [x] T025 [P] [US2] Crear `src/data/compras/errores.ts` con `clasificarError`; tiene que pasar T019
- [x] T026 [P] [US2] Crear `src/data/compras/pendientes.ts` con `aplicarPendientes`; tiene que pasar T020
- [x] T027 [P] [US2] Crear `src/data/compras/repositorio.ts` (interfaz `RepositorioCompras`, `ResultadoEnvio`), `repositorio.memoria.ts` y `repositorio.supabase.ts` (`upsert` con `ignoreDuplicates` y `delete().eq("id", …)` con `abortSignal`, usando el cliente de `src/lib/supabase.ts`); la versión Supabase **no se instancia en ninguna parte** todavía (FR-020)

### Cableado al store

- [x] T028 [US2] Crear `src/store/cola.ts`: slice `cola` (`EstadoCola`), acciones, `sesionCerrada` la vacía, y su listener de persistencia (clave `vuelto.cola.v1`, no escribe sin `hidratada`); sumar `cola` al `combineReducers` de `src/store/index.ts` y registrar el listener **antes** que el de `compras` (R2); tiene que pasar T021
- [x] T029 [US2] En `src/store/index.ts` sumar `subida: Subida | null` al `Extra` (`{ repositorio, contexto(): ContextoSubida }`); `null` en producción hasta #40/#41/#42 y en `storeDePrueba` configurable
- [x] T030 [US2] Extender `src/store/thunks.ts`: `guardarCompra` recibe un `intento` (string) y lo ignora si ya se atendió; despacha `operacionEncolada` **antes** de `compraAgregada` y no encola las de ejemplo; `eliminarCompra` compacta o encola el borrado antes de `compraEliminada`
- [x] T031 [US2] Agregar a `src/store/thunks.ts` `vaciarCola()` (un vaciado a la vez con `vaciando` y `volver`, un `AbortController` de 10 s por envío, `compraAFila` → `bloqueada` o envío, `clasificarError`, reevaluación de las `bloqueada(medio|promo)`), `iniciarCompras()` (lee `vuelto.cola.v1`, descarta viejas, reconcilia compras y cola, migra los `nN`, marca `hidratada` y pide vaciar) y `adoptarOperaciones(userId, aceptar)`; tiene que pasar T022
- [x] T032 [US2] Crear `src/hooks/use-subida-de-compras.ts` que pide `vaciarCola()` cuando `AppState` pasa a `active` y cuando cambia el `userId`; montarlo en `src/app/_layout.tsx` y despachar `iniciarCompras()` justo después de `rehidratar()` (la línea 28 actual) sin cambiar `rehidratar`
- [x] T033 [US2] Agregar a `src/store/selectores.ts` `selectMarcasDeSubida` (`{ [compraId]: "sin-subir" | "solo-celular" }` más los recuentos, vacío si `!subidaConectada`) y mostrar la marca en `src/components/compra-row.tsx` y el recuento en `src/app/mis-compras.tsx` (FR-014)
- [x] T034 [US2] En `src/app/(tabs)/perfil.tsx`, antes de `sesionCerrada()`, mostrar `Alert.alert` con cuántas compras guardadas y cuántos borrados hay pendientes y pedir confirmación; sin pendientes, cerrar como hoy (FR-016)

### Esquema y documentación

- [x] T035 [P] [US2] Crear `supabase/tests/database/compras_cliente.test.sql` (pgTAP, mismo estilo que `rls.test.sql`): insertar con `id` propio; reinsertar con `on conflict do nothing` deja una fila; borrar un `id` inexistente da 0 filas sin error; la cuenta B no lee, borra ni pisa la fila de A; `medio_de_pago_id` ajeno falla con `23503` (FR-021)
- [x] T036 [P] [US2] Actualizar `docs/product/privacidad.md`: la clave `vuelto.cola.v1`, qué guarda (la compra completa de las operaciones pendientes), el techo de 90 días y que se vacía al cerrar sesión (FR-019); corregir la frase «Las compras de períodos anteriores no se escriben»
- [x] T037 [P] [US2] Actualizar `docs/architecture/03-frontend.md` (cola y estados), `docs/architecture/02-api-routes.md` (`compras` se escribe con `supabase-js` y RLS, no con una Edge Function) y `docs/architecture/01-data-models.md` si cambia algo de la fila

**Checkpoint**: US1 y US2 funcionan; con la subida desconectada la cola solo acumula.

---

## Phase 5: User Story 3 — Saber qué promo se aplicó y poder corregirla (P2)

**Goal**: la hoja «Revisá tu compra» muestra la promo que el motor asocia al comercio, medio y **fecha de la compra**, y el usuario puede quitarla.

**Independent Test**: en la hoja, para un comercio y medio con promo, ver la propuesta, quitarla, guardar y verificar que la compra no tiene promo ni reintegro esperado y que ningún tope cambia.

### Tests (primero; deben fallar)

- [x] T038 [P] [US3] `src/data/compras/promo-propuesta.test.ts`: propone la promo vigente **en la fecha de la compra** (un ticket de ayer propone lo de ayer); varias acumulables las devuelve todas; con tope agotado, comercio desconocido o medio sin promo devuelve vacío; sin monto no inventa reintegro (escenarios 1, 4, 5, 6)
- [x] T039 [P] [US3] `src/data/calculo.test.ts` (agregar): `compraParaGuardar` con `usarPromo: false` deja `promocionId` y `reintegroEsperado` en `null` y los topes no cambian (SC-006); con `true` coincide con `promoPropuesta` (SC-007); `descuentoObtenido` sigue en `null`
- [ ] T040 [P] [US3] `src/store/pantallas.test.ts` (agregar): cambiar de medio en el borrador vuelve a proponer la promo quitada (escenario 3)

### Implementación

- [x] T041 [US3] Crear `src/data/compras/promo-propuesta.ts` con `promoPropuesta(entradas, comercio, medioId, fecha, monto)` usando `recomendarSeguro` al mediodía de la fecha; tiene que pasar T038
- [x] T042 [US3] Agregar `usarPromo: boolean` a `BorradorCompra` en `src/data/contracts.ts` (por defecto `true`) y hacer que `compraParaGuardar` en `src/data/calculo.ts` use `promoPropuesta` y respete `usarPromo`; tiene que pasar T039
- [x] T043 [US3] En `src/app/revisa.tsx` mostrar la promo propuesta (todas las acumulables, con reintegro estimado y su base `≈$X, según N compras registradas`) y un control «No usé esta promo» que pone `usarPromo` en `false`; reiniciar `usarPromo` a `true` al cambiar de medio; reemplazar la lectura con `ahora` de la hoja por `promoPropuesta` con la fecha de la compra (FR-017, FR-022 a FR-025); tiene que pasar T040

**Checkpoint**: las tres historias funcionan por separado.

---

## Phase 6: Polish y cierre

- [x] T044 [P] Correr `npm run lint && npm run typecheck && npm run test` desde la raíz; todo en verde. Si hay Docker, `supabase db reset && supabase test db`
- [ ] T045 Verificación manual en el simulador de iOS con el modo avión (guion de `quickstart.md`, pasos 1 a 7); guardar capturas en `specs/010-registro-compras-cola/capturas/`
- [ ] T046 Pasar `rules-guardian` sobre el diff y corregir los hallazgos; luego `/code-review` y `test-runner`
- [x] T047 Actualizar `plan.md` («Archivos compartidos»: `store/compras.ts` recibe un reducer aditivo) y marcar el `checklists/requirements.md`
- [ ] T048 Dejar la nota de traspaso a la sesión de #42 en la carpeta de notas compartida (cómo usar `aplicarPendientes`, qué archivos comparten, qué falta para conectar la subida: `userId`, `medioRemoto`, `promoRemota`)
- [ ] T049 Agregar la entrada de esta sesión a `docs/bitacora-prompts.md` y abrir el PR que cierra #44 (aclarando en la descripción que la subida real queda desconectada hasta #40, #41 y #42)

---

## Dependencies & Execution Order

- **Setup (T001–T003)** → **Foundational (T004–T008)** → historias.
- **US1** no depende de las otras. **US2** extiende `thunks.ts` de US1 (T030 sobre T013), así que va después de US1. **US3** toca `calculo.ts`, `contracts.ts` y `thunks.ts` (el `guardarCompra` de T030), así que va después de T030 o se rebasa con cuidado.
- **Polish** al final.
- Dentro de cada historia: tests primero, núcleo puro después, cableado último.

### Parallel Opportunities

- T003, T004, T006 en paralelo; luego T005.
- US1: T009, T010, T011 en paralelo; T015 en paralelo con T013/T014.
- US2: T017–T022 (tests) y T035–T037 (esquema y docs) en paralelo; T023–T027 (núcleo puro) en paralelo entre sí.
- US3: T038, T039, T040 en paralelo.

## Implementation Strategy

1. **MVP**: Setup + Foundational + US1 (borrar). Es demostrable solo y sin red.
2. **Incremento 2**: US2, núcleo puro primero (T017–T027) y luego el cableado.
3. **Incremento 3**: US3.
4. La subida real **no se conecta** en este PR: falta `userId` (#40), `medioRemoto` (#41) y `promoRemota` (#42). Conectarla es una tarea posterior de unas pocas líneas: instanciar `repositorio.supabase.ts` y un `ContextoSubida` real en `crearStore`.

## Notes

- Cada tarea cita la ruta; las constraints del esquema y del modelo van textuales en T018 y T024.
- Coordinación con #42: este PR solo agrega un reducer a `store/compras.ts` y toca `store/index.ts` y `store/selectores.ts` de forma aditiva; **no** toca `persistencia.ts` ni `acciones.ts`.

## Desviaciones respecto del plan (registradas al implementar)

- **T014**: no hizo falta una función ni un selector nuevos. `comprasVista` (y con él `selectResumenCompras`) ahora lista todo el período de topes; los totales siguen siendo del mes.
- **T016 / T034**: las confirmaciones (borrar compra, cerrar sesión con pendientes) son hojas (`app/borrar-compra.tsx`, `app/cerrar-sesion.tsx`) y no `Alert.alert`, que no hace nada en la web.
- **T017 / T023 / T030**: `encolarBorrado` solo agrega la operación de borrado; la anulación del guardado que nunca subió es `compactar`, un paso aparte (acción `colaCompactada`). Así, si la app se cierra entre escrituras, cola y compras quedan siempre consistentes (R2, probado en `cola.test.ts`). La cola gana el campo `intentos` para el doble toque (FR-005).
- **T038**: `promoPropuesta` vive en `src/data/calculo.ts` junto a `compraParaGuardar` (evita un import circular) y sus tests están en `calculo.test.ts`.
- **T040**: el reinicio de «quitar la promo» al cambiar de medio es estado local de la hoja; no hay un test de componente en el proyecto. Se verificó a mano en el navegador que «No usé esta promo» deja la compra sin promo ni reintegro y sin cambiar «Te devolvieron», y que «Usar esta promo» la vuelve a proponer. El reinicio al cambiar de medio es una línea (`setQuitoLaPromo(false)` al elegir un medio) y no tiene test.
- **FR-016 / adopción (R5)**: el aviso de cierre de sesión y el thunk `adoptarOperaciones` están hechos y probados; el aviso de adopción al iniciar sesión (UI) se hace cuando #40 entregue un `userId`, porque hoy no hay forma de disparar ni de probar ese flujo.
