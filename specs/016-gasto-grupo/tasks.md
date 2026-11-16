---
description: "Tareas de la spec 016: gasto en grupo con contactos vinculados"
---

# Tasks: Gasto en grupo — quién de nosotros paga, con contactos vinculados

**Input**: `specs/016-gasto-grupo/` (spec.md, plan.md, research.md, data-model.md, contracts/, quickstart.md)

**Tests**: obligatorios. La constitución §VI exige test-first en el motor, y el PO pidió "tests del motor primero". Cada capa escribe sus tests antes del código: Vitest en el motor, pgTAP antes de la migración, Vitest del handler, el servicio y la respuesta antes de la Edge Function.

**Organization**: por historia (US1 motor, US2 contactos, US3 recomendación de grupo). US3 depende de US1 y US2.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: puede ir en paralelo (otro archivo, sin depender de una tarea incompleta).
- **[Story]**: US1, US2 o US3.

---

## Phase 1: Setup

**Purpose**: dejar el entorno listo y la base verde antes de tocar nada.

- [X] T001 Correr `npm run lint`, `npm run typecheck` y `npm run test` en la raíz sobre la rama sin cambios y anotar el resultado de base (si algo ya falla en `main`, se dice en el PR).
- [X] T002 [P] Crear `supabase/functions/.env.example` con `GRUPO_CLAVE_SERVIDOR=` y un comentario que remita a `specs/016-gasto-grupo/quickstart.md` §Configuración; confirmar que `supabase/functions/.env` está en `.gitignore` (sumarlo si no).
- [X] T003 [P] Excluir `functions/_shared/supabase/**` de `supabase/tsconfig.json` (`exclude`) y de la cobertura en `supabase/vitest.config.ts`, con el mismo comentario que ya justifica `functions/*/index.ts` (lo chequea `deno check`, research R8).

---

## Phase 2: Foundational (bloquea US1 y US3)

**Purpose**: un solo cálculo de consumo de topes para la compra individual y la de grupo (FR-003, research R7).

- [X] T004 Agregar `ConsumoDeTope { id: string; promocionId: string | null; fecha: FechaISO; monto: number; descuentoObtenido: number | null }` en `packages/motor/src/tipos.ts`, con su comentario ("Lo que el motor necesita de una compra para los topes. `Compra` lo cumple").
- [X] T005 Cambiar las firmas para que acepten `readonly ConsumoDeTope[]` en lugar de `Compra[]`: `calcularSaldos` y lo que use en `packages/motor/src/tope.ts`, `recomendar` (`comprasDelPeriodo`) en `packages/motor/src/recomendar.ts` y `estimarTopes` en `packages/motor/src/estimar.ts`. No cambiar ningún test existente.
- [X] T006 Agregar un test en `packages/motor/src/tope.test.ts` que llame a `calcularSaldos` con objetos `ConsumoDeTope` literales (sin los demás campos de `Compra`) y obtenga el mismo saldo que con compras completas.
- [X] T007 Correr `npm run test -w @vuelto/motor`, `npm run typecheck` y `npm run test -w @vuelto/supabase`: todo verde sin tocar los tests existentes (la app y `recomendar/servicio.ts` siguen pasando `Compra[]`).

**Checkpoint**: el motor acepta el consumo reducido; nada más cambió.

---

## Phase 3: User Story 1 - El motor decide quién paga y cómo se divide (Priority: P1) 🎯 MVP

**Goal**: `recomendarGrupo` y `dividir`, puros y deterministas (FR-001 a FR-010).

**Independent Test**: `npm run test -w @vuelto/motor` con fotos de grupo literales; cubre los 18 escenarios de US1 y SC-001 a SC-003.

### Tests for User Story 1 ⚠️ (escribirlos primero y verlos fallar)

