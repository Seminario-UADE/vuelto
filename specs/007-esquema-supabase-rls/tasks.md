# Tasks: Esquema inicial de Supabase con RLS

**Input**: `specs/007-esquema-supabase-rls/` (spec, plan, research, data-model, quickstart)
**Tests**: pedidos por la spec (FR-018): pgTAP en `supabase/tests/database/`.
**Convención**: toda migración con `create table` incluye en el mismo archivo `enable row level security`, `revoke all … from anon, authenticated`, los `grant` mínimos y sus policies (o el comentario de «sin policies» en `capturas_crudas`). Las columnas, tipos y constraints se copian literalmente de `data-model.md`. Policies con `(select auth.uid())`.

## Phase 1: Setup

- [x] T001 Inicializar el proyecto con `supabase init` (sin generar configuración de VS Code/IntelliJ) en `supabase/`; conservar `supabase/package.json` y `supabase/functions/` intactos; revisar `supabase/config.toml` (`project_id = "vuelto"`, `[db] major_version = 17`, seed en `./seed.sql`) y que `supabase/.gitignore` quede versionado.
- [x] T002 Verificar que `supabase start` levanta en local (Docker) y anotar qué servicios se pueden excluir con `-x` para el CI (studio, imgproxy, mailpit, realtime, storage-api, edge-runtime, logflare, vector, supavisor) sin romper `auth.users`.

## Phase 2: Foundational — migraciones (bloquean todas las historias)

- [x] T003 Crear `supabase/migrations/20261101000001_catalogos.sql`: tablas `bancos` (`id uuid PK`, `nombre text not null` no vacío) y `categorias` (`id integer PK`, `nombre text not null` no vacío); RLS + `grant select to authenticated` + policy `select using (true)`; sin grants a `anon`; sin policies de escritura.
- [x] T004 Crear `supabase/migrations/20261101000002_perfiles.sql`: `perfiles` (`id uuid PK references auth.users(id) on delete cascade`, `nombre_para_mostrar text` nullable y no vacío si existe, `creado_en timestamptz not null default now()`); RLS; policy `for all to authenticated` con `id = (select auth.uid())` en `using` y `with check`.
- [x] T005 Crear `supabase/migrations/20261101000003_medios_de_pago.sql`: `medios_de_pago` (`id`, `user_id uuid not null default auth.uid() references auth.users on delete cascade`, `banco_id uuid not null references bancos`, `tipo` ∈ `debito`/`credito`, `red` ∈ `visa, master, american_express, dinners_club, maestro, cabal, naranja, confiable, tarjeta_sol`, `creado_en`), `unique (user_id, id)`, `unique (user_id, banco_id, tipo, red)`, índice en `banco_id`; RLS y policy de dueño.
- [x] T006 Crear `supabase/migrations/20261101000004_comercios_habituales.sql`: `comercios_habituales` (`id`, `user_id` como arriba, `nombre text not null` no vacío, `creado_en`), índice único `(user_id, lower(regexp_replace(btrim(nombre), '\s+', ' ', 'g')))`; RLS y policy de dueño.
- [x] T007 Crear `supabase/migrations/20261101000005_capturas_crudas.sql`: `capturas_crudas` (`id`, `origen text not null` no vacío, `contenido text not null`, `extraccion jsonb` nullable, `capturada_en timestamptz not null default now()`); `enable row level security` SIN policies y un comentario SQL que diga que es a propósito (solo service role); `revoke all … from anon, authenticated`.
- [x] T008 Crear `supabase/migrations/20261101000006_promociones.sql`: función `public.set_actualizada_en()` (`security invoker`, `set search_path = ''`, usa `clock_timestamp()`; en insert fuerza la hora; en update compara `to_jsonb(new) - 'actualizada_en'` contra `to_jsonb(old) - 'actualizada_en'` y solo si difieren la fuerza, si no restituye la vieja) y su trigger `before insert or update`; tabla `promociones` con todas las columnas y checks de `data-model.md` (porcentaje 0–100, `vigencia_hasta >= vigencia_desde`, `tope_monto > 0`, `monto_minimo >= 0`, redes ⊆ las 9 sin repetidos y al menos una lista no vacía, `dias` no vacía ⊆ `lun…dom` sin repetidos, `fragmentos_fuente` jsonb objeto, `captura_cruda_id` FK NO ACTION y obligatorio si `fuente = 'modo'`, `fuente_id` obligatorio si `fuente = 'modo'`, `unique (fuente, fuente_id)`), índices en `actualizada_en`, `banco_id`, `categoria_id`, `captura_cruda_id`; RLS, `grant select to authenticated`, policy `select using (true)`.
- [x] T009 Crear `supabase/migrations/20261101000007_compras.sql`: `compras` con las columnas de `data-model.md` (`monto > 0`, `descuento_obtenido >= 0`, `reintegro_esperado >= 0`, `origen` ∈ `ticket`/`excepcion`/`manual`, `texto_extraido text` nullable, sin columna de imagen), FK compuesta `(user_id, medio_de_pago_id) → medios_de_pago (user_id, id)` NO ACTION, FK `promocion_id → promociones` NO ACTION, FK `categoria_id → categorias`, índices `(user_id, fecha desc)`, `(user_id, medio_de_pago_id)`, `categoria_id`, `promocion_id`; RLS y policy de dueño.
- [x] T010 [P] Crear `supabase/seed.sql` idempotente (`on conflict do update`): las 13 categorías de `CATEGORIAS_MODO` (`packages/motor/src/categorias.ts`, mismos id y nombre) y el banco Galicia con id `88d8705e-2dda-46f9-8411-bb4916af858e`. Comentario: el resto del catálogo de bancos lo siembra la ingesta con ids reales de MODO.
- [x] T011 Ejecutar `supabase db reset` dos veces seguidas y corregir hasta que ambas terminen sin errores; confirmar 13 categorías y Galicia.

