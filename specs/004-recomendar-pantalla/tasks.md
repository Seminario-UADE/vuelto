---

description: "Tareas para la pantalla «¿Con qué pago?» y la Edge Function recomendar (issue #43)"
---

# Tasks: Pantalla «¿Con qué pago?» y Edge Function `recomendar`

**Input**: `specs/004-recomendar-pantalla/` (spec.md, plan.md, research.md, data-model.md, contracts/recomendar.md, quickstart.md)

**Tests**: obligatorios. FR-018, FR-024 y FR-025 piden tests explícitos, y la capa del servidor se escribe test-first igual que el motor (plan, Constitution Check §VI). En cada fase, los tests se escriben antes que el código y tienen que fallar primero.

**Organización**: por historia de usuario. La capa del servidor de US1, US2 y US3 se puede hacer ahora; las fases marcadas **BLOQUEADA** esperan a otras issues.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede hacer en paralelo (otro archivo, sin depender de tareas sin terminar)
- **[Story]**: historia a la que pertenece (US1 a US4)
- Rutas relativas a la raíz del repo. `fn/` abrevia `supabase/functions/`.

---

## Phase 1: Setup

- [X] T001 Verificar que el repo arranca limpio: `npm ci`, `npm run lint`, `npm run typecheck` y `npm run test` en verde antes de tocar nada.
- [X] T002 Exportar `fechaArgentina` desde `packages/motor/src/index.ts` (`export { fechaArgentina } from "./fecha.ts";`), sin tocar `fecha.ts` ni ningún test (research R6).
- [X] T003 Configurar el workspace `supabase` en `supabase/package.json`: `"type": "module"`, scripts `lint` (`eslint .`), `typecheck` (`tsc --noEmit`) y `test` (`vitest run`), devDependencies `typescript` y `vitest` con las mismas versiones que `packages/motor/package.json`. Correr `npm install` para actualizar `package-lock.json`.
- [X] T004 [P] Crear `supabase/tsconfig.json`: extiende `../tsconfig.base.json`; `lib` `["ES2022", "DOM"]` (para `Request`/`Response`); `allowImportingTsExtensions: true` y `noEmit: true`; `paths` `{"@vuelto/motor": ["../packages/motor/src/index.ts"]}`; `include` `["functions/**/*.ts", "vitest.config.ts"]`; `exclude` `["functions/*/index.ts"]` (entradas Deno, research R2).
- [X] T005 [P] Crear `supabase/vitest.config.ts` con `resolve.alias` `@vuelto/motor` → `../packages/motor/src/index.ts` (ruta absoluta con `fileURLToPath`), `test.include` `["functions/**/*.test.ts"]`.
- [X] T006 [P] Ajustar `eslint.config.js` para ignorar `supabase/functions/*/index.ts` (usa el global `Deno`, research R2).

**Checkpoint**: `npm run typecheck -w @vuelto/supabase` corre (sin archivos todavía no debe fallar por config) y `npm run test -w @vuelto/motor` sigue en verde.

---

## Phase 2: Foundational (bloquea todas las historias)

**Purpose**: piezas comunes de `_shared/` que usan el servicio y el handler (ADR-009).