- [X] T008 [P] [US1] Escribir `packages/motor/src/division.test.ts` para `dividir(total, n)`: $10.000/3 → [3334, 3333, 3333] (US1-11); $36.000/4 → [9000×4] (US1-12); $8.000/3 → [2667, 2667, 2666] (US1-13); total 0 → todos 0 (US1-16); la suma siempre es el total y ninguna parte difiere de otra en más de 1 (SC-002), probado con un barrido de totales 0..500 y n 2..12; `n < 1` o un total no entero o negativo lanzan error.
- [X] T009 [P] [US1] Escribir `packages/motor/src/grupo.test.ts` con fábricas propias (o las de `packages/motor/src/test/fabricas.ts`) y un escenario por cada uno de US1-1 a US1-18. Cubrir en particular: tope ajeno agotado (US1-1, SC-003); base `sin_compras` con tope completo (US1-2); 10 compras de otro rubro dan `sin_compras` (US1-3); `sin_tope_informado` y `tope_por_compra` (US1-4); sin cuenta nunca paga (US1-5); empate gana quien pide (US1-6); empate entre contactos gana el menor id por `compararIds` en minúsculas (US1-7); $5.030 de quien pide contra $5.049 calculado de un contacto (mostrado $5.000) → gana quien pide (US1-8); $40 de un contacto → sin reintegro (US1-9); el reintegro de quien pide redondea al peso con los 50 centavos para arriba ($2.000,50 → $2.001, US1-13); nadie con al menos $1 → `quienPaga: null`, `reintegro: null`, se reparte el monto completo (US1-14); contacto sin medios → `opcion: null`, sin error (US1-15); reintegro mayor que el monto → `total: 0` (US1-16); `GrupoInvalidoError` con cada `motivo` (`pocos_integrantes`, `sin_quien_pide`, `varios_piden`, `repetidos`, `demasiados` con 13, `monto` con 0, negativo o 10.5) (US1-17); semana que cruza de mes con tope semanal (US1-18); `queDa` nunca contiene «tope», «queda» ni «sin tope disponible» para un contacto; `propia` viene solo en quien pide.
- [X] T010 [P] [US1] En `packages/motor/src/grupo.test.ts`, la propiedad de SC-001: 100 permutaciones de un grupo de 6 (quien pide, 3 contactos, 2 sin cuenta, con un empate a propósito) con un PRNG con semilla fija dentro del test (sin `Math.random`), todas con `toEqual` a la primera respuesta, incluido quién recibe el $1 extra (US1-10).

### Implementation for User Story 1

- [X] T011 [P] [US1] Agregar a `packages/motor/src/tipos.ts` los tipos de `data-model.md` §Motor, con sus comentarios: `CompraDeGrupo`, `IntegranteDeGrupo` (`posicion` "entero ≥ 0"), `BaseDeGrupo`, `OpcionDeGrupo` (`reintegroMostrado` "≥ 1, pesos enteros (escalón $100 si no es quien pide)"), `ResultadoDeIntegrante` y `RecomendacionDeGrupo` (`total` "max(0, monto − reintegro)").
- [X] T012 [P] [US1] Agregar `GrupoInvalidoError` a `packages/motor/src/errores.ts`, con `motivo: "pocos_integrantes" | "sin_quien_pide" | "varios_piden" | "repetidos" | "demasiados" | "monto"` y el comentario que justifica la clase (ADR-009, igual que `PerfilSinMediosError`).
- [X] T013 [US1] Implementar `dividir(total, n)` en `packages/motor/src/division.ts`: las primeras `total % n` partes llevan +1; valida enteros. T008 pasa.
- [X] T014 [US1] Implementar `recomendarGrupo(compra, integrantes, promociones, ahora)` en `packages/motor/src/grupo.ts` según research R7: validar (FR-010); ordenar (quien pide, contactos por `compararIds(id.toLowerCase())`, sin cuenta por `posicion`); por cada integrante con cuenta, sin medios → `opcion: null`; si no, `recomendar(compra, { nombreParaMostrar: null, mediosDePago, comerciosHabituales: [] }, promociones, consumos, ahora)`; redondeo en centavos enteros (`Math.floor((c + 50) / 100)` al peso; `Math.floor((c + 5000) / 10000) * 100` para el escalón); `queDa = textoPromo(promo, false, false)` de la promo principal; base según research R7; elegir con FR-004 (mínimo $1); `total = Math.max(0, monto − reintegro)`; `dividir(total, n)` en el orden del desempate. T009 y T010 pasan.
- [X] T015 [US1] Exportar `recomendarGrupo`, `dividir`, `GrupoInvalidoError` y los tipos nuevos desde `packages/motor/src/index.ts`, y sumar un caso a `packages/motor/src/index.test.ts` si ese archivo verifica la lista de exportaciones.
- [X] T016 [US1] Correr `npm run test -w @vuelto/motor` (con el umbral de cobertura del paquete), `npm run lint` y `npm run build -w @vuelto/motor`.

