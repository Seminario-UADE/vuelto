# Tasks: App — sincronizar el corpus y las compras del período

**Input**: `specs/009-sincronizar-corpus/` — [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: se piden (Vitest, sin red, repositorio en memoria). Cada bloque de tests va **antes** de la implementación y tiene que fallar primero.

**Fuera de alcance (es de #44)**: guardar una compra, la cola sin red y la subida. Esta lista solo define el campo `pendientes`, el reducer `compraSubida` y el id de las compras; no escribe nada en Supabase.

**Formato**: `- [ ] T### [P?] [US?] Descripción con ruta`. `[P]` = se puede hacer en paralelo (archivos distintos, sin depender de una tarea sin terminar).

**Rutas**: `apps/mobile/src/…` salvo que diga otra cosa. Comandos desde la raíz del repo.

## Phase 1: Setup

- [ ] T001 Crear `apps/mobile/src/sync/` y `apps/mobile/scripts/` y sumar `"test:integracion"` a `apps/mobile/package.json` (`vitest run --config vitest.integracion.config.mts`)
- [ ] T002 [P] Crear `apps/mobile/vitest.integracion.config.mts` que incluye solo `src/**/*.integracion.test.ts` y excluir esos archivos de `vitest.config.mts` (`include: ["src/**/*.test.ts"]`, `exclude: ["src/**/*.integracion.test.ts"]`) para que `npm run test` no necesite Docker ni red
- [ ] T003 [P] Actualizar `specs/009-sincronizar-corpus/data-model.md` §Contrato con #44 si algo cambió al implementar (se revisa de nuevo en T061)

## Phase 2: Foundational (bloquea todas las historias)

**Propósito**: contratos, ventana, mapeo, lógica pura de la mezcla y la forma nueva del store. Sin esto no se puede escribir ninguna historia.

### Tests primero

- [ ] T004 [P] Test de `ventana` en `apps/mobile/src/sync/ventana.test.ts`: `desde` = el más temprano entre `inicioDelPeriodo("mensual")` e `inicioDelPeriodo("semanal")` para febrero de 2026 (28 días), febrero de 2028 (29), abril (30), mayo (31), el primer día del mes a las 00:00 y a las 23:59 de Argentina, y un lunes que cruza de mes (SC-003, FR-014)
- [ ] T005 [P] Test de `mapeo` en `apps/mobile/src/sync/mapeo.test.ts`: `filaAPromocion` arma `TarjetasAceptadas` desde `debito_redes`/`credito_redes`, convierte `numeric` con `Number` y rechaza lo no finito, lo ausente es `null`, descarta una fila con red/jurisdicción/canal/día desconocidos; **una baja** (`dada_de_baja_en` no nulo) devuelve `vigencia.hasta = min(hasta, día anterior a la baja en Argentina)` (FR-010, R8); `filaACompra` conserva `medio_de_pago_id` como UUID (FR-012)
- [ ] T006 [P] Test de `corpus` (puro) en `apps/mobile/src/sync/corpus.test.ts`: marca `null` + al menos una promo ⇒ reemplaza; marca `null` + cero promos ⇒ devuelve el corpus sin cambios (FR-013); marca no nula ⇒ mezcla por `id` y gana la de `actualizada_en` mayor; poda `vigencia.hasta < inicioDelPeriodo` (FR-011); reconciliación saca los ids que el servidor ya no tiene (FR-009); una actualización inválida saca la versión anterior de ese `id` y cuenta en `descartadas`; una baja inválida en otros campos igual se aplica (FR-010)
- [ ] T007 [P] Test de `compras` (puro) en `apps/mobile/src/sync/compras.test.ts`: `servidor ∪ (pendientes que el servidor no devolvió)`, sin duplicados por `id`; poda a la ventana salvo pendientes (FR-014, FR-015)

### Implementación

- [ ] T008 Definir en `apps/mobile/src/sync/contratos.ts` `Cursor`, `FilaPromocion`, `FilaCompra` (columnas de `supabase/migrations/20261101000006_promociones.sql` y `…07_compras.sql`, en snake_case) y la interfaz `RepositorioSincronizacion` de `data-model.md` (`usuarioId`, `promociones`, `idsDePromociones`, `compras`)
- [ ] T009 [P] Implementar `ventana.ts` en `apps/mobile/src/sync/ventana.ts` con `inicioDelPeriodo` y `fechaArgentina` de `@vuelto/motor`; no reimplementar aritmética de fechas (R7). Hace pasar T004
- [ ] T010 [P] Implementar `mapeo.ts` en `apps/mobile/src/sync/mapeo.ts` (`filaAPromocion`, `filaACompra`, `diaAnterior` si el motor no lo exporta: va en la app, no en `packages/motor`). Hace pasar T005
- [ ] T011 [P] Implementar `corpus.ts` en `apps/mobile/src/sync/corpus.ts` (`aplicarPromociones`, `reconciliarIds`, `podar`). Hace pasar T006
- [ ] T012 [P] Implementar `compras.ts` en `apps/mobile/src/sync/compras.ts` (`mezclarCompras`). Hace pasar T007
- [ ] T013 Cambiar `EstadoCorpus` (`marca: string | null`, `sincronizadoEn: string | null`, `descartadas: number`; **eliminar `cargadoEn`**) y `EstadoCompras` (`pendientes: string[]`, `duenoId: string | null`) en `apps/mobile/src/store/acciones.ts`; agregar las acciones `sincronizado` (payload `{ corpus, compras, usuarioId, ahora }`) y `compraSubida` (payload `id`), y sumar `ahora: string | null` a `Rehidratado`
- [ ] T014 [P] Actualizar `apps/mobile/src/store/corpus.ts`: estado inicial con `marca: null`, `sincronizadoEn: null`, `descartadas: 0` y las promos de ejemplo; atender `sincronizado` (reemplaza por `payload.corpus`) y `rehidratado`
- [ ] T015 [P] Actualizar `apps/mobile/src/store/compras.ts`: `pendientes` y `duenoId` iniciales; `compraAgregada` agrega el id a `pendientes`; `compraSubida` lo saca; `sincronizado` aplica `mezclarCompras` sobre el estado de ese momento y, si `duenoId` difiere de `payload.usuarioId`, parte de `{lista: [], pendientes: [], duenoId: null}`; `sesionCerrada` y `escenarioElegido` conservan el comportamiento actual y vacían `pendientes`/`duenoId`
- [ ] T016 [P] Actualizar `apps/mobile/src/store/sesion.ts`: campo `epoca: number` (0, no persistido); `sesionCerrada` lo incrementa; `sincronizado` y `rehidratado` fijan `ahora` desde el payload cuando no es `null`
- [ ] T017 Ampliar `Extra` y `crearStore` en `apps/mobile/src/store/index.ts` con `repositorio: RepositorioSincronizacion | null`, `reloj: () => Date` y `coordinacion: { enVuelo: boolean; ultimoIntentoMs: number | null }`; actualizar `apps/mobile/src/store/prueba.ts` (`storeDePrueba` acepta repositorio y reloj, con valores por defecto) y todos los tests que llaman a `crearStore`
- [ ] T018 [P] Implementar `apps/mobile/src/sync/repositorio-memoria.ts`: misma interfaz sobre arreglos, mismo orden y cursor que PostgREST, límite de página, un modo `falloEnPagina: n` y otro `usuario: string | null` (para los tests de US1 y US5)
- [ ] T019 Hacer pasar los tests existentes de `apps/mobile/src/store/` (`slices.test.ts`, `persistencia.test.ts`, `selectores.test.ts`, `pantallas.test.ts`) con los campos nuevos y sin `cargadoEn`

**Checkpoint**: `npm run typecheck && npm run test -w @vuelto/mobile` en verde con la forma nueva del store.

## Phase 3: User Story 1 — Al abrir con señal, los datos se ponen al día solos (P1) 🎯 MVP

**Objetivo**: la sincronización baja el corpus y las compras del período y las aplica de una vez.

**Prueba independiente**: con un repositorio en memoria (3 promos nuevas, 1 modificada, 1 dada de baja, 4 compras), `sincronizar("apertura")` deja el corpus esperado, la marca avanzada y las compras en el store; una segunda sin cambios no cambia el corpus.

### Tests primero

- [ ] T020 [P] [US1] Test de `paginar` en `apps/mobile/src/sync/paginar.test.ts`: página de 500; fin cuando una página trae menos que el tamaño; empate de `actualizada_en` en el borde de página sin pérdida ni repetición; una fila modificada entre dos páginas no se pierde; el cursor se pasa como texto exacto sin `Date` (SC-006, FR-006)
- [ ] T021 [P] [US1] Test del thunk en `apps/mobile/src/sync/sincronizar.test.ts`: escenarios 1–8 de US1 — incremental con `marca − 10 min`; reemplazo en la primera sincronización; cero promos no cambia nada (FR-013); páginas completas en una sola acción; fila confirmada tarde llega por el margen (FR-007); falla en una página o en compras deja store, marca y reloj idénticos (FR-005); un disparo durante otro se ignora; `primer-plano` antes de 5 minutos no sincroniza y `apertura` sí (FR-001, FR-002); sin repositorio, sin sesión o sin red no toca el store y no lanza (FR-003)
- [ ] T022 [P] [US1] Test del timeout en `apps/mobile/src/sync/sincronizar.test.ts`: un repositorio que nunca responde se aborta a los 15 s (reloj simulado) y cuenta como falla (FR-002)

### Implementación

- [ ] T023 [US1] Implementar `leerTodo` en `apps/mobile/src/sync/paginar.ts` (cursor `(actualizada_en, id)`, página de 500). Hace pasar T020
- [ ] T024 [US1] Implementar el thunk `sincronizar` en `apps/mobile/src/sync/sincronizar.ts` siguiendo `contracts/repositorio.md` (puerta, parámetros con `Extra.reloj`, lectura, mapeo y mezcla, `descartadas`, una sola acción `sincronizado`, nunca lanza). Hace pasar T021 y T022
- [ ] T025 [P] [US1] Implementar `apps/mobile/src/sync/repositorio-supabase.ts` con el cliente de `apps/mobile/src/lib/supabase.ts` y las consultas **exactas** de `contracts/postgrest.md` (`.or`/`.and`, `order`, `limit(500)`, `abortSignal(AbortSignal.timeout(15_000))`); sin service role
- [ ] T026 [P] [US1] Crear `apps/mobile/src/hooks/use-sincronizacion.ts`: al pasar `sesion.hidratado` a `true` despacha `sincronizar("apertura")` y en cada `AppState` → `active` despacha `sincronizar("primer-plano")`; limpia el listener al desmontar
- [ ] T027 [US1] En `apps/mobile/src/app/_layout.tsx` armar el repositorio (`supabase ? repositorioSupabase(supabase) : null`), pasarlo y `() => new Date()` a `crearStore`, y llamar `useSincronizacion()` junto a `useReloj()`

**Checkpoint**: US1 se prueba sola con el repositorio en memoria; el MVP es T001–T027.

## Phase 4: User Story 4 — Una promo que ya no sirve no se recomienda y su consumo sigue contando (P1)

**Objetivo**: bajas, vencimientos y reconciliación sin que el restante de un tope compartido suba.

**Prueba independiente**: tope compartido con un miembro dado de baja que tiene compras del mes: el restante del motor no cambia y la promo no se recomienda.

- [ ] T028 [P] [US4] Test con el motor real en `apps/mobile/src/sync/bajas.test.ts` usando `selectRecomendacion` y `selectTopes` sobre un store sincronizado: baja con compras ⇒ el restante no sube y la promo no se recomienda con causa `vigencia` (US4-1, SC-002); promo vencida del mismo rubro ⇒ descartada por el motor (US4-3); promo con vigencia acortada a ayer ⇒ deja de recomendarse (US4-4, la consulta incremental no filtra por vigencia); fila inválida que es actualización ⇒ sale la versión anterior y `descartadas` sube (US4-5)
- [ ] T029 [P] [US4] Test en `apps/mobile/src/sync/sincronizar.test.ts` de la reconciliación: el repositorio devuelve ids nuevos tras una re-siembra ⇒ el corpus no queda con duplicados (US1-9, FR-009); y de la poda: una promo vencida antes del inicio del período sale del store (US4-2, FR-011)
- [ ] T030 [US4] Ajustar `sincronizar.ts`, `corpus.ts` y `mapeo.ts` hasta que T028 y T029 pasen (reconciliación vía `idsDePromociones`, baja por `id` antes de validar)

## Phase 5: User Story 5 — Compras y cuentas se mantienen separadas (P1)

**Objetivo**: no perder compras locales ni mezclar cuentas.

**Prueba independiente**: una compra en `pendientes` sobrevive a la sincronización; un cambio de cuenta deja `compras` y `pendientes` en el estado inicial.

- [ ] T031 [P] [US5] Tests de los reducers en `apps/mobile/src/store/slices.test.ts`: `compraAgregada` agrega el id a `pendientes`; `compraSubida` lo saca; `sincronizado` conserva las pendientes que el servidor no devolvió y deja la versión del servidor si la devuelve (US5-1, US5-2); `duenoId` distinto ⇒ parte de cero (US5-5)
- [ ] T032 [P] [US5] Tests del thunk en `apps/mobile/src/sync/sincronizar.test.ts`: una compra guardada mientras hay una sincronización en vuelo no se pierde (US5-3); `sesionCerrada` durante el vuelo ⇒ el resultado se descarta y no se persiste nada (`epoca`, US5-4, SC-005); `usuarioId` distinto antes de aplicar ⇒ descarta; `usuarioId` `null` ⇒ no sincroniza
- [ ] T033 [P] [US5] Test de persistencia en `apps/mobile/src/store/persistencia.test.ts`: una compra pendiente de fuera del período **se guarda** (US5-6); las demás compras se filtran al período como hoy
- [ ] T034 [US5] Completar `sincronizar.ts` con el doble chequeo (`epoca` + segundo `usuarioId`) sincrónico con el `dispatch`, y `aPersistir` en `apps/mobile/src/store/persistencia.ts` para no filtrar las pendientes. Hace pasar T031–T033

## Phase 6: User Story 2 — Sin señal, la recomendación sigue funcionando (P1)

**Objetivo**: lo sincronizado sobrevive al cierre y la app reabre con el reloj correcto sin red.

**Prueba independiente**: store sincronizado y guardado ⇒ reabrir con un repositorio que falla ⇒ la misma recomendación, reloj real, sin error.

### Tests primero

- [ ] T035 [P] [US2] Tests de persistencia en `apps/mobile/src/store/persistencia.test.ts`: el corpus se escribe en `vuelto.corpus.v1` con `marca` y `sincronizadoEn` en el mismo valor; `vuelto.store.v1` ya no contiene `corpus`; si `setItem` del corpus falla, perfil, cuenta y compras igual se guardan y la marca guardada no avanza (US6-3, FR-017)
- [ ] T036 [P] [US2] Tests de compatibilidad en `apps/mobile/src/store/persistencia.test.ts`: un guardado v1 **real** (con el corpus de ejemplo dentro y sin los campos nuevos) se lee como "nunca sincronizó" y conserva el perfil; el validador completa `pendientes: []` y `duenoId: null`; un `vuelto.corpus.v1` inválido deja `marca: null` y corpus vacío si el usuario ya tenía cuenta (Edge Cases)
- [ ] T037 [P] [US2] Tests de arranque en `apps/mobile/src/sync/arranque.test.ts`: reabrir sin red tras una sincronización ⇒ recomendación idéntica y `sesion.ahora` real en el mismo `rehidratado` (US2-1, US2-5, SC-001); nunca sincronizó ⇒ sigue con los datos y el reloj de ejemplo (US2-3); sin sesión o sin variables ⇒ sin error (US2-4); tipear un monto no hace ningún pedido al repositorio (SC-004)

### Implementación

- [ ] T038 [US2] Reescribir la parte de corpus de `apps/mobile/src/store/persistencia.ts`: segunda clave, `leerPersistido` y `rehidratar` leen ambas, normalizan los campos que faltan, calculan `ahora` con `Extra.reloj` cuando la marca no es `null` y lo mandan en `rehidratado`; el listener escribe cada clave solo si cambió su parte. Hace pasar T035 y T036
- [ ] T039 [US2] Cambiar `apps/mobile/src/hooks/use-reloj.ts` para elegir `relojReal` si `corpus.marca !== null` y `relojDeEjemplo` si no (FR-016, R2); actualizar los tests de `apps/mobile/src/lib/reloj.test.ts` si hace falta. Hace pasar T037

## Phase 7: User Story 3 — Se sabe qué tan frescas son las promos (P2)

**Prueba independiente**: la función pura devuelve el texto de la tabla de cortes; con corpus de ejemplo no devuelve nada.

- [ ] T040 [P] [US3] Test de `textoFrescura` en `apps/mobile/src/lib/frescura.test.ts`: 10 min ⇒ "Promos actualizadas hace unos minutos"; 1 h 20 ⇒ "hace 1 hora"; 5 h ⇒ "hace 5 horas"; 26 h ⇒ "hace 1 día"; 3 días ⇒ "hace 3 días"; diferencia negativa ⇒ "unos minutos"; `null` ⇒ `null` (FR-019)
- [ ] T041 [US3] Implementar `textoFrescura` en `apps/mobile/src/lib/frescura.ts`. Hace pasar T040
- [ ] T042 [P] [US3] Agregar `selectFrescura` en `apps/mobile/src/store/selectores.ts` (usa `sesion.ahora` y `corpus.sincronizadoEn`) con test en `apps/mobile/src/store/selectores.test.ts`
- [ ] T043 [US3] Mostrar la leyenda en `apps/mobile/src/app/(tabs)/index.tsx` al final de `Screen`, `Text variant="label" tone="inkSecondary"`, solo cuando `selectFrescura` no es `null`; verificar en el simulador de iOS con captura

## Phase 8: User Story 6 — El equipo sabe dónde guardar el corpus (P3)

**Prueba independiente**: `medirCorpus` sobre un repositorio en memoria reporta los números esperados; la documentación tiene la proyección rotulada.

- [ ] T044 [P] [US6] Test de `medirCorpus` en `apps/mobile/src/sync/medicion.test.ts`: cantidad, bytes totales (UTF-8), promedio, máximo por promo y fracción de 6 MB y de 2 MB sobre promos conocidas; corpus vacío ⇒ ceros sin dividir por cero
- [ ] T045 [US6] Implementar `medirCorpus` y `proyectarCorpus(promos, n)` en `apps/mobile/src/sync/medicion.ts`. Hace pasar T044
- [ ] T046 [US6] Crear `apps/mobile/scripts/medir-corpus.ts`: se loguea con la anon key y `MEDICION_EMAIL`/`MEDICION_PASSWORD`, usa `leerTodo` y el repositorio de Supabase, imprime el informe; nunca usa la service role; se corre con `node --experimental-strip-types`
- [ ] T047 [US6] Calcular la proyección con las promos de `fixtures.ts` a 2.000 promos y escribirla, rotulada **"PROYECCIÓN con promos de ejemplo, no una medición"**, en `docs/product/pendientes.md` y `docs/architecture/03-frontend.md`, junto con la decisión de persistir el corpus en `vuelto.corpus.v1` y "medición real pendiente de #35"

## Phase 9: Integración y pulido

- [ ] T048 Prueba de integración en `apps/mobile/src/sync/repositorio-supabase.integracion.test.ts` contra un Supabase local (`API_URL` y `ANON_KEY` de `supabase status`): siembra sus propias promos con empates, `otra_provincia` y jurisdicción `null`, un usuario de prueba y sus compras; verifica el cursor, el filtro, el texto de `actualizada_en`, el `+` codificado, el RLS de compras y que la escritura en `promociones` falla con `42501` (R1). Se salta sola si no hay `API_URL`
- [ ] T049 [P] Documentar en `docs/architecture/04-infrastructure.md` el contrato de márgenes con la ingesta y la siembra: cada lote de escrituras de `promociones` se confirma en menos de 5 minutos (el margen de relectura es de 10)
- [ ] T050 [P] Actualizar `docs/architecture/03-frontend.md` (sección Estado: dos claves de persistencia, `marca`, `epoca`, reloj por `marca`, leyenda) y quitar de `docs/product/pendientes.md` los ítems resueltos o dejarlos con su estado real
- [ ] T051 [P] Actualizar `docs/architecture/02-api-routes.md` si la tabla de lo que consume la app menciona la sincronización, y `CLAUDE.md` (Estado: `apps/mobile` sincroniza el corpus y las compras)
- [ ] T052 Anotar en `specs/009-sincronizar-corpus/data-model.md` los cambios finales al contrato con #44 (ids UUID, `compraAgregada`/`compraSubida`, `duenoId`) y copiar el resumen a la carpeta de notas compartida
- [ ] T053 Agregar la entrada en `docs/bitacora-prompts.md` (sesión del 02/11/2026: spec, crítica, plan, decisiones tomadas y su motivo)
- [ ] T054 Correr `npm run lint && npm run typecheck && npm run test && npm run build` desde la raíz; `deno check` no aplica (no se tocó `supabase/functions`)
- [ ] T055 Correr `npm run test:integracion -w @vuelto/mobile` contra el Supabase local aislado (puertos 563xx) y guardar la salida
- [ ] T056 Correr `rules-guardian` sobre el diff y corregir los hallazgos; luego `/code-review` y corregir
- [ ] T057 Probar en el simulador de iOS (Expo Go o build) que la app abre, no muestra la leyenda con datos de ejemplo y no se rompe sin variables de Supabase; capturas para el PR
- [ ] T058 **BLOQUEADA por #40, #35 y #41**: prueba manual en modo avión con un usuario real y el corpus real (quickstart §4). Dejar escrito en el PR qué falta y quién lo destraba
- [ ] T059 Abrir el PR con `Closes #42`, la tabla de lo que se verificó y lo que queda bloqueado, las decisiones que se apartan del texto de la issue (ventana = período; corpus en clave aparte) para que las apruebe el PO, y el aviso a #44 del contrato del slice `compras`

## Dependencias y orden

- **Phase 1** → **Phase 2** (bloquea todo) → US1 (MVP) → el resto.
- **US4** y **US5** dependen de US1 (reusan el thunk). **US2** depende de la forma del store (Phase 2) y de que exista `sincronizado` (US1). **US3** depende de `corpus.sincronizadoEn` (Phase 2). **US6** solo de `leerTodo` (US1) y es independiente del resto.
- Dentro de cada fase: los tests antes que la implementación; los `[P]` no comparten archivo.
- **T017** toca el constructor del store: es el cuello de botella; se hace antes de T018–T019.
- **T058** no se puede hacer hasta que lleguen #40, #35 y #41.

## Paralelismo

- Phase 2: T004–T007 (tests) en paralelo; T009–T012 en paralelo; T014–T016 en paralelo después de T013.
- US1: T020–T022 en paralelo; T025 y T026 en paralelo después de T023.
- US5: T031–T033 en paralelo.
- US2: T035–T037 en paralelo.
- US3 y US6 pueden ir en paralelo con US4/US5 una vez que Phase 2 y T023 estén listas.
- Pulido: T049–T051 en paralelo.

## Estrategia

1. **MVP**: Phase 1 + Phase 2 + US1 (T001–T027). Con eso la app sincroniza con un repositorio real y todo lo demás se agrega sobre una base probada.
2. Después, en este orden: US4 (que los datos sean correctos) → US5 (que no se pierdan ni se mezclen) → US2 (que sobreviva sin red) → US3 → US6.
3. Cierre: integración, documentación, `rules-guardian`, `/code-review` y PR. La prueba en el teléfono queda bloqueada.