- [X] T007 [P] Crear `fn/_shared/repositorios.ts` con `type UsuarioId = string` y las 4 interfaces de `data-model.md`: `RepositorioMediosDePago.deUsuario(usuarioId)`, `RepositorioPromociones.publicadasVigentes(categoriaId, hoy)`, `RepositorioCompras.delUsuarioEntre(usuarioId, desde, hasta)`, `RepositorioCategorias.existe(categoriaId)`, todas `Promise`. Tipos del dominio importados de `@vuelto/motor` con `import type`.
- [X] T008 [P] Crear `fn/_shared/errores.ts` con `class CategoriaInexistenteError extends Error` (`name = "CategoriaInexistenteError"`).
- [X] T009 [P] Crear `fn/_shared/http.ts`: `type CodigoError = "invalido" | "no_autenticado" | "perfil_sin_medios" | "metodo_no_permitido" | "interno"`; `respuestaJson(status, cuerpo)` con `Content-Type: application/json; charset=utf-8`; `respuestaError(codigo, campo: string | null)` que mapea a 400/401/409/405/500 según la tabla de FR-022 e incluye `campo` solo para `invalido`.
- [X] T010 [P] Crear `fn/_shared/autenticar.ts` con `interface Autenticador { usuarioDe(req: Request): Promise<UsuarioId | null> }` (la implementación real va en T024).
- [X] T011 Crear los repositorios en memoria en `fn/_shared/memoria/repositorios.ts`: una clase por interfaz de T007, construida con los datos fijos, que filtra igual que el SQL de `data-model.md` (medios por usuario; promociones por `categoriaId` y `vigencia.desde ≤ hoy ≤ vigencia.hasta`, **sin** mirar `dias`; compras por usuario y `desde ≤ fecha ≤ hasta`; categoría por id) y guarda cada llamada en un array público `llamadas` con sus argumentos (FR-025). Los datos fijos de usuario llevan `usuarioId` aparte del tipo del dominio (por ejemplo `{ usuarioId, medio }`).
- [X] T012 [P] Crear `fn/_shared/test/fabricas.ts` con fábricas de `MedioDePago`, `Promocion` y `Compra` para los tests de la capa del servidor (mismo estilo que `packages/motor/src/test/fabricas.ts`, sin importar archivos de test del motor).

**Checkpoint**: `npm run typecheck -w @vuelto/supabase` en verde.

---

## Phase 3: User Story 1 — Saber con qué pagar una compra concreta (P1) 🎯 MVP del servidor

**Goal**: `POST /recomendar` con un usuario autenticado y un body válido devuelve la `Recomendacion` del motor, calculada con los datos correctos.

**Independent Test**: `npm run test -w @vuelto/supabase` con repositorios en memoria: el 200 trae la misma recomendación que `recomendar()` directo.

### Tests (escribir primero, tienen que fallar)

- [X] T013 [P] [US1] Escribir `fn/_shared/validacion.test.ts` (FR-019): válido con `{comercio:"Kansas",categoriaId:2,monto:15000,canal:"presencial"}` y con `comercio:null`; `comercio` `"  Kansas  "` sale recortado a `"Kansas"`; inválidos con su `campo`: body no objeto o `null` o array → `"body"`; campo extra `x` → `"x"`; `categoriaId` faltante, `"2"`, `2.5` → `"categoriaId"`; `monto` `0`, `-1`, `100000000.01`, `10.123`, `NaN`, `"100"` → `"monto"`; `monto` `100000000` y `10.1` válidos; `canal` `"ambos"` o faltante → `"canal"`; `comercio` `""`, `"   "`, 101 caracteres, `5` o faltante → `"comercio"`. Orden: extra → categoriaId → monto → canal → comercio.
- [X] T014 [P] [US1] Escribir `fn/recomendar/servicio.test.ts`, casos de US1: (a) **equivalencia** (FR-024): con medios, promociones y compras fijas, `servicio.recomendar(usuarioId, compra, ahora)` es `toEqual` a `recomendar(compra, {nombreParaMostrar:null, mediosDePago, comerciosHabituales:[]}, promosFiltradas, comprasDelMes, ahora)`; (b) **escenario US1-1**: Galicia crédito Visa, promo 20% Gastronomía tope mensual $12.000, 2 compras del mes con `descuentoObtenido` 1000 → `mejor.ahorroEstimado === 3000`, `topeRestanteTrasCompra === 7000`, `base` `{2, 0}`; (c) **argumentos** (FR-025): `ahora = 2026-10-24T15:00:00Z` → `publicadasVigentes(2, "2026-10-24")` y `delUsuarioEntre("u1", "2026-10-01", "2026-10-24")`, y medios pedidos para `"u1"`; (d) **22:00 del último día del mes**: `ahora = 2026-11-01T01:00:00Z` → `hoy "2026-10-31"`, compras `"2026-10-01"`–`"2026-10-31"`; (e) **aislamiento**: datos de `"u2"` en los repos en memoria no aparecen en el resultado de `"u1"`; (f) **rubro inexistente**: `existe` → `false` lanza `CategoriaInexistenteError` sin pedir medios, promociones ni compras.
- [X] T015 [P] [US1] Escribir `fn/recomendar/handler.test.ts`, camino feliz: `POST` con `Autenticador` falso que devuelve `"u1"`, body válido y `reloj` fijo → 200, `Content-Type` JSON y cuerpo igual al de `servicio.recomendar` con el mismo `ahora`; el `reloj` se llama una sola vez por pedido.