**Checkpoint**: el motor de grupo está completo y probado sin base ni red.

---

## Phase 4: User Story 2 - Vincular, ver y quitar contactos de verdad (Priority: P2)

**Goal**: invitaciones y vínculos reales en Supabase y en la app (FR-011 a FR-020).

**Independent Test**: `supabase test db` con `contactos.test.sql`, más los tests de la app con el repositorio en memoria. En un dispositivo, el recorrido 1 a 5 y 8 a 10 de `quickstart.md` §4.

### Tests for User Story 2 ⚠️

- [X] T017 [US2] Escribir `supabase/tests/database/contactos.test.sql` (pgTAP, en una transacción con `rollback`, usuarios A, B, C con perfil y uno D sin nombre, al estilo de `rls.test.sql`), con la parte de vínculos e invitaciones: las tablas `invitaciones` y `contactos` existen con RLS; `anon` no tiene ningún privilegio sobre ellas ni `execute` sobre ninguna función de contactos; `authenticated` no puede `insert`/`update` en ninguna de las dos; `crear_invitacion` devuelve un token de 24 caracteres `^[A-Za-z0-9_-]{24}$` y `vence_en` ≈ now()+24h, guarda solo `sha256(token)` (el token no aparece en ninguna columna), y una segunda llamada borra la anterior sin usar; D (sin nombre) recibe el error con `hint = 'sin_nombre'`; `ver_invitacion` da `valida` (con nombre y vencimiento), `propia`, `vencida` (forzando `vence_en`), `usada`, `ya_contacto` e `inexistente` (sin nombre, también con un token mal formado); `aceptar_invitacion` crea un solo par ordenado y marca `usada_en`; aceptar dos veces la misma da `usada` (US2-10); las invitaciones cruzadas dejan un solo vínculo, el segundo recibe `ya_contacto` y su invitación sigue sin usar (US2-11); D no puede aceptar (`sin_nombre`); A ve su vínculo en `mis_contactos` con el nombre de B y C no lo ve; A no lee la invitación de B; `quitar_contacto` lo borra para los dos, es idempotente y C no puede borrar el vínculo A-B; las funciones `security definer` están en `contactos_privado` y tienen `search_path` fijado (`proconfig`).
- [X] T018 [P] [US2] Escribir `apps/mobile/src/grupo/token.test.ts` para `tokenDeInvitacion(texto)`: acepta `vuelto://i/<t>`, `exp://192.168.0.5:8081/--/i/<t>`, el token solo y con espacios alrededor; rechaza (devuelve `null`) un texto vacío, un link de otro camino, un token de 23 o 25 caracteres o con caracteres fuera de `[A-Za-z0-9_-]`.
- [X] T019 [P] [US2] Escribir los tests del slice y los thunks de contactos en `apps/mobile/src/store/contactos.test.ts`, con el repositorio en memoria: arranca vacío (US2-12); `cargarContactos` reemplaza la lista y guarda `cuentaId`; un error deja la lista como estaba y `estado: "error"`; `quitarContacto` saca al contacto solo si el servidor confirma (US2-15); `aceptarInvitacion` agrega el contacto cuando el estado es `aceptada`; `sesionCerrada` vacía todo.
- [X] T020 [P] [US2] Extender `apps/mobile/src/store/persistencia.test.ts`: se guarda `contactos: { cuentaId, lista }`; al rehidratar con otra cuenta en sesión la lista se descarta (US2-16); el grupo en armado nunca se guarda. Reemplazar la aserción de la línea ~64 que fijaba que los contactos no se persistían (G-03).

### Implementation for User Story 2 — base