## Phase 3: User Story 1 — Aislamiento de datos (P1) 🎯 MVP

**Prueba independiente**: A y B con datos propios; A no ve, no modifica ni crea nada de B.

- [x] T012 [US1] Crear `supabase/tests/database/rls.test.sql` (pgTAP, `begin … rollback`; usuarios de prueba creados en `auth.users`; `set local role authenticated` + `set local request.jwt.claims`): (a) A no lee compras de B ni filas de B en las otras 3 tablas de dueño; (b) A no puede actualizar ni borrar las de B ni insertar a nombre de B; (h) A no puede cambiar el `user_id` de una fila propia a B; (i) A no puede insertar ni actualizar una compra con un medio de pago de B; (j) borrar la cuenta de A, con compras que referencian sus medios, borra sus filas y no toca las de B; borrar un medio con compras falla; (e) `capturas_crudas` invisible para `authenticated` y `anon`; (f) `anon` no accede a ninguna tabla; A inserta y lee sus propias filas.
- [x] T013 [US1] Crear `supabase/tests/database/estructura.test.sql`: toda tabla de `public` tiene RLS activa; toda tabla salvo `capturas_crudas` tiene al menos una policy (SC-003); ninguna columna de `public` se llama o termina en `imagen`/`foto`/`image` ni es `bytea` (FR-013); no hay vistas sin `security_invoker` ni funciones `security definer` ejecutables por `anon`/`authenticated` en `public` (FR-023); `anon` no tiene ningún privilegio de tabla en `public`.
- [x] T014 [US1] Correr `supabase test db`; corregir migraciones (no los tests) ante cualquier falla de aislamiento.

## Phase 4: User Story 2 — Corpus de solo lectura (P1)

**Prueba independiente**: un autenticado lee `promociones`, `bancos`, `categorias` y no puede escribir.

- [x] T015 [US2] Ampliar `supabase/tests/database/rls.test.sql` con: (c) un autenticado no puede insertar en `promociones`; (d) lo sembrado por el rol de servicio se lee; (k) no puede insertar/actualizar/borrar en `bancos`, `categorias`, ni actualizar o borrar `promociones` (0 filas afectadas o error de permisos); `anon` no lee `promociones`; el rol `service_role` puede insertar en todas las tablas del corpus y en `capturas_crudas`.
- [x] T016 [US2] Correr `supabase test db` y corregir migraciones si falla.

## Phase 5: User Story 5 — Levantar limpio y en CI (P1)

**Prueba independiente**: clon limpio, un comando, esquema completo; el CI corre la suite.

- [x] T017 [US5] Agregar el job `supabase-rls` a `.github/workflows/ci.yml`: `actions/checkout@v4`, `supabase/setup-cli@v1` (versión fija), `supabase start -x <servicios confirmados en T002>`, `supabase db reset` dos veces y `supabase test db`.
- [x] T018 [US5] Agregar a `supabase/tests/database/estructura.test.sql` una prueba de conteo: `categorias` tiene 13 filas y coinciden con `CATEGORIAS_MODO` (id y nombre) tras `db reset`.