### Implementación

- [X] T016 [US1] Implementar `fn/_shared/validacion.ts`: `validarCompraPropuesta(body: unknown): ResultadoValidacion` (`{ ok: true; compra: CompraPropuesta } | { ok: false; campo: string }`) según `data-model.md`. Dos decimales: `Number.isInteger(Math.round(monto * 100))` y `Math.abs(monto * 100 - Math.round(monto * 100)) < 1e-6`. Hace pasar T013.
- [X] T017 [US1] Implementar `fn/recomendar/servicio.ts`: `class ServicioRecomendacion` con constructor `(medios, promociones, compras, categorias)` (interfaces de T007) y `async recomendar(usuarioId, compra, ahora): Promise<Recomendacion>`: (1) si `!(await categorias.existe(compra.categoriaId))` lanza `CategoriaInexistenteError`; (2) `hoy = fechaArgentina(ahora)`, `inicioDeMes = hoy.slice(0, 8) + "01"`; (3) pide en paralelo medios, promociones y compras; (4) arma el `Perfil` con `nombreParaMostrar: null` y `comerciosHabituales: []`; (5) devuelve `recomendar(...)` sin tocar el resultado. `PerfilSinMediosError` se propaga. Hace pasar T014.
- [X] T018 [US1] Implementar `fn/recomendar/handler.ts`: `crearHandlerRecomendar({ autenticador, crearServicio, reloj })` donde `crearServicio(req: Request): ServicioRecomendacion` y `reloj(): Date`; devuelve `async (req) => Response`. Orden: método → `usuarioDe(req)` → `req.json()` → `validarCompraPropuesta` → `reloj()` → `crearServicio(req).recomendar(...)` → 200. Hace pasar T015 (los errores se completan en US3).
- [X] T019 [US1] Crear `fn/recomendar/deno.json` con `{"imports": {"@vuelto/motor": "../../../packages/motor/src/index.ts"}}` (research R1).
- [X] T020 [US1] Crear `fn/recomendar/index.ts` (composition root, sin lógica): lee `SUPABASE_URL` y `SUPABASE_ANON_KEY` de `Deno.env`, crea el `Autenticador` de T024 y `Deno.serve(crearHandlerRecomendar({ autenticador, crearServicio, reloj: () => new Date() }))`. `crearServicio` arma el cliente de Supabase con el header `Authorization` del pedido y los repositorios de Supabase (Phase 6); hasta que existan, deja un `TODO(#34)` que responde 500, sin repositorios en memoria en producción.

**Checkpoint**: `npm run test -w @vuelto/supabase` en verde para T013–T015.

---

## Phase 4: User Story 3 — Saber qué pasa cuando no se puede calcular (P2, servidor)

**Goal**: cada error responde el código y el cuerpo de FR-022, sin filtrar datos.

**Independent Test**: `handler.test.ts` cubre cada fila de la tabla de `contracts/recomendar.md`.

### Tests (escribir primero)

- [X] T021 [P] [US3] Ampliar `fn/recomendar/handler.test.ts`: `GET` → 405 `metodo_no_permitido`; `Autenticador` que devuelve `null` → 401 `no_autenticado` y `crearServicio` nunca se llama; body no JSON → 400 `campo: "body"`; `monto: 0` → 400 `campo: "monto"`; servicio que lanza `CategoriaInexistenteError` → 400 `campo: "categoriaId"`; servicio que lanza `PerfilSinMediosError` → 409 `perfil_sin_medios`; servicio que lanza `new Error("relation \"compras\" ... valor secreto")` → 500 `{ "error": "interno" }` exacto, y el cuerpo no contiene `"secreto"`; espiar `console.error`/`console.log` y verificar que solo reciben el `name` del error, nunca el body ni el mensaje (FR-023).
- [X] T022 [P] [US3] Escribir `fn/_shared/autenticar.test.ts` para `AutenticadorSupabase` con un cliente falso: sin header `Authorization` → `null` sin llamar a `getUser`; `Bearer <anon>` donde `getUser` devuelve `{ data: { user: null }, error: {...} }` → `null` (FR-018, caso anon key); `getUser` que lanza → `null`; token válido → `"u1"`; verifica que a `getUser` se le pasa el token sin el prefijo `Bearer `.