- [X] T021 [US2] Crear `supabase/migrations/20261115000001_contactos.sql` según `data-model.md` §Base y `contracts/rpc-contactos.md`: tabla `invitaciones` (`token_hash bytea not null unique`, `vence_en ... default now() + interval '24 hours'`, `check (vence_en > creada_en)`, índice único parcial `invitaciones_una_vigente (emisor) where usada_en is null`), tabla `contactos` (PK `(usuario_a, usuario_b)`, `check (usuario_a < usuario_b)`, índice en `usuario_b`), las dos con RLS y policies en la misma migración y los grants de `data-model.md`; schema `contactos_privado` (`usage` solo a `authenticated`); funciones `security definer` con `set search_path = ''` (`crear_invitacion`, `ver_invitacion`, `aceptar_invitacion` con `for update` y `on conflict do nothing`, `mis_contactos`), con `execute` revocado a `public` y `anon` y dado a `authenticated`; envoltorios `security invoker` `language sql` en `public` con la misma firma; `public.quitar_contacto(p_contacto uuid)` `security invoker`. Comentarios en español que remitan a la spec y a ADR-008.
- [X] T022 [US2] Avisar en el chat que `supabase db reset` cambia la base local compartida y, con el OK, correr `supabase db reset` y `supabase test db`: pasan `contactos.test.sql` (parte de vínculos) y los demás tests, `estructura.test.sql` incluido, sin cambios.

### Implementation for User Story 2 — app

- [X] T023 [P] [US2] Implementar `tokenDeInvitacion` y `linkDeInvitacion(token)` (con `Linking.createURL('i/' + token)` de `expo-linking`) en `apps/mobile/src/grupo/token.ts`. T018 pasa.
- [X] T024 [P] [US2] Crear la interfaz `RepositorioContactos` (`listar`, `crearInvitacion`, `verInvitacion`, `aceptarInvitacion`, `quitar`; `recomendarGrupo` se suma en US3) y su implementación sobre Supabase con `.rpc(...)` en `apps/mobile/src/grupo/repositorio.ts`. Mapea `hint = 'sin_nombre'` a un error propio; ninguna función manda el token por la dirección.
- [X] T025 [P] [US2] Crear `apps/mobile/src/grupo/repositorio-memoria.ts` con el mismo comportamiento de estados que la base (para tests y para la app sin Supabase).
- [X] T026 [US2] Reescribir `apps/mobile/src/store/contactos.ts`: estado `{ cuentaId, lista, estado }` que arranca vacío (sin `fixtures.contactos`, G-02), thunks `cargarContactos`, `quitarContacto` y `aceptarInvitacion` que reciben el repositorio (como los thunks de `sync/`), y `sesionCerrada` que vacía. Mover el grupo en armado a un slice aparte no persistido (`apps/mobile/src/store/grupo.ts`) con los sin cuenta como `{ posicion, nombre }`. Actualizar `apps/mobile/src/store/index.ts`. T019 pasa.
- [X] T027 [US2] Persistir `contactos: { cuentaId, lista }` (implementado en su propia clave, `vuelto.contactos.v1`, desde `apps/mobile/src/store/contactos.ts`; research R10) en lugar de `apps/mobile/src/store/persistencia.ts` y descartarlo al rehidratar si `cuentaId` no es el usuario de la sesión. T020 pasa.
- [X] T028 [US2] Crear `apps/mobile/src/hooks/use-contactos.ts` (carga al entrar una cuenta y al volver a primer plano, como `use-sincronizacion.ts`) y montarlo donde se montan los otros hooks de arranque (`apps/mobile/src/app/_layout.tsx`); en `apps/mobile/src/app/contactos/index.tsx`, recargar al enfocar (`useFocusEffect`).
- [X] T029 [US2] Actualizar `apps/mobile/src/data/contracts.ts`: `EstadoInvitacion` suma `"inexistente"` y `"sin-nombre"`; `VistaInvitacion` suma `venceEn: string | null`; `Invitacion` lleva el `link` armado con `linkDeInvitacion` y el `venceEn` real.
- [X] T030 [US2] `apps/mobile/src/app/contactos/invitar.tsx`: crear la invitación con el repositorio; mostrar el vencimiento real; «Generar otro link» llama de nuevo (US2-2); error con «Reintentar» (G-05); sin nombre → mensaje y botón a Perfil (US2-3).
- [X] T031 [US2] `apps/mobile/src/app/i/[token].tsx`: `verInvitacion` y `aceptarInvitacion` con el repositorio; texto para `inexistente` («Esta invitación no es válida», sin nombre) y para `sin-nombre`; vencimiento real en lugar de «Vence en 23 h» fijo; error con «Reintentar» (G-05); sumar a «qué se puede deducir» que repetir consultas deja deducir más sobre el uso de los topes (D9).
- [X] T032 [US2] `apps/mobile/src/app/contactos/quitar.tsx`: `quitarContacto` con `try/catch`, error con «Reintentar», y la lista local cambia solo si el servidor confirmó (US2-15).
- [X] T033 [US2] Crear `apps/mobile/src/app/contactos/pegar.tsx` («Tengo una invitación»): campo de texto, botón «Pegar» con `expo-clipboard`, validación con `tokenDeInvitacion` sin red y `router.replace('/i/<token>')`. Registrar la ruta en `apps/mobile/src/app/_layout.tsx` (encabezado nativo con volver, spec 006 US5-11) y sumar el acceso en `apps/mobile/src/app/contactos/index.tsx`.
- [X] T034 [US2] Sacar de `apps/mobile/src/data/api.ts` `crearInvitacion`, `verInvitacion`, `aceptarInvitacion` y `quitarContacto` con sus tokens de ejemplo, y de `apps/mobile/src/data/fixtures.ts` `invitacionPropia` y `contactos` (el escenario de demo deja de cargarlos); ajustar los tests que los usaban (`apps/mobile/src/data/api.test.ts`, `apps/mobile/src/store/pantallas.test.ts` y los que aparezcan).
- [X] T035 [US2] Sumar a la integración de la app (`apps/mobile/src/grupo/repositorio-supabase.integracion.test.ts`, con la configuración de `vitest.integracion.config.mts`) el ciclo crear → ver → aceptar → listar → quitar entre dos usuarios contra la base local.
- [X] T036 [US2] Correr `npm run test -w @vuelto/mobile`, `npm run typecheck` y `npm run lint`.