## Phase 6: User Story 4 — Contrato del motor y trazabilidad (P2)

**Prueba independiente**: una promoción completa y una con todos los opcionales en `null` se aceptan; las inválidas se rechazan.

- [x] T019 [US4] Crear `supabase/tests/database/contrato.test.sql` (pgTAP, con rol de servicio): promoción completa aceptada; promoción con `comercio, dias, tope_*, monto_minimo, jurisdiccion, canal, acumulable` en `null` aceptada; rechazo sin `banco_id`, `categoria_id`, `porcentaje`, `vigencia_*`, sin redes; FK inexistente de banco/categoría; porcentaje 101 y −1; `hasta < desde`; `dias` vacía o con repetidos; redes con valores fuera de las 9 o repetidas; `titulo` vacío; `fuente = 'modo'` sin `fuente_id` o sin captura; `fragmentos_fuente` que no es objeto; captura referenciada no se puede borrar; promoción con compras no se puede borrar; duplicado `(fuente, fuente_id)` rechazado. Compras: `origen` inválido, `monto <= 0`, `comercio` vacío rechazados; compra con solo los campos obligatorios aceptada; medio de pago con `tipo`/`red` inválidos y duplicado `(banco, tipo, red)` rechazados; comercio habitual duplicado con otra capitalización o espacios rechazado, y permitido para otro usuario.
- [x] T020 [US4] Correr `supabase test db` y corregir migraciones si falla.

## Phase 7: User Story 3 — Sincronización incremental (P2)

**Prueba independiente**: insertar, esperar, actualizar y consultar «posteriores a la marca».

- [x] T021 [US3] Crear `supabase/tests/database/actualizada_en.test.sql`: la marca se completa al insertar aun enviando una fecha vieja; avanza al cambiar cualquier campo (incluida la baja con `dada_de_baja_en`); ignora una fecha vieja enviada en el update; no se mueve en una re-escritura con los mismos valores; la consulta `where actualizada_en > <marca>` devuelve solo las modificadas después. Usar `pg_sleep(0.01)` o `clock_timestamp()` entre pasos.
- [x] T022 [US3] Correr `supabase test db` y corregir la función/trigger si falla.

## Phase 8: Polish y cierre

- [x] T023 [P] Actualizar `docs/architecture/01-data-models.md`: reemplazar «Sin migraciones definidas todavía» por el resumen del esquema real y un enlace a `supabase/migrations/` y a `specs/007-esquema-supabase-rls/data-model.md`; agregar `supabase/` al apartado de estado de `CLAUDE.md` (migraciones y seed ya existen) sin tocar el resto.
- [x] T024 [P] Documentar en `specs/007-esquema-supabase-rls/quickstart.md` y en el README correspondiente cualquier ajuste surgido (servicios excluidos, nombres de comandos).
- [x] T025 Correr `npm run lint`, `npm run typecheck` y `npm run test` desde la raíz para confirmar que nada del resto se rompió (y que `recomendar` está intacta: `git diff --stat main -- supabase/functions` vacío).
- [ ] T026 Invocar `/code-review`, `test-runner` y `rules-guardian`; corregir lo que encuentren.
- [ ] T027 Agregar la entrada de esta sesión a `docs/bitacora-prompts.md` (formato de las entradas existentes) y abrir el PR con `Closes #34`, listando las 5 decisiones adoptadas (medio con compras no se borra, captura referenciada no se borra, baja lógica de promos, normalización de comercios, forma de `capturas_crudas`) y la nota de que solo Galicia tiene id real sembrado.

## Dependencias

- T001 → T002 → T003…T009 (orden de migraciones por dependencias de FK) → T011.
- T010 en paralelo con las migraciones; T011 necesita todas.
- Las fases 3–7 necesitan T011. T012/T013 en archivos distintos pueden escribirse en paralelo; T015 y T018 amplían archivos de T012/T013.
- T017 necesita T002 y T014 (la suite ya verde en local).
- Fase 8 al final.

## Estrategia

MVP = Phase 1–3 (esquema + aislamiento de datos probado). Luego US2, CI, US4 y US3. Cada fase termina con `supabase test db` en verde.