### Implementación

- [X] T023 [US3] Completar `fn/recomendar/handler.ts` con el mapeo de errores de FR-022 usando `respuestaError` de T009: `instanceof CategoriaInexistenteError` → 400 `categoriaId`; `instanceof PerfilSinMediosError` → 409; cualquier otro → `console.error("recomendar:", error instanceof Error ? error.name : "desconocido")` y 500. Hace pasar T021.
- [X] T024 [US3] Implementar `AutenticadorSupabase` en `fn/_shared/autenticar.ts`, tipado contra una interfaz estructural mínima `ClienteAuth { auth: { getUser(jwt: string): Promise<{ data: { user: { id: string } | null }; error: unknown }> } }` (sin depender de `@supabase/supabase-js` en Node, plan). Hace pasar T022.

**Checkpoint**: todas las filas de la tabla de errores cubiertas; `npm run test -w @vuelto/supabase` en verde.

---

## Phase 5: User Story 2 — Ver alternativas y descartadas (P2, servidor)

**Goal**: el servidor deja pasar alternativas y descartadas tal cual, y su filtro previo no esconde las promos de otro día.

- [X] T025 [US2] Ampliar `fn/recomendar/servicio.test.ts`: (a) promo del rubro vigente que vale solo los viernes, consultada un miércoles → aparece en `descartadas` con `causa: "dia"` (el filtro previo no usa `dias`, spec B1); (b) promo de otro rubro y promo vencida → no aparecen en ningún lado (filtradas antes del motor); (c) dos medios con promo → `alternativas` en el mismo orden que `recomendar()` directo; (d) ninguna aplica → `mejor: null`, `alternativas: []`. Si alguno falla, corregir el filtro de `fn/_shared/memoria/repositorios.ts` o `servicio.ts`, nunca el resultado del motor.

---

## Phase 6: Acceso real a Postgres — **BLOQUEADA por #34** (esquema de Supabase con RLS)

**Purpose**: reemplazar los repositorios en memoria por los reales. Arranca cuando la #34 fije tablas, columnas y policies.

- [ ] T026 [US1] Cargar la skill `supabase-postgres-best-practices`. Implementar en `fn/_shared/supabase/repositorios.ts` las 4 interfaces de T007 con el cliente de Supabase del usuario (anon key + JWT, nunca service role, FR-028), mapeando columnas `snake_case` de la #34 a los tipos del dominio según `data-model.md` §Mapeo. Filtro de promociones solo por `categoria_id` y fechas de vigencia (nunca `dias`); `hoy` y `desde` llegan como parámetro (nunca `current_date`).
- [ ] T027 [US1] Conectar los repositorios de T026 en `fn/recomendar/index.ts` (sacar el `TODO(#34)` de T020).
- [ ] T028 [P] [US1] Crear la migración `supabase/migrations/<timestamp>_comercios_corpus.sql` con la vista `comercios_corpus` (`security_invoker = true`): `select distinct comercio, categoria_id from promociones where comercio is not null and vigencia_hasta >= (now() at time zone 'America/Argentina/Buenos_Aires')::date` (FR-030, research R10). `grant select` a `authenticated`.
- [ ] T029 [US1] Prueba manual con `supabase start` + `supabase functions serve recomendar` según `quickstart.md`: 200 con un usuario de prueba, 401 con la anon key, 409 con un usuario sin medios.
- [ ] T030 Verificar que `supabase functions deploy recomendar --use-api` sigue disponible en la CLI (research R1) y documentar el resultado en `quickstart.md`.

---

## Phase 7: Pantalla «¿Con qué pago?» — **BLOQUEADA por #39 (app base), #40 (login) y #41 (perfil)**

**Purpose**: la pantalla Expo que consume `contracts/recomendar.md`. Nunca importa `@vuelto/motor` (FR-027).