**Checkpoint**: los contactos existen de verdad; el grupo todavía usa la simulación.

---

## Phase 5: User Story 3 - La recomendación de grupo con datos reales (Priority: P3)

**Goal**: la Edge Function `recomendar-grupo` y la app conectada (FR-021 a FR-031).

**Independent Test**: Vitest de la Edge Function, pgTAP de la clave, `deno check`, y en la app el recorrido 6, 7 y 9 de `quickstart.md` §4.

### Tests for User Story 3 ⚠️

- [X] T037 [US3] Agregar a `supabase/tests/database/contactos.test.sql` la parte de `datos_de_contactos` (con `vault.create_secret('clave-de-prueba', 'recomendar_grupo_clave')` dentro de la transacción): con la clave correcta y un contacto vinculado, devuelve `id`, `nombre`, `medios` (con `banco_nombre`) y `consumos` solo de compras con `promocion_id` no nulo en el rango, sin comercio, origen, texto ni id; con una clave incorrecta o sin la clave → `42501` (SC-005); sin el secreto cargado → `42501`; un id no vinculado y uno inexistente dan el mismo error con `hint = 'no_vinculado'` (SC-004); rango invertido o de más de 40 días → `22023`; después de `quitar_contacto`, el mismo pedido da `no_vinculado` (SC-007).
- [X] T038 [P] [US3] Escribir `supabase/functions/_shared/filas.test.ts` para `filaAPromocion`, `filaAMedio` y `filaAConsumo` (`numeric` como texto o número, nulos explícitos, fila inválida → `null`), siguiendo los casos de `apps/mobile/src/sync/mapeo.test.ts` que apliquen.
- [X] T039 [P] [US3] Escribir `supabase/functions/recomendar-grupo/validacion.test.ts` con cada fila de la tabla de validación de `contracts/recomendar-grupo.md` (monto entero > 0, canal, `categoriaId` entero, `contactos` uuid sin repetidos, `sinCuenta` entero ≥ 0, tamaño entre 2 y 12), devolviendo el `campo` exacto.
- [X] T040 [P] [US3] Escribir `supabase/functions/recomendar-grupo/respuesta.test.ts`: con un `RecomendacionDeGrupo` y los `DatosDeContacto` armados a mano (un contacto con tope 10.000, restante 3.700, 6 compras y dos medios, uno no recomendado), la respuesta tiene la forma del contrato, el contacto que no paga tiene `medio: null` y `queDa: null`, la base de un contacto no tiene `comprasRegistradas` ni `periodo`, y una búsqueda recursiva por todo el JSON (claves y textos) no encuentra «10000», «10.000», «3700», «3.700», «6 compras», el id ni el banco del medio no recomendado (SC-008); `vos` trae la base completa; la suma de las `parte` es `total`.
- [X] T041 [P] [US3] Escribir `supabase/functions/recomendar-grupo/servicio.test.ts` con repositorios en memoria y reloj fijo: junta los datos de quien pide (por RLS) y de los contactos con `desde = min(inicio del mes, inicio de la semana)` y `hasta = hoy` (semana que cruza de mes); pide `porIds` de las promos referenciadas por los consumos de todos; arma ids opacos para los consumos de los contactos (`c1`, `c2`…); da el mismo resultado que llamar a `recomendarGrupo` con la misma foto; `ContactoNoVinculadoError` del repositorio se propaga; un rubro inexistente lanza `CategoriaInexistenteError`.
- [X] T042 [P] [US3] Escribir `supabase/functions/recomendar-grupo/handler.test.ts` al estilo de `supabase/functions/recomendar/handler.test.ts`: 405, 401 (sin header, Auth rechaza), 500 (Auth caído, error desconocido, clave mal configurada), 400 con `campo` (body no JSON y la validación), 409 `contacto_no_vinculado`, 200 con la respuesta; el `console.error` solo recibe el `name` del error (FR-034).
- [X] T043 [P] [US3] Escribir `apps/mobile/src/grupo/vista.test.ts`: de la respuesta del servidor más los nombres de los sin cuenta (por `posicion`) a la `RecomendacionGrupo` de la pantalla: título («Te conviene pagar vos» / «Te conviene que pague Lucía» / «Nadie del grupo tiene reintegro en esta compra»), medio nombrado con `medioVista`, «≈», la base en palabras para los cuatro tipos (incluido «Lucía no tiene compras registradas con esta promo: sin base»), «Sin cuenta: no conocemos su tope», filas identificadas por id con dos contactos del mismo nombre (US3-7), «pone ≈$X», el día evaluado y el texto de que el reintegro le llega a quien paga.

### Implementation for User Story 3 — base y Edge Function

- [X] T044 [US3] Agregar a `supabase/migrations/20261115000001_contactos.sql` `contactos_privado.datos_de_contactos(p_contactos uuid[], p_clave text, p_desde date, p_hasta date)` según `contracts/rpc-contactos.md` (clave contra `vault.decrypted_secrets` antes de leer nada, rango 0..40 días, todos vinculados o `no_vinculado`, consumos solo con `promocion_id` no nulo) y su envoltorio en `public`. Correr `supabase db reset` y `supabase test db` (avisando antes, como T022): T037 pasa.
- [X] T045 [P] [US3] Implementar `supabase/functions/_shared/filas.ts`. T038 pasa.
- [X] T046 [P] [US3] Sumar a `supabase/functions/_shared/repositorios.ts` `DatosDeContacto` y `RepositorioContactos.datosDe(ids, desde, hasta)`; a `supabase/functions/_shared/errores.ts`, `ContactoNoVinculadoError`; a `supabase/functions/_shared/http.ts`, el código `contacto_no_vinculado` con status 409; y la implementación en memoria en `supabase/functions/_shared/memoria/repositorios.ts`.
- [X] T047 [US3] Implementar `supabase/functions/recomendar-grupo/validacion.ts` (T039) y `supabase/functions/recomendar-grupo/respuesta.ts` con la lista blanca de FR-021 (T040).
- [X] T048 [US3] Implementar `ServicioGrupo` en `supabase/functions/recomendar-grupo/servicio.ts` (research R8). T041 pasa.
- [X] T049 [US3] Implementar `crearHandlerRecomendarGrupo` en `supabase/functions/recomendar-grupo/handler.ts` (dependencias: autenticador, `crearServicio(req)`, reloj), mapeando `GrupoInvalidoError` y la validación a 400, `ContactoNoVinculadoError` a 409 y todo lo demás a 500 con solo el `name` en el registro. T042 pasa.
- [X] T050 [US3] Implementar los repositorios reales en `supabase/functions/_shared/supabase/` (medios, promociones, compras, categorías y contactos sobre `@supabase/supabase-js`, con el cliente creado con el `Authorization` del pedido y la clave solo en `datos_de_contactos`; el error con `hint = 'no_vinculado'` → `ContactoNoVinculadoError`), más `supabase/functions/recomendar-grupo/index.ts` (falla al arrancar si falta `SUPABASE_URL`, `SUPABASE_ANON_KEY` o `GRUPO_CLAVE_SERVIDOR`) y `supabase/functions/recomendar-grupo/deno.json` (mismo import map que `recomendar`).
- [X] T051 [US3] Correr `npm run test -w @vuelto/supabase` (umbral 90%), `npm run typecheck` y `deno check --no-lock --config supabase/functions/recomendar-grupo/deno.json supabase/functions/recomendar-grupo/index.ts`.