- [ ] T031 [US1] Crear la pantalla en `apps/mobile/app/(tabs)/con-que-pago.tsx` (ruta final según la navegación de la #39): buscador de comercios sobre `comercios_corpus` (texto parcial, sin mayúsculas, acentos ni espacios de más; cada resultado con su rubro, FR-002), selector de las 13 categorías desde la tabla `categorias`, monto (`keyboardType="decimal-pad"`, `> 0`, `≤ 100.000.000`, 2 decimales) y canal (presencial por defecto). "Simular" deshabilitado hasta tener comercio o rubro y monto válido (FR-003). Sin promos antes de simular (FR-004).
- [ ] T032 [US1] Crear `apps/mobile/src/recomendar/cliente.ts`: `pedirRecomendacion(compra)` con `supabase.functions.invoke("recomendar", { body })`, timeout de 15 s con `AbortController` y un contador de pedido para descartar respuestas viejas (FR-010); clasifica la respuesta según la tabla "Cómo lo interpreta la app" de `contracts/recomendar.md`.
- [ ] T033 [US1] Mostrar el resultado (FR-006, FR-007): banco y tarjeta del medio, ahorro, título de la promo, motivo, y tope con base: "≈$X, según N compras registradas" (+ cuántas con reintegro estimado), "sin compras registradas que lo sostengan" con base `{0,0}`, "la promo no informa tope" con `null`. Formateo de pesos propio, sin `Intl` (research R9). Resolver nombres con los datos del perfil y releer los ids desconocidos; si no se resuelven, error de FR-016.
- [ ] T034 [US1] Ocultar el resultado al cambiar cualquier dato de la compra (FR-010).
- [ ] T035 [US2] Alternativas en el orden recibido y sección plegada de descartadas con título, motivo y base si `causa === "tope_agotado"`; "Ninguno de tus medios tiene promo acá hoy" con `mejor: null` (FR-008, FR-009).
- [ ] T036 [US3] Estados de error: sin conexión (FR-013), sin medios con acceso a Perfil y "Simular" deshabilitado (FR-014), sesión vencida conservando lo cargado (FR-015), error genérico con "Reintentar" (FR-016).
- [ ] T037 [US4] Botón "Pagué con esto" en cada opción, que navega al registro de la #44 con comercio, rubro, monto, medio y promo de esa opción (FR-012). Si la #44 no está, el botón queda oculto.
- [ ] T038 Verificar `grep -rn "@vuelto/motor" apps/mobile` → 0 resultados y que `apps/mobile/package.json` no lo tiene (FR-027, SC-006).

---

## Phase 8: Polish & cierre

- [X] T039 [P] Completar `docs/architecture/02-api-routes.md` con el endpoint `recomendar` (link a `contracts/recomendar.md`) y la estructura de `supabase/functions/_shared/`.
- [X] T040 Correr `rules-guardian` (toca el motor y una Edge Function), `/code-review` y `test-runner`; corregir lo que encuentren.
- [X] T041 Agregar la entrada de la sesión en `docs/bitacora-prompts.md`.
- [ ] T042 Antes de la Sprint Review: verificar que el corpus sembrado (#35) solo tiene topes mensuales o sin tope (FR-029).

---

## Dependencies & Execution Order

- **Setup (T001–T006)** → **Foundational (T007–T012)** → **US1 servidor (T013–T020)** → **US3 servidor (T021–T024)** y **US2 servidor (T025)**, en cualquier orden entre ellas.
- **Phase 6** depende de la #34 y de US1/US3 servidor.
- **Phase 7** depende de #39, #40, #41 y del endpoint desplegado (Phase 6). T037 depende además de la #44.
- **Polish**: T039–T041 se pueden hacer al cerrar las fases 1–5 (PR parcial); T042 antes de la Sprint Review.

### Paralelo

```text
Phase 1: T004, T005, T006 juntas (después de T003)
Phase 2: T007, T008, T009, T010, T012 juntas; T011 después de T007
US1:     T013, T014, T015 juntas (tests); luego T016 → T017 → T018
US3:     T021, T022 juntas; luego T023 y T024
```

## Implementation Strategy

1. **Ahora (esta rama)**: fases 1 a 5 y T039–T041. Resultado: la Edge Function completa y testeada, salvo el acceso a Postgres. Se puede mergear sola: no rompe nada y deja `_shared/` listo para #45, #48 y #54.
2. **Cuando cierre la #34**: Phase 6, deploy y prueba con `curl`.
3. **Cuando cierren #39, #40 y #41**: Phase 7 y cierre de la issue (`Closes #43`). El PR de esta rama usa `Refs #43`, no `Closes`.