### Implementation for User Story 3 — app

- [X] T052 [US3] Sumar `recomendarGrupo(pedido)` a `RepositorioContactos` (`apps/mobile/src/grupo/repositorio.ts`) con `functions.invoke('recomendar-grupo', { body, timeout: 15000 })`, mapeando 400/409/401/500 y el timeout a los casos de FR-027; y a `apps/mobile/src/grupo/repositorio-memoria.ts`, una versión con una respuesta o una falla configurables (solo para tests; la equivalencia con el motor la prueba el servicio de la Edge Function).
- [X] T053 [US3] Implementar `apps/mobile/src/grupo/vista.ts` y actualizar `PedidoGrupo` y `RecomendacionGrupo` en `apps/mobile/src/data/contracts.ts` (sin `fecha` ni `nombre` del ejemplo; con `canal` y el `Comercio` resuelto con `categoriaId` no nulo). T043 pasa.
- [X] T054 [US3] `apps/mobile/src/app/comprar/recomendacion.tsx`: mostrar «¿Pagan entre varios?» solo si `r.comercio.categoriaId !== null` (FR-029, G-04) y pasar el canal elegido.
- [X] T055 [US3] `apps/mobile/src/app/grupo/armar.tsx`: sin grupo de ejemplo (sin `getGrupoDeEjemplo`); sin comercio o sin rubro, mensaje con «Volver al paso de compra»; hasta 12 integrantes (el pie lo dice); los sin cuenta con `posicion`; guarda el pedido en el slice `grupo`.
- [X] T056 [US3] `apps/mobile/src/app/grupo/resultado.tsx`: pide con el repositorio, arma la vista con `grupo/vista.ts`; filas por id y por posición; «pone» en lugar de «su parte»; el día evaluado; el texto de que el reintegro le llega a quien paga y la división no se cobra; los errores de FR-027 con su acción («Volver al paso de compra», «Volver a armar» que además recarga los contactos, «Reintentar»); sin pedido, «Volver al paso de compra» (US3-10). «Confirmar» sigue como hoy (#138).
- [X] T057 [US3] Borrar `apps/mobile/src/data/grupo-simulado.ts`, `datosDeContactos` y `grupoDeEjemplo` de `apps/mobile/src/data/fixtures.ts`, y `recomendarGrupo`, `getGrupoDeEjemplo` y `comercioPorId` (si queda sin uso) de `apps/mobile/src/data/api.ts`; ajustar sus tests. Verificar con `grep -rn "datosDeContactos\|grupo-simulado\|grupoDeEjemplo" apps/mobile/src` que no queda nada (FR-030, G-13).
- [X] T058 [US3] Correr `npm run test -w @vuelto/mobile`, `npm run typecheck` y `npm run lint`.

**Checkpoint**: el flujo completo corre sobre datos reales.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T059 [P] Enmendar `docs/decisions/008-contactos-vinculados-gasto-en-grupo.md` (actualización fechada: §3 compras reducidas solo en el servidor, escalones de $100, base sobre la promo aplicada y lo que se deduce repitiendo consultas; §4 schema propio, envoltorios y clave de servidor; §7 sin cuenta solo con nombre; §8 débito y redondeo resueltos) y `docs/decisions/010-motor-en-la-app-y-redux.md` (§2 slice `contactos` desde RPC; §3 invitaciones por RPC sin Edge Function).
- [X] T060 [P] Actualizar `docs/product/privacidad.md` según FR-032 (tabla de lo que se guarda, la clave `vuelto.store.v1` con los contactos por cuenta, sin cuenta no se guardan, compras reducidas solo en el servidor, lo que se deduce repitiendo consultas) y corregir la inconsistencia de G-11 (sin cuenta con nombre **y** medios).
- [X] T061 [P] Actualizar `docs/product/requisitos.md` (sacar RF-19/RF-20 de pendientes), `docs/product/pendientes.md` (tildar «Gasto en grupo: promoción de débito, redondeo de la división» con la decisión), `docs/architecture/01-data-models.md` (tablas en plural, G-14; quitar "todavía no tienen migración") y `docs/architecture/04-infrastructure.md` (la Edge Function y la clave de servidor, con los pasos de `quickstart.md`).
- [X] T062 [P] Enmendar `specs/006-app-mobile-pantallas/spec.md` US5-9 (sin grupo de ejemplo con fecha fija; remite a la spec 016), actualizar la tabla de workspaces y la fila Stack de `CLAUDE.md` si cambia lo que dicen de `supabase` (Edge Function `recomendar-grupo`) y marcar en `docs/product/revision-gasto-grupo.md` qué hallazgos cierra este PR.
- [ ] T063 Correr los chequeos del PR: `npm run lint`, `npm run typecheck`, `npm run test`, `deno check` de las dos funciones, `supabase test db` y `npm run test:integracion -w @vuelto/mobile`; después los agentes `test-runner` y `rules-guardian` y la skill `/code-review`, y corregir lo que encuentren.
- [ ] T064 Verificar en la app web (`mobile-web`) las pantallas que se pueden ver sin dos teléfonos (Contactos vacío, Pegar, Armar con y sin rubro, errores de resultado) y sacar capturas antes/después para el PR (criterio de #130). Lo que necesita dispositivo real (QR con la cámara) se dice en el PR como no verificado.
- [ ] T065 Registrar la sesión en `docs/bitacora-prompts.md` (prompt, decisiones del PO, hallazgos de `spec-critic`, qué se verificó y qué no) y abrir el PR con `Closes #54` y `Closes #130`.

---

## Dependencies & Execution Order

- **Setup (T001-T003)** → **Foundational (T004-T007)** → **US1 (T008-T016)**.
- **US2 (T017-T036)** puede arrancar después de Setup: no depende del motor de grupo. La parte de base (T017, T021, T022) va antes que la de app que usa la integración (T035).
- **US3 (T037-T058)** depende de US1 (motor) y de US2 (tablas, funciones, repositorio y slices de la app).
- **Polish (T059-T065)** al final; T059-T062 en paralelo entre sí.

Dentro de cada historia: tests → tipos → código → corrida de chequeos.

## Parallel Example: User Story 1

```text
T008 division.test.ts   ‖   T009 grupo.test.ts   ‖   T010 propiedad SC-001
T011 tipos              ‖   T012 GrupoInvalidoError
luego T013 → T014 → T015 → T016
```

## Parallel Example: User Story 3

```text
T038 filas.test ‖ T039 validacion.test ‖ T040 respuesta.test ‖ T041 servicio.test ‖ T042 handler.test ‖ T043 vista.test
T045 filas.ts ‖ T046 repositorios/errores/http
```

## Implementation Strategy

1. **MVP = US1**: el motor de grupo probado es entregable solo y es lo que un evaluador técnico abre primero (constitución §VI).
2. **US2**: los contactos reales, que ya sirven sin la recomendación (se vinculan y se quitan).
3. **US3**: la recomendación de punta a punta. Recién acá se borra la simulación.
4. Un commit por fase como mínimo, con el mensaje en español como el resto del repo.
